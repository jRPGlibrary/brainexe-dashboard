const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY, MIN_GAP_ANY_POST } = require('../config');
const { callClaude } = require('../ai/claude');
const { getMemberProfile, updateMemberProfile, getToneInstruction } = require('../db/members');
const { getChannelMemory, formatChannelMemoryBlock } = require('../db/channelMem');
const { getChannelDirectory } = require('../db/channelDir');
const { BOT_PERSONA, BOT_PERSONA_CONVERSATION } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getCurrentSlot, getRandomMode, getSlotIntervalMs } = require('../bot/scheduling');
const { getDailyVibe, shouldSkipConvCron } = require('../bot/adaptiveSchedule');
const { getChannelIntentBlock, getModeInjectionForChannel } = require('../bot/channelIntel');
const { simulateTyping, sendHuman, resolveMentionsInText } = require('../bot/messaging');
const { sanitizeForJson } = require('../utils');
const { getRandomReaction, shouldCreateThread } = require('../bot/reactions');
const {
  getEmotionalInjection, getTemperamentInjection, detectEmotionFromMessage,
  updateInternalStatesForSlot, applyNaturalDecay, adjustMaxTokens, getInternalState,
} = require('../bot/emotions');
const { ensureMemberBond, applyInteractionToBond, describeBond } = require('../db/memberBonds');
const { NO_TAG_CLAUSE, LIGHT_TAG_CLAUSE } = require('./greetings');
const { formatContext } = require('./context');
const { scheduleDelayedSpontaneousReply } = require('./delayedReply');
const {
  getConvDailyCount, getConvMaxPerDay, resetDailyCountIfNeeded,
  updateConvStats, getQuietestChannel, hasUnansweredLastPost, isDeepTopicChannel,
} = require('./convStats');
const { shouldRespond, recordMessageTopic } = require('./decisionLogic');
const { formatNarrativeInjection } = require('../db/narrativeMemory');

async function postRandomConversation() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled) return;
  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;
  await resetDailyCountIfNeeded();
  if (getConvDailyCount() >= getConvMaxPerDay()) return;
  if (Date.now() - shared.lastAnyBotPostTime < getSlotIntervalMs(slot)) return;
  const ch = getQuietestChannel();
  if (!ch) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel || !ANTHROPIC_API_KEY) return;

    // No-insist : si Brainee a posté dans ce salon et que personne n'a répondu depuis,
    // on ne relance PAS dessus (évite le monologue).
    const alone = await hasUnansweredLastPost(ch.channelId, async (id) => {
      const g = await shared.discord.guilds.fetch(GUILD_ID);
      await g.channels.fetch();
      return g.channels.cache.get(id);
    });
    if (alone) {
      pushLog('SYS', `🔇 Skip ${ch.channelName} — dernier post sans réponse humaine (no-insist)`);
      return;
    }
    const isDeep = isDeepTopicChannel(ch.channelName);
    const mode = getRandomMode(slot);
    const mood = refreshDailyMood();
    updateInternalStatesForSlot(slot);
    applyNaturalDecay();
    const vibe = getDailyVibe();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntryC = await getChannelDirectory(ch.channelId);
    const intentBlockC = getChannelIntentBlock(channel.name, ch.topic, dirEntryC?.officialDescription || '');
    const modeBlock = getModeInjectionForChannel(mode, channel.name, ch.topic);
    const emotionBlock = getEmotionalInjection();
    const temperamentBlock = getTemperamentInjection();
    const narrativeBlock = await formatNarrativeInjection();
    let contextBlock = '';
    try {
      const msgs = await channel.messages.fetch({ limit: 100 });
      const ctx = formatContext(msgs, null, 80);
      if (ctx.length > 20) contextBlock = `\nContexte récent (évite de répéter) :\n${ctx}`;
    } catch (_) {}
    const deepInject = isDeep
      ? `\nCONTEXTE SALON : c'est un salon de thématique profonde (${channel.name}). Lance un angle vraiment fouillé, qui donne envie de creuser. Pas de question générique. Tu peux être plus précise, citer un détail, un souvenir, un mécanisme, une référence. Laisse l'entrée ouverte mais pas vague. Si personne ne rebondit, c'est ok — tu n'insistes pas.`
      : '';
    const content = await callClaude(
      `\nHumeur : ${mood}. ${getMoodInjection(mood)}\nVibe du jour : ${vibe.name} — ${vibe.desc}.\n${temperamentBlock}\n${emotionBlock}\n${memoryBlock}\n${narrativeBlock}\n${intentBlockC}\n${modeBlock}${deepInject}\n${NO_TAG_CLAUSE}` + contextBlock,
      `Max 3 phrases. Direct. Adapte-toi au salon. Pas de @ à quelqu'un — c'est un lance-conv ambiant.`,
      adjustMaxTokens(isDeep ? 200 : 150),
      BOT_PERSONA
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 1000 + Math.random() * 2000);
    const sentMsg = await channel.send(contentResolved);
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats(ch.channelId);
    if (shouldCreateThread(content, channel.name, false)) {
      try {
        const tName = await callClaude('Nom de fil Discord court (max 60 car, pas de guillemets, emoji adapté).', `Nom pour : "${sanitizeForJson(content)}"`, 60);
        const cleanName = tName.replace(/"/g, '').trim().slice(0, 100);
        const thread = await sentMsg.startThread({ name: cleanName, autoArchiveDuration: 1440, reason: 'Fil conv Brainee' });
        // Premier message dans le fil : titre + invitation (pas de tag, c'est un lance-conv ambiant)
        const threadIntro = await callClaude(
          `\nTu viens d'ouvrir un fil Discord "${cleanName}" pour creuser un sujet que tu viens de lancer.`,
          `Écris l'ouverture du fil : 1 ligne de titre en gras "**[titre]**", puis 1-2 phrases d'invitation à venir discuter ici. Style Brainee, direct, oral. Pas de @.`,
          140,
          BOT_PERSONA
        );
        await thread.send(resolveMentionsInText(threadIntro, guild));
        pushLog('SYS', `🧵 Fil conv créé + intro postée`, 'success');
      } catch (_) {}
    }
    pushLog('SYS', `💬 Conv [${mode.name}] ${ch.channelName} [${slot.label}] (${getConvDailyCount()}/${getConvMaxPerDay()})`, 'success');
    broadcast('conversation', { channel: ch.channelName, time: new Date().toLocaleTimeString('fr-FR'), mode: mode.name, slot: slot.label, dayCount: getConvDailyCount() });
  } catch (err) { pushLog('ERR', `Lance-conv échouée : ${err.message}`, 'error'); }
}

