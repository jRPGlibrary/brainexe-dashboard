const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getParisDay } = require('../bot/scheduling');
const { simulateTyping, resolveMentionsInText } = require('../bot/messaging');
const { updateConvStats, getQuietestChannel } = require('./convStats');

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
    const dayCtx = day === 0 ? 'dimanche, journée chill' : day === 6 ? 'samedi, pas de boulot' : 'jour de semaine';
    const content = await callClaude(
      BOT_PERSONA + `\nHumeur : ${mood}. Tu viens de te lever.`,
      `C'est ${dayCtx}. Check morning — qui est là, qui bosse, qui geek. Somnolent. Max 2 phrases.`,
      120
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 800);
    await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats('1481028189680570421');
    pushLog('SYS', `☕ Morning greeting posté`, 'success');
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
    const content = await callClaude(
      BOT_PERSONA + '\nTu reviens de ta pause.',
      `Retour de pause dans ${ch.topic}. 1-2 phrases. Décontracté.`,
      100
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
    const content = await callClaude(
      BOT_PERSONA + '\nFin de soirée gaming.',
      `Message fin de soirée naturel. Style "je finis cette quête et je dors... normalement". 1-2 phrases. Jamais "bonsoir".`,
      100
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
      BOT_PERSONA + '\nRéveil nocturne, mode zombie.',
      `Message ultra court — "j'arrive pas à dormir et je pense encore à [jeu/boss]". 1 phrase MAX.`,
      80
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    pushLog('SYS', `👁️ Night wakeup posté`);
  } catch (err) { pushLog('ERR', `Night wakeup échoué : ${err.message}`, 'error'); }
}

module.exports = { postMorningGreeting, postLunchBack, postGoodnight, postNightWakeup };
