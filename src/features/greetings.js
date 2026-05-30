const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { refreshDailyMood } = require('../bot/mood');
const { getParisDay, getParisHour } = require('../bot/scheduling');
const { getDailyVibe } = require('../bot/adaptiveSchedule');
const { simulateTyping, resolveMentionsInText } = require('../bot/messaging');
const { updateConvStats, getQuietestChannel } = require('./convStats');
const { sanitizeForJson } = require('../utils');
const { formatContext } = require('./context');
const { getBudgetMode } = require('../ai/budget');
const {
  getMorningSeed, getGoodnightSeed, getNightWakeupSeed, getLunchBackSeed,
} = require('./greetingVariants');
const { getCurrentGameName } = require('../bot/currentGame');

// Instructions injectées quand on ne veut pas de tag
const NO_TAG_CLAUSE = `IMPORTANT : Ne tagge personne dans ce message — pas de @pseudo. Reste ambiant, personne n'a besoin d'être notifié.`;
const LIGHT_TAG_CLAUSE = `IMPORTANT : Évite les tags sauf vraiment nécessaire. Ne tagge personne si pas strictement indispensable.`;

// Clause de précision gaming — injectée dans les prompts où des faits sur des jeux peuvent sortir.
// Empêche les hallucinations sur les dates de sortie et les prix.
const GAMING_FACTS_CLAUSE = `\n[FAITS GAMING] Pour les dates de sortie, prix ou scores : n'affirme JAMAIS une date précise sans être certaine — dis "je crois que c'était...", "si je me souviens bien..." ou omets la date. Attention aux références temporelles relatives ("l'été dernier", "l'année dernière") : calcule-les par rapport à la date actuelle. Si tu n'es pas sûre d'un fait → utilise tes outils de recherche, ou exprime le doute clairement.`;

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAY_CONTEXTS = {
  0: 'dimanche — pas de contrainte, journée à soi',
  6: 'samedi — liberté totale, pas de boulot',
  1: 'lundi — début de semaine, on se lance',
  2: 'mardi',
  3: 'mercredi — milieu de semaine',
  4: 'jeudi',
  5: 'vendredi — fin de semaine, vivement ce soir',
};

async function postMorningGreeting() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const _bm = getBudgetMode(); if (_bm !== 'normal') { pushLog('SYS', `💰 Morning skip — budget ${_bm}`); return; }
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get('1481028189680570421');
    if (!channel) return;
    const day = getParisDay();
    const mood = refreshDailyMood();
    const vibe = getDailyVibe();
    const dayCtx = DAY_CONTEXTS[day] || DAY_NAMES[day];

    const hourNow = getParisHour();
    const morningSeed = getMorningSeed(hourNow);
    const { text: content } = await callClaude(
      `\nHumeur : ${mood}. Vibe du jour : ${vibe.name} (${vibe.desc}). Heure actuelle : ${hourNow.toFixed(1)}h. C'est ${dayCtx}.\nAngle pour ce matin : ${morningSeed}.\n${NO_TAG_CLAUSE}`,
      `Message du matin, naturel, COURT (1-2 phrases max, ~30 mots). Varie l'accroche ("yo", "salut", "hey", "ça commence", ou direct sans formule). Pas de café automatique. Jamais de @. Pas d'emoji. INTERDIT : ne commence JAMAIS par "[jour] matin", "pour un [jour]", "le [jour] matin" ou toute variante.`,
      80,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 800 + Math.random() * 1200);
    await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    shared.goodnightSent = false;
    await updateConvStats('1481028189680570421');
    pushLog('SYS', `☕ Morning greeting posté (vibe ${vibe.name})`, 'success');
  } catch (err) { pushLog('ERR', `Morning échoué : ${err.message}`, 'error'); }
}

async function postLunchBack() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const _bm = getBudgetMode(); if (_bm !== 'normal') { pushLog('SYS', `💰 Lunch skip — budget ${_bm}`); return; }
  const ch = getQuietestChannel();
  if (!ch) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel) return;
    const vibe = getDailyVibe();
    const lunchSeed = getLunchBackSeed();
    const { text: content } = await callClaude(
      `\nTu reviens de ta pause. Vibe : ${vibe.name}.\nAngle : ${lunchSeed}.\n${NO_TAG_CLAUSE}`,
      `Retour de pause dans ${sanitizeForJson(ch.topic)}. UNE phrase courte, max deux. Décontracté. Pas de @. Pas d'emoji.`,
      60,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 600);
    await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats(ch.channelId);
    pushLog('SYS', `🍕 Lunch back posté`);
  } catch (err) { pushLog('ERR', `Lunch back échoué : ${err.message}`, 'error'); }
}

