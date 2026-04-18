const discord_js = require('discord.js');
const Events = discord_js.Events;
const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { extractYoutubeQuery, searchYoutube } = require('../ai/youtube');
const { getMemberProfile, updateMemberProfile, getToneInstruction } = require('../db/members');
const { getChannelMemory, formatChannelMemoryBlock } = require('../db/channelMem');
const { getChannelDirectory } = require('../db/channelDir');
const { getDmHistory, appendDmMessage, formatDmHistory } = require('../db/dmHistory');
const { BOT_PERSONA_CONVERSATION, BOT_PERSONA_DM } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getCurrentSlot, getMentionDelayMs, getParisDay } = require('../bot/scheduling');
const { getDailyVibe, isUrgentQuery, decideMentionResponse, queueRelance } = require('../bot/adaptiveSchedule');
const { getChannelIntentBlock } = require('../bot/channelIntel');
const { simulateTyping, sendHuman, resolveMentionsInText } = require('../bot/messaging');
const { getRandomReaction } = require('../bot/reactions');
const { formatContext } = require('../features/context');
const { scheduleDelayedReplyAfterEmoji } = require('../features/delayedReply');
const { LIGHT_TAG_CLAUSE } = require('../features/greetings');
const { scheduleDiscordToFile } = require('./sync');
const { sendWelcomeMessage } = require('../features/welcome');
const { YOUTUBE_KEYWORDS } = require('../bot/keywords');

function registerDiscordEvents() {
  shared.discord.on(Events.ChannelCreate, ch => { if (ch.guildId !== GUILD_ID) return; scheduleDiscordToFile(`Salon créé : ${ch.name}`); });
  shared.discord.on(Events.ChannelDelete, ch => { if (ch.guildId !== GUILD_ID) return; scheduleDiscordToFile(`Salon supprimé : ${ch.name}`); });
  shared.discord.on(Events.ChannelUpdate, (o, n) => { if (n.guildId !== GUILD_ID) return; if (o.name !== n.name || o.topic !== n.topic || o.parentId !== n.parentId) scheduleDiscordToFile('channel update'); });
  shared.discord.on(Events.GuildRoleCreate, r => { if (r.guild.id !== GUILD_ID) return; scheduleDiscordToFile(`Rôle créé : ${r.name}`); });
  shared.discord.on(Events.GuildRoleDelete, r => { if (r.guild.id !== GUILD_ID) return; scheduleDiscordToFile(`Rôle supprimé : ${r.name}`); });
  shared.discord.on(Events.GuildRoleUpdate, (o, n) => { if (n.guild.id !== GUILD_ID) return; if (o.name !== n.name || o.color !== n.color) scheduleDiscordToFile('Rôle modifié'); });
}

async function handleReaction(reaction, user, add) {
  if (user.bot) return;
  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    const cfg = shared.botConfig.reactionRoles;
    if (!cfg.enabled || reaction.message.id !== cfg.messageId) return;
    const mapping = cfg.mappings.find(m => m.emoji === reaction.emoji.name);
    if (!mapping) return;
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();
    const role = guild.roles.cache.find(r => r.name === mapping.roleName);
    if (!role) return;
    const member = await guild.members.fetch(user.id);
    if (add) {
      await member.roles.add(role);
      pushLog('API', `✅ ${mapping.roleName} → ${user.tag}`, 'success');
      broadcast('autorole', { user: user.tag, role: mapping.roleName });
    } else {
      await member.roles.remove(role);
      pushLog('API', `➖ ${mapping.roleName} retiré à ${user.tag}`);
    }
  } catch (err) { pushLog('ERR', `Reaction role échoué : ${err.message}`, 'error'); }
}

