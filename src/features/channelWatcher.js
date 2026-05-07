/**
 * ================================================
 * 👁️ CHANNEL WATCHER v0.12.0
 * ================================================
 * Observateur passif de tous les salons configurés et de leurs threads actifs.
 *
 * Toutes les 3-4 min (via cron), Brainee parcourt les conversations
 * actives et décide de manière autonome si quelque chose l'intéresse
 * assez pour rejoindre — sans être mentionnée, sans raison explicite.
 * Comme quelqu'un qui passe dans le couloir et a quelque chose à dire.
 *
 * === DÉCISION D'INTÉRÊT ===
 * Score 0-1 calculé selon :
 *   - Vibe du jour (chattiness, responsiveness)
 *   - Énergie et besoin social (internalState)
 *   - Émotions actives (curiosité, enthousiasme boostent)
 *   - Lien avec les participants (bond stage 3+ = fort boost)
 *   - Hyperfocus actif sur le topic du salon
 *   - Activité de la conversation (messages récents)
 *   - Besoin social depuis desires.js (si disponible)
 *
 * === COOLDOWNS ===
 *   - Par salon/thread : 45 min minimum entre deux sauts
 *   - Global : 8 min minimum entre n'importe quel saut
 *   - Respecte MIN_GAP_ANY_POST global
 *   - Respecte le quota journalier
 *   - Respecte le cooldown de refus émotionnel
 * ================================================
 */

const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY, MIN_GAP_ANY_POST } = require('../config');
const { callClaude } = require('../ai/claude');
const { getCurrentSlot, getTemporalBlock } = require('../bot/scheduling');
const { getDailyVibe } = require('../bot/adaptiveSchedule');
const {
  getInternalState, getActiveEmotions,
  getEmotionalInjection, getTemperamentInjection,
} = require('../bot/emotions');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { ensureMemberBond } = require('../db/memberBonds');
const { getAttachmentStage } = require('./attachmentStages');
const { isInRefusalCooldown } = require('./emotionalRefusal');
const { getConvDailyCount, getConvMaxPerDay } = require('./convStats');
const { NO_TAG_CLAUSE } = require('./greetings');
const { BOT_PERSONA } = require('../bot/persona');
const { getChannelIntentBlock } = require('../bot/channelIntel');
const { getChannelDirectory } = require('../db/channelDir');
const { formatContext } = require('./context');
const { simulateTyping, sendHuman, resolveMentionsInText } = require('../bot/messaging');
const { HYPER_FOCUS_TOPICS } = require('../bot/hyperFocus');

// ─── COOLDOWNS INTERNES ───────────────────────────────────────────
const channelLastJump = new Map(); // channelId → lastJumpTs
const CHANNEL_MIN_GAP_MS = 45 * 60 * 1000;  // 45 min par salon/thread
let globalLastJump = 0;
const GLOBAL_MIN_GAP_MS = 8 * 60 * 1000;   // 8 min entre tous les sauts

// Catégories Discord à ignorer
const SKIP_CHANNEL_TYPES = [4, 5]; // GUILD_CATEGORY, GUILD_ANNOUNCEMENT

// ─── SCORE D'INTÉRÊT ─────────────────────────────────────────────

/**
 * Calcule l'intérêt de Brainee pour une conversation active (score 0-1).
 */