async function postGoodnight() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const _bm = getBudgetMode(); if (_bm !== 'normal') { pushLog('SYS', `💰 Goodnight skip — budget ${_bm}`); return; }
  const ids = ['1481028189680570421', '1481028244500385946', '1481028247415296231'];
  const targetId = ids[Math.floor(Math.random() * ids.length)];
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(targetId);
    if (!channel) return;
    const vibe = getDailyVibe();
    const goodnightSeed = getGoodnightSeed();
    const currentGame = getCurrentGameName();
    const { text: content } = await callClaude(
      `\nFin de soirée. Vibe : ${vibe.name}.\nAngle pour ce soir : ${goodnightSeed}.\nSI (et seulement si) cet angle parle de jeu vidéo, le jeu en cours est ${currentGame} — n'en cite aucun autre, surtout pas Elden Ring par défaut. Mais la plupart des soirs ne tournent PAS autour du gaming : suis l'angle donné.\n${NO_TAG_CLAUSE}`,
      `Message fin de soirée naturel, COURT (1-2 phrases max, ~30 mots). Jamais "bonsoir" / "bonne nuit" tels quels. Pas de @. Pas d'emoji.`,
      70,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 600);
    await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    shared.goodnightSent = true;
    pushLog('SYS', `🌙 Goodnight posté`);
  } catch (err) { pushLog('ERR', `Goodnight échoué : ${err.message}`, 'error'); }
}

async function postNightWakeup() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const _bm = getBudgetMode(); if (_bm !== 'normal') { pushLog('SYS', `💰 Wakeup skip — budget ${_bm}`); return; }
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get('1481028189680570421');
    if (!channel) return;
    const wakeHour = getParisHour();
    const wakeSeed = getNightWakeupSeed(wakeHour);
    const { text: content } = await callClaude(
      `\nRéveil nocturne, mode zombie. Il est ${wakeHour.toFixed(1)}h.\nAngle : ${wakeSeed}.\n${NO_TAG_CLAUSE}`,
      `UNE seule phrase courte, ~15-25 mots, vraie ambiance d'insomnie. Style "y'en a parmi vous qui dorment pas ? j'arrive pas à me rendormir". Pas de @. Pas d'emoji.`,
      60,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 500 + Math.random() * 1000);
    await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    pushLog('SYS', `👁️ Night wakeup posté`);
  } catch (err) { pushLog('ERR', `Night wakeup échoué : ${err.message}`, 'error'); }
}

// Relance d'une mention reçue hier et non traitée — tag la personne
async function postRelanceMention({ userId, username, channelId, messageId, query }) {
  if (!ANTHROPIC_API_KEY) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    const vibe = getDailyVibe();
    const tagInstruction = `Tu commences par taguer <@${userId}> pour qu'il/elle voit la relance.`;

    let recentCtx = '';
    try {
      const msgs = await channel.messages.fetch({ limit: 15 });
      const ctx = formatContext(msgs, null, 15);
      if (ctx.length > 20) recentCtx = `\n\nContexte récent du salon :\n${ctx}`;
    } catch (_) {}

    // Bug 2 : calcul du délai réel depuis le message d'origine via Discord snowflake
    let _elapsedLabel = 'hier';
    try {
      const _msgTs = Number(BigInt(messageId) >> 22n) + 1420070400000;
      const _msAgo = Date.now() - _msgTs;
      const _hAgo = _msAgo / 3600000;
      _elapsedLabel = _hAgo < 2 ? `y'a ${Math.round(_msAgo / 60000)} min`
                    : _hAgo < 6 ? `y'a ${Math.round(_hAgo)}h`
                    : _hAgo < 20 ? `ce matin ou cet après-midi`
                    : _hAgo < 36 ? `hier`
                    : `y'a ${Math.ceil(_hAgo / 24)} jours`;
    } catch (_) {}

    const { text: content } = await callClaude(
      `\nVibe : ${vibe.name}. Tu avais zappé un message (${_elapsedLabel}) d'une personne qui voulait ton avis.\n${tagInstruction}${recentCtx}`,
      `${username} t'avait écrit ${_elapsedLabel} : "${query}"\nTu relances maintenant. Formule toi-même une courte excuse naturelle — adapte-la à quand c'était (si c'était y'a 2h ne dis pas "hier", si c'était hier sois précise). Puis réponds/réagis à son message en tenant compte de ce qui s'est dit depuis. Max 3 phrases.`,
      220,
      BOT_PERSONA
    );
    let finalContent = content;
    // Garantir le mention tag du user pour la relance
    if (!finalContent.includes(`<@${userId}>`)) {
      finalContent = `<@${userId}> ${finalContent}`;
    }
    const resolved = resolveMentionsInText(finalContent, guild);
    await simulateTyping(channel, 1000);
    await channel.send(resolved);
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats(channelId);
    pushLog('SYS', `↩️ Relance envoyée à ${username} (hier : "${query.slice(0, 40)}...")`, 'success');
  } catch (err) { pushLog('ERR', `Relance échouée : ${err.message}`, 'error'); }
}

module.exports = { postMorningGreeting, postLunchBack, postGoodnight, postNightWakeup, postRelanceMention, NO_TAG_CLAUSE, LIGHT_TAG_CLAUSE, GAMING_FACTS_CLAUSE };
