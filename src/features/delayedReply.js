const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const { callClaude } = require('../ai/claude');
const { getMemberProfile, updateMemberProfile, getToneInstruction } = require('../db/members');
const { getChannelMemory, formatChannelMemoryBlock } = require('../db/channelMem');
const { getChannelDirectory } = require('../db/channelDir');
const { BOT_PERSONA_CONVERSATION } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getCurrentSlot } = require('../bot/scheduling');
const { getChannelIntentBlock } = require('../bot/channelIntel');
const { simulateTyping, resolveMentionsInText } = require('../bot/messaging');
const { formatContext } = require('./context');
const { updateConvStats } = require('./convStats');

function getEmojiExcuse(slot, mood) {
  const bySlot = {
    wakeup:      ["ah pardon je répondais depuis le lit encore à moitié endormie 😅", "j'étais en mode zombie total, j'ai juste réagi sans réfléchir lol"],
    active:      ["sorry j'étais sur un truc, je reviens maintenant 👀", "j'avais la tête ailleurs, je lisais un thread sur un jeu — bref", "j'ai réagi et j'ai disparu dans mon hyperfocus, classique"],
    lunch:       ["j'avais la bouche pleine sérieusement 😂 là je peux répondre proprement", "j'étais en train de manger, j'ai juste réagi pour dire que j'avais vu", "pause repas, je pouvais pas taper — là c'est bon"],
    productive:  ["j'avais un truc en cours, j'ai juste réagi pour noter que t'avais écrit", "je venais de lancer un jeu, j'ai répondu à l'arrache 😅", "j'étais sur les actus du moment et j'ai pas pu répondre direct"],
    transition:  ["je rangeais mes affaires, j'ai réagi mais j'avais pas le temps de répondre", "j'étais en train de me préparer pour la soirée gaming — là je suis dispo"],
    gaming:      ["j'étais sur un boss, IMPOSSIBLE de répondre à ce moment précis 😭", "j'étais en pleine session, j'ai réagi pour dire que j'avais vu mais je pouvais pas lâcher le jeu", "j'étais sur un moment chaud dans ma partie, je pouvais pas taper — là c'est bon", "je regardais un trailer qui venait de tomber, j'ai pas pu m'arrêter 👀", "j'étais sur Reddit gaming, t'sais quand tu tombes dans un thread sans fin"],
    latenight:   ["j'étais encore sur mon jeu à une heure de merde, là je décroche 5 min", "hyperfocus gaming tardif, je répondais plus à rien — désolée 😅"],
  };
  const byMood = {
    hyperfocus:  ["j'étais en plein hyperfocus, j'entends plus rien quand ça prend 😂"],
    zombie:      ["j'étais dans le brouillard total là, pardon"],
    chill:       ["j'étais posée, j'ai réagi et j'ai oublié de répondre correctement lol"],
  };
  const all = [...(bySlot[slot?.status] || bySlot.active), ...(byMood[mood] || [])];
  return all.length ? all[Math.floor(Math.random() * all.length)] : "désolée j'avais la tête ailleurs 😅";
}