async function computeInterestScore(messages, channelName, parentName = '') {
  const state = getInternalState();
  const vibe = getDailyVibe();
  const activeEmotions = getActiveEmotions(30);
  const emotionNames = new Set(activeEmotions.map(e => e.name));

  let score = 0;

  // Vibe de base
  score += (vibe.chattiness ?? 0.5) * 0.18;
  score += (vibe.responsiveness ?? 0.5) * 0.12;

  // États internes
  if (state.energy > 50) score += 0.08;
  if (state.socialNeed > 65) score += 0.15;
  if (state.stimulation > 60) score += 0.08;
  if (state.energy < 25 || state.mentalLoad > 80) score -= 0.20; // Malus si épuisée

  // Émotions actives
  if (emotionNames.has('curiosity') || emotionNames.has('fascination')) score += 0.14;
  if (emotionNames.has('enthusiasm') || emotionNames.has('creative_rush')) score += 0.12;
  if (emotionNames.has('joy') || emotionNames.has('excitement')) score += 0.08;
  if (emotionNames.has('melancholy') || emotionNames.has('sadness')) score -= 0.10;
  if (emotionNames.has('annoyance') || emotionNames.has('anger')) score -= 0.12;

  // Besoin social depuis le module desires (si disponible)
  const socialNeedDesire = shared.desires?.desires?.basicNeeds?.social_contact?.current;
  if (socialNeedDesire !== undefined && socialNeedDesire > 65) {
    score += 0.12 * ((socialNeedDesire - 65) / 35);
  }

  // Hyperfocus actif sur ce canal
  const fullName = (channelName + ' ' + parentName).toLowerCase();
  for (const hfTopic of HYPER_FOCUS_TOPICS) {
    if (hfTopic.patterns.some(re => re.test(fullName))) {
      score += 0.22;
      break;
    }
  }

  // Analyse des messages récents
  const recentMsgs = messages.slice(0, 12);
  const combinedContent = recentMsgs.map(m => m.content || '').join(' ').toLowerCase();

  // Topics qui l'intéressent (hors hyperfocus)
  const INTEREST_KW = ['jrpg', 'rpg', 'persona', 'final fantasy', 'indie', 'jeu', 'gaming',
    'tdah', 'neuro', 'musique', 'ost', 'philosophie', 'débat', 'soulslike', 'metroidvania'];
  if (INTEREST_KW.some(kw => combinedContent.includes(kw))) score += 0.14;

  // Activité récente de la conversation
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  const recentCount = recentMsgs.filter(m => m.createdTimestamp > thirtyMinAgo).length;
  if (recentCount >= 3) score += 0.12;
  if (recentCount >= 6) score += 0.08;

  // Liens avec les participants (forte influence)
  const participants = [...new Set(recentMsgs.map(m => m.author?.id))].filter(Boolean);
  for (const uid of participants.slice(0, 4)) {
    try {
      const bond = await ensureMemberBond(uid, null);
      if (bond) {
        const stage = getAttachmentStage(bond);
        if (stage >= 4) score += 0.18;
        else if (stage >= 3) score += 0.12;
        else if (stage >= 2) score += 0.05;
      }
    } catch (_) {}
  }

  return Math.max(0, Math.min(1, score));
}

// ─── DÉCISION DE SAUT ────────────────────────────────────────────

/**
 * Retourne true si Brainee peut "sauter" dans ce salon/thread maintenant.
 */
async function shouldWatchJump(channel) {
  const vibe = getDailyVibe();
  const state = getInternalState();

  // Bloquants durs
  if (isInRefusalCooldown()) return false;
  if (Date.now() - globalLastJump < GLOBAL_MIN_GAP_MS) return false;
  if (Date.now() - (shared.lastAnyBotPostTime || 0) < MIN_GAP_ANY_POST) return false;
  if (getConvDailyCount() >= getConvMaxPerDay()) return false;

  // Cooldown par salon
  const lastJump = channelLastJump.get(channel.id) || 0;
  if (Date.now() - lastJump < CHANNEL_MIN_GAP_MS) return false;

  // Vibe bloquante (mais pas absolue — 10-15% de chance quand même)
  if (vibe.name === 'withdrawn' && Math.random() > 0.08) return false;
  if (vibe.name === 'melancholic' && Math.random() > 0.12) return false;
  if (vibe.name === 'introvert' && Math.random() > 0.15) return false;
  if (vibe.name === 'lazy' && Math.random() > 0.10) return false;

  // Énergie très basse
  if (state.energy < 18) return false;

  return true;
}

// ─── SAUT EFFECTIF ───────────────────────────────────────────────

/**
 * Compose et envoie un message spontané dans le salon/thread.
 */
async function performWatchJump(channel, messages, isThread = false) {
  try {
    const slot = getCurrentSlot();
    const mood = refreshDailyMood();
    const vibe = getDailyVibe();
    const emotionBlock = getEmotionalInjection();
    const temperamentBlock = getTemperamentInjection();

    const parentName = isThread ? (channel.parent?.name || channel.name) : channel.name;
    const dirEntry = await getChannelDirectory(isThread ? (channel.parentId || channel.id) : channel.id);
    const intentBlock = getChannelIntentBlock(parentName, parentName, dirEntry?.officialDescription || '');

    const context = formatContext({ values: () => messages }, null, 25);

    const threadNote = isThread
      ? `\nTu rejoins un fil de discussion intitulé "${channel.name}" dans #${parentName}. Adapte-toi au sujet du fil.`
      : '';

    const systemPrompt = [
      getTemporalBlock(),
      `Humeur : ${mood}. ${getMoodInjection(mood)}`,
      `Vibe du jour : ${vibe.name} — ${vibe.desc}.`,
      temperamentBlock,
      emotionBlock,
      intentBlock,
      `Tu observes la conversation dans ${isThread ? 'le fil' : 'le salon'} #${parentName} et quelque chose t'a donné envie de dire quelque chose spontanément.${threadNote}`,
      `C'est pas une réponse à quelqu'un en particulier — tu passes, tu vois la conv, et tu as envie de contribuer, commenter, réagir à quelque chose, ou juste exister dans cette conversation. Naturel, court, sans forcer.`,
      NO_TAG_CLAUSE,
    ].join('\n');

    const userPrompt = `Contexte de la conversation :\n${context}\n\nDis quelque chose de naturel et spontané. 1-2 phrases max. Sois toi-même.`;

    const { text: content } = await callClaude(systemPrompt, userPrompt, 110, BOT_PERSONA);
    if (!content || content.length < 5) return false;

    const contentResolved = resolveMentionsInText(content, channel.guild);
    await simulateTyping(channel, 700 + Math.random() * 1400);
    await channel.send(contentResolved);

    // Mise à jour des timestamps
    globalLastJump = Date.now();
    channelLastJump.set(channel.id, Date.now());
    shared.lastAnyBotPostTime = Date.now();

    const tag = isThread ? '🧵 Watch-jump fil' : '👁️ Watch-jump';
    pushLog('SYS', `${tag} → #${parentName}${isThread ? '/' + channel.name : ''} (vibe: ${vibe.name})`, 'success');
    broadcast('conversation', {
      channel: parentName,
      type: isThread ? 'thread-watch' : 'watch-jump',
      time: new Date().toLocaleTimeString('fr-FR'),
      mood,
    });
    return true;
  } catch (err) {
    if (!err.message?.includes('Missing Permissions') && !err.message?.includes('Unknown Channel')) {
      pushLog('ERR', `Watch-jump échoué #${channel.name}: ${err.message}`, 'error');
    }
    return false;
  }
}