async function replyToConversations() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !cfg.canReply || !ANTHROPIC_API_KEY) return;
  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;
  if (Math.random() < 0.05) { pushLog('SYS', `💬 Ignore spontané 5%`); return; }
  const active = cfg.channels.filter(c => c.enabled);
  if (!active.length) return;
  const ch = active[Math.floor(Math.random() * active.length)];
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel) return;
    const msgs = await channel.messages.fetch({ limit: 100 });
    const msgArray = [...msgs.values()];
    if (!msgArray.length) return;
    const lastMsg = msgArray[0];
    if (lastMsg.author.bot) return;
    const age = Date.now() - lastMsg.createdTimestamp;
    if (age < 20 * 60 * 1000 || age > 3 * 60 * 60 * 1000) return;
    if (Date.now() - (cfg.lastPostByChannel?.[ch.channelId] || 0) < Math.max(getSlotIntervalMs(slot), 90 * 60 * 1000)) return;
    if (Date.now() - shared.lastAnyBotPostTime < MIN_GAP_ANY_POST) return;
    const msgContent = lastMsg.content;
    if (!msgContent || msgContent.length < 5) return;

    // v2.2.2 : Check if Brainee should respond (autonomy logic)
    const vibe = getDailyVibe();
    const internalState = getInternalState();
    const decision = await shouldRespond(slot, vibe, internalState.mentalLoad, msgContent, false);

    if (!decision.should) {
      pushLog('SYS', `🙅 Skip reply (${decision.reason}): ${decision.message ? decision.message : ''}`);
      if (decision.message && Math.random() < 0.3) {
        try {
          await lastMsg.react('😴').catch(() => {});
        } catch (_) {}
      }
      return;
    }

    // Record topic for fatigue tracking
    await recordMessageTopic(msgContent);

    const profile = await getMemberProfile(lastMsg.author.id);
    const toneInstruction = getToneInstruction(profile, lastMsg.author.username);
    const mood = refreshDailyMood();
    updateInternalStatesForSlot(slot);
    applyNaturalDecay();
    detectEmotionFromMessage(msgContent, { userId: lastMsg.author.id });
    const bond = await ensureMemberBond(lastMsg.author.id, lastMsg.author.username);
    const bondBlock = describeBond(bond, lastMsg.author.username);
    const emotionBlock = getEmotionalInjection();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntryR = await getChannelDirectory(ch.channelId);
    const intentBlockR = getChannelIntentBlock(channel.name, ch.topic, dirEntryR?.officialDescription || '');
    const context = formatContext(msgs, null, 80);
    const dynamicPrompt = `${toneInstruction}\n💞 LIEN : ${bondBlock}\nHumeur : ${mood}. ${getMoodInjection(mood)}\nVibe du jour : ${vibe.name}.\n${emotionBlock}\n${memoryBlock}\n${intentBlockR}\nContexte #${channel.name} :\n${context}\nTu réponds à ${lastMsg.author.username} via reply (pas besoin de tag).\n${LIGHT_TAG_CLAUSE}`;
    const reactionRoll = Math.random();
    if (reactionRoll < 0.10) {
      const emoji = getRandomReaction(msgContent);
      await lastMsg.react(emoji);
      shared.lastAnyBotPostTime = Date.now();
      await updateConvStats(ch.channelId);
      await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, msgContent);
      await applyInteractionToBond(lastMsg.author.id, lastMsg.author.username, msgContent);
      pushLog('SYS', `😏 Réaction seule → ${lastMsg.author.username} (retour tardif planifié)`);
      scheduleDelayedSpontaneousReply(lastMsg, ch, slot, mood, emoji);
      return;
    }
    const reply = await callClaude(dynamicPrompt, `${lastMsg.author.username} dit : "${msgContent}"\n1-2 phrases.`, adjustMaxTokens(150), BOT_PERSONA_CONVERSATION);
    const replyResolved = resolveMentionsInText(reply, guild);
    if (reactionRoll < 0.30) await lastMsg.react(getRandomReaction(msgContent + reply)).catch(() => {});
    await sendHuman(channel, replyResolved, lastMsg, { bond });
    shared.lastAnyBotPostTime = Date.now();
    await updateConvStats(ch.channelId);
    await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, msgContent);
    await applyInteractionToBond(lastMsg.author.id, lastMsg.author.username, msgContent);
    const hasEngagement = (lastMsg.reactions?.cache?.size > 0) ||
      ([...msgs.values()].filter(m => m.reference?.messageId === lastMsg.id).length > 0);
    if (shouldCreateThread(reply, channel.name, hasEngagement)) {
      try {
        const tName = await callClaude('Nom de fil Discord court (max 60 car, pas de guillemets, emoji adapté).', `Nom pour : "${reply}"`, 60);
        const cleanName = tName.replace(/"/g, '').trim().slice(0, 100);
        const thread = await lastMsg.startThread({ name: cleanName, autoArchiveDuration: 1440, reason: 'Fil reply Brainee' });
        const threadIntro = await callClaude(
          `\nTu viens d'ouvrir un fil Discord "${cleanName}" depuis un message de ${lastMsg.author.username}.`,
          `Écris l'ouverture : 1 ligne titre en gras "**[titre]**", puis 1-2 phrases d'invitation. Style Brainee. Pas de @.`,
          140,
          BOT_PERSONA_CONVERSATION
        );
        // Tag l'auteur du message déclencheur + quelques participants récents actifs
        const recentParticipants = [...new Set(
          [...msgs.values()]
            .filter(m => !m.author?.bot && m.author?.id !== lastMsg.author.id)
            .map(m => m.author?.id)
            .filter(Boolean)
        )].slice(0, 3);
        const tagLine = [lastMsg.author.id, ...recentParticipants].map(id => `<@${id}>`).join(' ');
        await thread.send(`${tagLine} ${resolveMentionsInText(threadIntro, guild)}`);
        pushLog('SYS', `🧵 Fil reply créé + intro (${recentParticipants.length + 1} tagués)`, 'success');
      } catch (_) {}
    }
    pushLog('SYS', `💬 Reply → ${lastMsg.author.username} (mood: ${mood})`, 'success');
    broadcast('conversation', { channel: ch.channelName, type: 'reply' });
  } catch (err) {
    if (!err.message.includes('Missing Permissions') && !err.message.includes('Unknown Message')) {
      pushLog('ERR', `Reply échouée : ${err.message}`, 'error');
    }
  }
}

module.exports = { postRandomConversation, replyToConversations };