async function handleMentionReply(message, userQuery) {
  try {
    const slot = getCurrentSlot();
    const fetched = await message.channel.messages.fetch({ limit: 100 });
    const contextLines = formatContext(fetched, message.id, 80);
    const profile = await getMemberProfile(message.author.id);
    const toneInstruction = getToneInstruction(profile, message.author.username);
    const mood = refreshDailyMood();
    const channelMemory = await getChannelMemory(message.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntry = await getChannelDirectory(message.channelId);
    const channelTopic = shared.botConfig.conversations.channels.find(c => c.channelId === message.channelId)?.topic || message.channel.name;
    const intentBlock = getChannelIntentBlock(message.channel.name, channelTopic, dirEntry?.officialDescription || '');

    const vibe = getDailyVibe();
    const taggedMembers = [...message.mentions.users.values()].filter(u => u.id !== shared.discord.user.id).map(u => '@' + u.username);
    const taggedBlock = taggedMembers.length > 0 ? `Membres tagués : ${taggedMembers.join(', ')}. Tu peux les évoquer naturellement SANS les re-tagger — ils ont déjà été notifiés.` : '';

    const needsYoutube = YOUTUBE_KEYWORDS.some(kw => userQuery.toLowerCase().includes(kw));
    let youtubeBlock = '';
    if (needsYoutube && require('../config').YOUTUBE_API_KEY) {
      try {
        const q = await extractYoutubeQuery(userQuery);
        const results = await searchYoutube(q, 3);
        if (results.length) youtubeBlock = '\n\nInfos web:\n' + results.map(r => `• [${r.title}](${r.url}) — *${r.channel}*`).join('\n');
      } catch (_) {}
    }

    const dynamicPrompt = `${toneInstruction}\nHumeur du jour : ${mood}. ${getMoodInjection(mood)}\nVibe du jour : ${vibe.name} — ${vibe.desc}.\n${memoryBlock}\n${intentBlock}\nContexte #${message.channel.name} :\n${contextLines}\n${taggedBlock}\nTu réponds à ${message.author.username} via reply Discord — pas besoin de re-tagger, la notification part toute seule.\n${LIGHT_TAG_CLAUSE}`;

    const reactionRoll = Math.random();
    if (reactionRoll < 0.10) {
      const emoji = getRandomReaction(userQuery);
      await message.react(emoji);
      await updateMemberProfile(message.author.id, message.author.username, userQuery);
      pushLog('SYS', `😏 Réaction seule : ${emoji} → ${message.author.username} (retour tardif planifié)`);
      scheduleDelayedReplyAfterEmoji(message, userQuery, emoji, slot, mood);
      return;
    }
    const reply = await callClaude(dynamicPrompt, `${message.author.username} dit : "${userQuery}"\nMax 3 phrases.`, 250, BOT_PERSONA_CONVERSATION);
    const replyResolved = resolveMentionsInText(reply, message.guild);
    if (reactionRoll < 0.35) await message.react(getRandomReaction(userQuery + reply)).catch(() => {});
    await sendHuman(message.channel, replyResolved + youtubeBlock, message);
    await updateMemberProfile(message.author.id, message.author.username, userQuery);
    pushLog('SYS', `💬 @mention → ${message.author.username} (mood: ${mood})`, 'success');
  } catch (err) { pushLog('ERR', `handleMentionReply échoué : ${err.message}`, 'error'); }
}

function registerMessageHandlers() {
  // DM handler
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.channel.type !== 1) return;
    if (!ANTHROPIC_API_KEY) return;
    const userContent = message.content?.trim();
    if (!userContent) return;
    try {
      const history = await getDmHistory(message.author.id);
      const historyBlock = formatDmHistory(history);
      const profile = await getMemberProfile(message.author.id);
      const toneInstruction = getToneInstruction(profile, message.author.username);
      const mood = refreshDailyMood();
      const dynamicPrompt = `${toneInstruction}\n\nHumeur du jour : ${mood}. ${getMoodInjection(mood)}\n\n${historyBlock ? `Historique de vos échanges précédents :\n${historyBlock}` : 'Premier échange avec cette personne.'}\n\nTu es en message privé avec ${message.author.username}. Réponds de façon naturelle et suivie.`;
      const userPrompt = `${message.author.username} : "${userContent}"`;
      await simulateTyping(message.channel, 1000 + Math.random() * 2000);
      const reply = await callClaude(dynamicPrompt, userPrompt, 350, BOT_PERSONA_DM);
      if (Math.random() < 0.15 && reply.length > 80) { await sendHuman(message.channel, reply); }
      else { await message.reply(reply); }
      await appendDmMessage(message.author.id, message.author.username, 'user', userContent);
      await appendDmMessage(message.author.id, message.author.username, 'assistant', reply);
      await updateMemberProfile(message.author.id, message.author.username, userContent);
      pushLog('SYS', `📨 DM répondu à ${message.author.username} (mood: ${mood})`, 'success');
    } catch (err) { pushLog('ERR', `DM handler échoué pour ${message.author.username} : ${err.message}`, 'error'); }
  });

  // @mention handler v2.0.7 — urgence + vibe + relance demain
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || message.guild.id !== GUILD_ID) return;
    if (!shared.discord.user || !message.mentions.has(shared.discord.user)) return;
    const userQuery = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!userQuery) return;
    const slot = getCurrentSlot();
    const urgent = isUrgentQuery(userQuery);
    const decision = decideMentionResponse(slot, urgent);

    // Décision : skip total (agency)
    if (decision.action === 'skip') {
      pushLog('SYS', `🙅 @mention ignorée volontairement (vibe ${getDailyVibe().name}) → ${message.author.username}`);
      return;
    }

    // Décision : reporter au lendemain (non-urgent + vibe lazy, ou sleep)
    if (decision.action === 'defer_tomorrow') {
      queueRelance({
        userId: message.author.id,
        username: message.author.username,
        channelId: message.channelId,
        messageId: message.id,
        query: userQuery,
      });
      pushLog('SYS', `📬 @mention différée à demain → ${message.author.username} (non-urgent, vibe ${getDailyVibe().name})`);
      return;
    }

    // Urgent : délai très court, on zappe tous les autres délais
    if (decision.action === 'fast') {
      const fastDelay = decision.delay || 0;
      pushLog('SYS', `⚡ @mention URGENTE → ${message.author.username} (délai ${Math.round(fastDelay / 1000)}s)`);
      if (fastDelay > 0) setTimeout(() => handleMentionReply(message, userQuery), fastDelay);
      else handleMentionReply(message, userQuery);
      return;
    }

    // Normal : garde le délai de slot classique
    const delayMs = getMentionDelayMs(slot);
    if (delayMs > 0) setTimeout(() => handleMentionReply(message, userQuery), delayMs);
    else handleMentionReply(message, userQuery);
  });

  // Reaction roles
  shared.discord.on(Events.MessageReactionAdd, (r, u) => handleReaction(r, u, true));
  shared.discord.on(Events.MessageReactionRemove, (r, u) => handleReaction(r, u, false));

  // New member
  shared.discord.on(Events.GuildMemberAdd, async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    try {
      await member.guild.roles.fetch();
      const role = member.guild.roles.cache.find(r => r.name === shared.AUTO_ROLE_NAME);
      if (role) {
        await member.roles.add(role);
        pushLog('API', `Auto-role → ${member.user.tag}`, 'success');
        broadcast('autorole', { user: member.user.tag, role: role.name });
      }
      await sendWelcomeMessage(member);
    } catch (err) { pushLog('ERR', `Arrivée échouée : ${err.message}`, 'error'); }
  });
}

module.exports = { registerDiscordEvents, registerMessageHandlers, handleMentionReply, handleReaction };