async function scheduleDelayedReplyAfterEmoji(message, userQuery, emojiUsed, slot, mood) {
  const delayMs = Math.floor((15 + Math.random() * 30) * 60 * 1000);
  pushLog('SYS', `⏳ Retour tardif planifié dans ${Math.round(delayMs / 60000)} min (emoji ${emojiUsed} → ${message.author.username})`);
  setTimeout(async () => {
    try {
      const currentSlot = getCurrentSlot();
      if (currentSlot.maxConv === 0) { pushLog('SYS', `💤 Retour tardif annulé — Brainee dort`); return; }
      const excuse = getEmojiExcuse(slot, mood);
      const fetched = await message.channel.messages.fetch({ limit: 50 });
      const contextLines = formatContext(fetched, null, 40);
      const profile = await getMemberProfile(message.author.id);
      const toneInstruction = getToneInstruction(profile, message.author.username);
      const channelMemory = await getChannelMemory(message.channelId);
      const memoryBlock = formatChannelMemoryBlock(channelMemory);
      const currentMood = refreshDailyMood();
      const dirEntryD = await getChannelDirectory(message.channelId);
      const chTopicD = shared.botConfig.conversations.channels.find(c => c.channelId === message.channelId)?.topic || message.channel.name;
      const intentBlockD = getChannelIntentBlock(message.channel.name, chTopicD, dirEntryD?.officialDescription || '');
      const systemPrompt = `${BOT_PERSONA_CONVERSATION}\n${toneInstruction}\nHumeur : ${currentMood}. ${getMoodInjection(currentMood)}\n${memoryBlock}\n${intentBlockD}\nContexte récent #${message.channel.name} :\n${contextLines}\nTu reviens après avoir réagi avec ${emojiUsed} sans répondre.`;
      const userPrompt = `Tu dois répondre à cette question de ${message.author.username} que t'as laissée sans réponse : "${userQuery}"\nCommence par cette excuse (reformule légèrement si besoin) : "${excuse}"\nPuis réponds vraiment à la question. Max 3 phrases au total.`;
      const reply = await callClaude(systemPrompt, userPrompt, 250);
      const replyResolved = resolveMentionsInText(reply, message.guild);
      await simulateTyping(message.channel, 1000 + Math.random() * 2000);
      await message.reply(replyResolved);
      shared.lastAnyBotPostTime = Date.now();
      await updateMemberProfile(message.author.id, message.author.username, userQuery);
      pushLog('SYS', `↩️ Retour tardif envoyé à ${message.author.username}`, 'success');
    } catch (err) { pushLog('ERR', `Retour tardif échoué : ${err.message}`, 'error'); }
  }, delayMs);
}

async function scheduleDelayedSpontaneousReply(lastMsg, channelObj, slot, mood, emojiUsed) {
  const delayMs = Math.floor((10 + Math.random() * 20) * 60 * 1000);
  pushLog('SYS', `⏳ Retour spontané planifié dans ${Math.round(delayMs / 60000)} min (emoji → ${lastMsg.author.username})`);
  setTimeout(async () => {
    try {
      const currentSlot = getCurrentSlot();
      if (currentSlot.maxConv === 0) return;
      const excuse = getEmojiExcuse(slot, mood);
      const guild = await shared.discord.guilds.fetch(GUILD_ID);
      await guild.channels.fetch();
      const channel = guild.channels.cache.get(channelObj.channelId);
      if (!channel) return;
      const msgs = await channel.messages.fetch({ limit: 50 });
      const context = formatContext(msgs, null, 40);
      const profile = await getMemberProfile(lastMsg.author.id);
      const toneInstruction = getToneInstruction(profile, lastMsg.author.username);
      const channelMemory = await getChannelMemory(channelObj.channelId);
      const memoryBlock = formatChannelMemoryBlock(channelMemory);
      const currentMood = refreshDailyMood();
      const dirEntryS = await getChannelDirectory(channelObj.channelId);
      const intentBlockS = getChannelIntentBlock(channel.name, channelObj.topic || '', dirEntryS?.officialDescription || '');
      const systemPrompt = `${BOT_PERSONA_CONVERSATION}\n${toneInstruction}\nHumeur : ${currentMood}. ${getMoodInjection(currentMood)}\n${memoryBlock}\n${intentBlockS}\nContexte récent #${channel.name} :\n${context}\nTu reviens après avoir réagi avec ${emojiUsed} sans rien dire.`;
      const userPrompt = `${lastMsg.author.username} avait dit : "${lastMsg.content}"\nTu avais juste réagi avec ${emojiUsed} sans répondre. Tu reviens maintenant.\nCommence par : "${excuse}"\nPuis réponds naturellement. Max 2-3 phrases.`;
      const reply = await callClaude(systemPrompt, userPrompt, 200);
      const replyResolved = resolveMentionsInText(reply, guild);
      await simulateTyping(channel, 800 + Math.random() * 1500);
      await lastMsg.reply(replyResolved);
      shared.lastAnyBotPostTime = Date.now();
      await updateConvStats(channelObj.channelId);
      await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, lastMsg.content);
      pushLog('SYS', `↩️ Retour spontané envoyé à ${lastMsg.author.username}`, 'success');
    } catch (err) { pushLog('ERR', `Retour spontané tardif échoué : ${err.message}`, 'error'); }
  }, delayMs);
}

module.exports = { getEmojiExcuse, scheduleDelayedReplyAfterEmoji, scheduleDelayedSpontaneousReply };