// ─── POINT D'ENTRÉE PRINCIPAL ─────────────────────────────────────

/**
 * Boucle principale du channel watcher — appelée par le cron toutes les ~4 min.
 * Parcourt les salons configurés + leurs threads actifs.
 */
async function runChannelWatch() {
  if (!shared.discord?.isReady() || !ANTHROPIC_API_KEY) return;
  if (!shared.botConfig?.conversations?.enabled) return;

  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return; // Slot sommeil

  // Quota et refus rapides
  if (getConvDailyCount() >= getConvMaxPerDay()) return;
  if (isInRefusalCooldown()) return;

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();

    const enabledChannels = (shared.botConfig.conversations.channels || []).filter(c => c.enabled);
    if (!enabledChannels.length) return;

    const botId = shared.discord.user?.id;

    for (const cfg of enabledChannels) {
      const channel = guild.channels.cache.get(cfg.channelId);
      if (!channel || SKIP_CHANNEL_TYPES.includes(channel.type)) continue;

      // ── Canal principal ───────────────────────────────────────
      let channelMsgs = [];
      try {
        const fetched = await channel.messages.fetch({ limit: 25 });
        channelMsgs = [...fetched.values()]
          .filter(m => !m.author.bot)
          .sort((a, b) => b.createdTimestamp - a.createdTimestamp);
      } catch (_) { continue; }

      // Pas de messages récents ou canal inactif
      if (!channelMsgs.length) continue;
      const newestMsg = channelMsgs[0];
      const AGE_MAX = 90 * 60 * 1000; // Conversation pas trop vieille (90 min)
      if (Date.now() - newestMsg.createdTimestamp > AGE_MAX) continue;

      // Vérifier qu'on n'a pas déjà posté récemment dans ce salon
      const allMsgs = await channel.messages.fetch({ limit: 10 });
      const botRecentMsg = [...allMsgs.values()].find(m => m.author.id === botId);
      if (botRecentMsg && Date.now() - botRecentMsg.createdTimestamp < 30 * 60 * 1000) {
        // Quand même regarder les threads
      } else {
        if (await shouldWatchJump(channel)) {
          const score = await computeInterestScore(channelMsgs, channel.name, '');
          if (score >= 0.42) {
            const jumped = await performWatchJump(channel, channelMsgs, false);
            if (jumped) return; // Un seul saut par tick
          }
        }
      }

      // ── Threads actifs du salon ───────────────────────────────
      try {
        const activeThreads = await channel.threads.fetchActive();
        for (const [, thread] of activeThreads.threads) {
          let threadMsgs = [];
          try {
            const fetched = await thread.messages.fetch({ limit: 20 });
            threadMsgs = [...fetched.values()]
              .filter(m => !m.author.bot)
              .sort((a, b) => b.createdTimestamp - a.createdTimestamp);
          } catch (_) { continue; }

          if (!threadMsgs.length) continue;
          if (Date.now() - threadMsgs[0].createdTimestamp > AGE_MAX) continue;

          if (await shouldWatchJump(thread)) {
            const score = await computeInterestScore(threadMsgs, thread.name, channel.name);
            if (score >= 0.47) { // Seuil légèrement plus haut pour les threads
              const jumped = await performWatchJump(thread, threadMsgs, true);
              if (jumped) return;
            }
          }
        }
      } catch (_) {}
    }
  } catch (err) {
    pushLog('ERR', `runChannelWatch: ${err.message}`, 'error');
  }
}

module.exports = { runChannelWatch };
