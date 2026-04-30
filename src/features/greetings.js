const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getParisDay } = require('../bot/scheduling');
const { getDailyVibe, shouldTagPerson } = require('../bot/adaptiveSchedule');
const { simulateTyping, resolveMentionsInText } = require('../bot/messaging');
const { updateConvStats, getQuietestChannel } = require('./convStats');
const { sanitizeForJson } = require('../utils');
const { formatContext } = require('./context');

// Instructions injectées quand on ne veut pas de tag
const NO_TAG_CLAUSE = `IMPORTANT : Ne tagge personne dans ce message — pas de @pseudo. Reste ambiant, personne n'a besoin d'être notifié.`;
const LIGHT_TAG_CLAUSE = `IMPORTANT : Évite les tags sauf vraiment nécessaire. Ne tagge personne si pas strictement indispensable.`;

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
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get('1481028189680570421');
    if (!channel) return;
    const day = getParisDay();
    const mood = refreshDailyMood();
    const vibe = getDailyVibe();
    const dayCtx = DAY_CONTEXTS[day] || DAY_NAMES[day];

    // Charge les 30 derniers messages pour contexte
    let recentCtx = '';
    try {
      const msgs = await channel.messages.fetch({ limit: 30 });
      const ctx = formatContext(msgs, null, 30);
      if (ctx.length > 30) recentCtx = `\nDerniers échanges (pour capter l'ambiance) :\n${ctx}`;
    } catch (_) {}

    const { text: content } = await callClaude(
      `\nHumeur : ${mood}. Vibe du jour : ${vibe.name} (${vibe.desc}). Tu viens de te lever, c'est ${dayCtx}.${recentCtx}\n${NO_TAG_CLAUSE}`,
      `Message de bonjour matinal naturel et varié. Ne parle pas forcément de café. Demande ce que les gens ont de prévu aujourd'hui ou cette journée. Reste dans l'élan de la conversation récente si c'est pertinent. 2 phrases max. Jamais de @ à quelqu'un. Varie la façon de dire bonjour (pas toujours "bonjour", parfois "yo", "salut", "hey", "ça commence" ...).`,
      140,
      BOT_PERSONA
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 800 + Math.random() * 1200);
    await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats('1481028189680570421');
    pushLog('SYS', `☕ Morning greeting posté (vibe ${vibe.name})`, 'success');
  } catch (err) { pushLog('ERR', `Morning échoué : ${err.message}`, 'error'); }
}

async function postLunchBack() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const ch = getQuietestChannel();
  if (!ch) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel) return;
    const vibe = getDailyVibe();
    const { text: content } = await callClaude(
      `\nTu reviens de ta pause. Vibe : ${vibe.name}.\n${NO_TAG_CLAUSE}`,
      `Retour de pause dans ${sanitizeForJson(ch.topic)}. 1-2 phrases. Décontracté. Pas de @ à quelqu'un.`,
      100,
      BOT_PERSONA
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
  const ids = ['1481028189680570421', '1481028244500385946', '1481028247415296231'];
  const targetId = ids[Math.floor(Math.random() * ids.length)];
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(targetId);
    if (!channel) return;
    const vibe = getDailyVibe();
    const { text: content } = await callClaude(
      `\nFin de soirée gaming. Vibe : ${vibe.name}.\n${NO_TAG_CLAUSE}`,
      `Message fin de soirée naturel. Style "je finis cette quête et je dors... normalement". 1-2 phrases. Jamais "bonsoir". Pas de @ à quelqu'un.`,
      100,
      BOT_PERSONA
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 600);
    await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    pushLog('SYS', `🌙 Goodnight posté`);
  } catch (err) { pushLog('ERR', `Goodnight échoué : ${err.message}`, 'error'); }
}

async function postNightWakeup() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get('1481028189680570421');
    if (!channel) return;
    const { text: content } = await callClaude(
      `\nRéveil nocturne, mode zombie.\n${NO_TAG_CLAUSE}`,
      `Message ultra court — "j'arrive pas à dormir et je pense encore à [jeu/boss]". 1 phrase MAX. Pas de @ à quelqu'un.`,
      80,
      BOT_PERSONA
    );
    const contentResolved = resolveMentionsInText(content, guild);
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

    // Charge les 30 derniers messages pour ne pas perdre le fil de la conversation
    let recentCtx = '';
    try {
      const msgs = await channel.messages.fetch({ limit: 30 });
      const ctx = formatContext(msgs, null, 30);
      if (ctx.length > 20) recentCtx = `\n\nContexte récent du salon (30 derniers messages) :\n${ctx}`;
    } catch (_) {}

    const { text: content } = await callClaude(
      `\nVibe : ${vibe.name}. Tu avais zappé un message hier d'une personne qui voulait ton avis.\n${tagInstruction}${recentCtx}`,
      `Hier ${username} t'avait écrit : "${query}"\nTu relances maintenant, avec une mini-excuse naturelle ("désolée j'ai zappé hier", "j'ai mis du temps mais..."). Puis tu réponds/réagis à son message en tenant compte de ce qui s'est dit depuis. Max 3 phrases.`,
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

module.exports = { postMorningGreeting, postLunchBack, postGoodnight, postNightWakeup, postRelanceMention, NO_TAG_CLAUSE, LIGHT_TAG_CLAUSE };
