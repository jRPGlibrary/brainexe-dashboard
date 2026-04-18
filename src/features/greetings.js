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

// Instructions injectées quand on ne veut pas de tag
const NO_TAG_CLAUSE = `IMPORTANT : Ne tagge personne dans ce message — pas de @pseudo. Reste ambiant, personne n'a besoin d'être notifié.`;
const LIGHT_TAG_CLAUSE = `IMPORTANT : Évite les tags sauf vraiment nécessaire. Ne tagge personne si pas strictement indispensable.`;

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
    const dayCtx = day === 0 ? 'dimanche, journée chill' : day === 6 ? 'samedi, pas de boulot' : 'jour de semaine';
    const content = await callClaude(
      `\nHumeur : ${mood}. Vibe du jour : ${vibe.name} (${vibe.desc}). Tu viens de te lever.\n${NO_TAG_CLAUSE}`,
      `C'est ${dayCtx}. Check morning — qui est là, qui bosse, qui geek. Somnolent. Max 2 phrases. Pas de @ à quelqu'un.`,
      120,
      BOT_PERSONA
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 800);
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
    const content = await callClaude(
      `\nTu reviens de ta pause. Vibe : ${vibe.name}.\n${NO_TAG_CLAUSE}`,
      `Retour de pause dans ${ch.topic}. 1-2 phrases. Décontracté. Pas de @ à quelqu'un.`,
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
    const content = await callClaude(
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
    const content = await callClaude(
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
    const tagAllowed = true; // relance explicite = tag autorisé (rôle propre)
    const tagInstruction = tagAllowed
      ? `Tu commences par taguer <@${userId}> pour qu'il/elle voit la relance.`
      : LIGHT_TAG_CLAUSE;

    const content = await callClaude(
      `\nVibe : ${vibe.name}. Tu avais zappé un message hier d'une personne qui voulait ton avis.\n${tagInstruction}`,
      `Hier ${username} t'avait écrit : "${query}"\nTu relances maintenant, avec une mini-excuse naturelle ("désolée j'ai zappé hier", "j'ai mis du temps mais..."). Puis tu réponds/réagis à son message. Max 3 phrases.`,
      200,
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
