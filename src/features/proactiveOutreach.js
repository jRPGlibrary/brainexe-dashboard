/**
 * ================================================
 * ⚡ PROACTIVE OUTREACH v0.9.15
 * ================================================
 * Brainee n'attend plus toujours qu'on lui parle. Elle peut :
 *   - random_thought   : balancer une pensée qui la traverse
 *   - group_observation: observer la dynamique du groupe et la nommer
 *   - vip_callback     : reprendre une story d'un VIP/inner_circle absent
 *   - challenge        : lancer un mini-défi improvisé au salon
 *   - dm_outreach      : initier un DM spontané avec un VIP (v0.8.6)
 *
 * Garde-fous :
 *   - Respecte vibe (skip si introvert/withdrawn) et state (pas si overloaded)
 *   - Respecte le quota conversations/jour
 *   - Respecte MIN_GAP_ANY_POST (pas trop rapproché des autres posts)
 *   - Cooldown global de 90min entre deux outreach
 *   - Pas de doublon : ne refait pas le même type 2x à la suite
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY, MIN_GAP_ANY_POST } = require('../config');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA_CONVERSATION } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getCurrentSlot } = require('../bot/scheduling');
const { getDailyVibe } = require('../bot/adaptiveSchedule');
const { getInternalState, getEmotionalInjection, adjustMaxTokens } = require('../bot/emotions');
const { sendHuman } = require('../bot/messaging');
const { getConvDailyCount, getConvMaxPerDay, updateConvStats } = require('./convStats');
const { detectMissedVips } = require('../db/vipSystem');
const { getMemberStories, touchStory } = require('../db/memberStories');
const { fireProactiveDmToVip } = require('./dmOutreach');

const COOLDOWN_MS = 90 * 60 * 1000;
let lastOutreachAt = 0;
let lastOutreachType = null;

// ─── ÉLIGIBILITÉ ─────────────────────────────────────────────────
function isEligibleNow() {
  const cfg = shared.botConfig?.conversations;
  if (!cfg?.enabled) return { ok: false, reason: 'conversations désactivées' };

  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return { ok: false, reason: `slot ${slot.label} sans conv` };

  const vibe = getDailyVibe();
  if (['introvert', 'withdrawn', 'lazy', 'grumpy'].includes(vibe.name)) {
    return { ok: false, reason: `vibe ${vibe.name}` };
  }

  const state = getInternalState();
  if (state.mentalLoad > 75) return { ok: false, reason: 'mentalLoad trop haute' };
  if (state.energy < 30) return { ok: false, reason: 'énergie trop basse' };

  if (Date.now() - lastOutreachAt < COOLDOWN_MS) {
    return { ok: false, reason: 'cooldown actif' };
  }

  if (Date.now() - (shared.lastAnyBotPostTime || 0) < (MIN_GAP_ANY_POST || 15 * 60 * 1000)) {
    return { ok: false, reason: 'autre post trop récent' };
  }

  if (getConvDailyCount() >= getConvMaxPerDay()) {
    return { ok: false, reason: 'quota journalier atteint' };
  }

  return { ok: true };
}

// ─── ACTIVITÉ SALON ──────────────────────────────────────────────
async function hasChannelActivity(channelId, minMessages = 3, minHourWindow = 1) {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return false;

    const msgs = await channel.messages.fetch({ limit: 50 });
    const now = Date.now();
    const windowMs = minHourWindow * 60 * 60 * 1000;
    const botId = shared.discord.user?.id;

    // Compter les messages humains (pas du bot) dans la fenêtre
    const humanMsgs = msgs.filter(m =>
      !m.author.bot &&
      (now - m.createdTimestamp) < windowMs
    ).size;

    return humanMsgs >= minMessages;
  } catch (err) {
    return false;
  }
}

// ─── CHOIX DU TYPE ───────────────────────────────────────────────
function pickType() {
  // dm_outreach : type spécial géré séparément dans fireOutreach (v0.8.6)
  const types = ['random_thought', 'group_observation', 'vip_callback', 'challenge', 'dm_outreach'];
  const filtered = types.filter(t => t !== lastOutreachType);
  // Pondération : random_thought plus fréquent, dm_outreach très rare
  const weights = {
    random_thought: 0.42,
    group_observation: 0.20,
    vip_callback: 0.22,
    challenge: 0.10,
    dm_outreach: 0.06,
  };
  const total = filtered.reduce((acc, t) => acc + (weights[t] || 0.1), 0);
  let r = Math.random() * total;
  for (const t of filtered) {
    r -= (weights[t] || 0.1);
    if (r <= 0) return t;
  }
  return filtered[0];
}

// ─── SÉLECTION DE SALON ──────────────────────────────────────────
function pickChannelForType(type) {
  const cfg = shared.botConfig?.conversations;
  if (!cfg?.channels?.length) return null;
  const active = cfg.channels.filter(c => c.enabled);
  if (!active.length) return null;

  if (type === 'challenge') {
    // Préfère salons "fun" / "memes-et-chaos" / "off-topic"
    const fun = active.filter(c =>
      /general|memes|off-topic|chaos|cerveau|partage/i.test(c.channelName)
    );
    if (fun.length) return fun[Math.floor(Math.random() * fun.length)];
  }

  if (type === 'group_observation') {
    // Préfère salons généralistes
    const general = active.filter(c => /general|chaos|off-topic/i.test(c.channelName));
    if (general.length) return general[Math.floor(Math.random() * general.length)];
  }

  return active[Math.floor(Math.random() * active.length)];
}

// ─── BUILDERS DE PROMPT ─────────────────────────────────────────
function buildPromptForType(type, ctx) {
  const { mood, vibe, channelName, channelTopic, emotionBlock, vipCallback } = ctx;
  const baseHeader = `Humeur du jour : ${mood}. ${getMoodInjection(mood)}\nVibe : ${vibe.name} — ${vibe.desc}.\n${emotionBlock}`;

  const typeInstructions = {
    random_thought: `Écris UNE seule pensée qui te traverse, comme si t'y avais repensé toute seule, à voix haute. Pas une question lancée au groupe — juste un truc qui te passe par la tête sur le thème du salon (${channelTopic}). Ça peut être un détail bizarre, une connexion entre deux trucs, un souvenir, un avis tranché. Naturel, pas forcé. Max 2 phrases.`,

    group_observation: `Tu remarques quelque chose sur la dynamique du serveur en ce moment (énergie, sujet récurrent, ambiance). Tu le nommes avec bienveillance, comme un constat — pas une analyse. Pas de "j'ai remarqué" ou "je trouve que" formel. Plutôt : "y'a un truc en ce moment c'est…", "ça part bien là vous deux", "c'est beau quand on parle de X ici", etc. Max 2 phrases.`,

    challenge: `Lance un mini-défi improvisé au salon, fun, low-stakes, qui demande 1 message de réponse max. Exemples : "défi : décrivez votre dernier jeu en 3 mots", "qui aurait votre OST gaming si on faisait un mariage 👀", "votre 2010 était plus PS3 ou DS ?". Original, pas générique. Une seule phrase.`,

    vip_callback: `${vipCallback}\nReprends ce fil de façon TRÈS naturelle, comme si t'y repensais à l'instant. Pas un état des lieux. Juste un "hey au fait…" ou "j'ai repensé à ce que tu disais sur…". Max 2 phrases. Tu peux les tagger naturellement avec @username.`,
  };

  const directive = typeInstructions[type] || typeInstructions.random_thought;
  return `${baseHeader}\n\nSalon : #${channelName} — ${channelTopic}\n\nMISSION : ${directive}`;
}

// ─── OUTREACH ───────────────────────────────────────────────────
async function fireOutreach(forcedType = null) {
  const eligible = isEligibleNow();
  if (!eligible.ok) {
    pushLog('SYS', `🤐 Outreach skip : ${eligible.reason}`);
    return false;
  }
  if (!ANTHROPIC_API_KEY) return false;

  const type = forcedType || pickType();

  // 💬 DM outreach proactif (v0.8.6) : traité en dehors du flow salon
  if (type === 'dm_outreach') {
    const missed = await detectMissedVips({ minDaysAbsent: 3, maxResults: 8 });
    if (!missed.length) {
      pushLog('SYS', '🤐 Outreach dm_outreach skip : aucun VIP éligible');
      return false;
    }
    const target = missed[Math.floor(Math.random() * missed.length)];
    const stories = await getMemberStories(target.userId);
    const usable = stories.find(s => ['quest', 'project', 'concern'].includes(s.type)) || stories[0];
    const storyHint = usable
      ? `${target.username} ${({ quest: 'cherchait', project: 'travaillait sur', concern: 'disait' }[usable.type] || 'évoquait')} : "${usable.content}"`
      : null;

    const ok = await fireProactiveDmToVip(target.userId, target.username, storyHint);
    if (ok) {
      lastOutreachAt = Date.now();
      lastOutreachType = type;
      if (usable) await touchStory(target.userId, usable.id).catch(() => {});
      pushLog('SYS', `⚡ Outreach (dm_outreach) → ${target.username}`, 'success');
    }
    return ok;
  }

  let channelCfg = pickChannelForType(type);
  if (!channelCfg) return false;

  // Vérifier que le salon a eu au moins 3 messages humains dans la dernière heure
  const hasActivity = await hasChannelActivity(channelCfg.channelId, 3, 1);
  if (!hasActivity) {
    pushLog('SYS', `🤐 Outreach skip : activité insuffisante dans #${channelCfg.channelName}`);
    return false;
  }

  const mood = refreshDailyMood();
  const vibe = getDailyVibe();
  const emotionBlock = getEmotionalInjection();

  // Construction du contexte spécifique au type
  let vipCallback = '';
  let targetUserId = null;
  let touchedStoryId = null;

  if (type === 'vip_callback') {
    const missed = await detectMissedVips({ minDaysAbsent: 5, maxResults: 8 });
    if (!missed.length) {
      pushLog('SYS', '🤐 Outreach vip_callback skip : aucun VIP absent');
      return false;
    }
    const target = missed[Math.floor(Math.random() * missed.length)];
    targetUserId = target.userId;

    // Charge une story du VIP pour l'utiliser comme accroche
    const stories = await getMemberStories(target.userId);
    const usable = stories.find(s => ['quest', 'project', 'concern'].includes(s.type)) || stories[0];

    if (!usable) {
      // Pas de story : simple "j'ai pensé à toi"
      vipCallback = `Tu repenses à @${target.username}, qui n'est pas passé depuis ${target.daysAbsent} jours. Pas de fil narratif ouvert avec — juste un "tiens au fait, t'es passé où ?" léger, sans pression.`;
    } else {
      touchedStoryId = usable.id;
      const fragment = {
        quest: `qui cherchait : "${usable.content}"`,
        project: `qui était sur : "${usable.content}"`,
        concern: `qui disait : "${usable.content}"`,
        joke: `et le délire : "${usable.content}"`,
        fact: `et le fait que ${usable.content}`,
      }[usable.type] || usable.content;
      vipCallback = `Tu repenses à @${target.username} ${fragment} (absent depuis ${target.daysAbsent} jours). Reprends ce fil naturellement — pas de récap, juste un rappel fluide. Tu peux mentionner @${target.username} dans le message.`;
    }
  }

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(channelCfg.channelId);
    if (!channel) return false;

    const prompt = buildPromptForType(type, {
      mood, vibe,
      channelName: channelCfg.channelName,
      channelTopic: channelCfg.topic,
      emotionBlock,
      vipCallback,
    });

    const { text: reply } = await callClaude(prompt, 'Génère le message demandé.', adjustMaxTokens(120), BOT_PERSONA_CONVERSATION);
    if (!reply || reply.length < 5) return false;

    await sendHuman(channel, reply, null, {});

    lastOutreachAt = Date.now();
    lastOutreachType = type;
    shared.lastAnyBotPostTime = Date.now();
    updateConvStats(channelCfg.channelId);

    if (touchedStoryId && targetUserId) {
      await touchStory(targetUserId, touchedStoryId);
    }

    pushLog('SYS', `⚡ Outreach (${type}) → #${channelCfg.channelName}`, 'success');
    return true;
  } catch (err) {
    pushLog('ERR', `proactiveOutreach: ${err.message}`, 'error');
    return false;
  }
}

// ─── HOOK CRON ──────────────────────────────────────────────────
// Probabilité par tick. Le cron appelle ce hook ; on tire pour décider.
function rollOutreach() {
  const vibe = getDailyVibe();
  const state = getInternalState();
  let proba = 0.03;
  if (vibe.chattiness >= 0.7) proba += 0.03;
  if (state.socialNeed > 70) proba += 0.02;
  if (state.stimulation > 70) proba += 0.01;
  if (state.energy > 70) proba += 0.01;
  proba = Math.min(0.08, proba);
  return Math.random() < proba;
}

module.exports = {
  isEligibleNow,
  pickType,
  fireOutreach,
  rollOutreach,
};
