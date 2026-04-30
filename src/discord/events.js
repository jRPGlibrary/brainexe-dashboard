const discord_js = require('discord.js');
const Events = discord_js.Events;
const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { recordTokenUsage } = require('../db/tokenUsage');
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
const {
  getEmotionalInjection, getTemperamentInjection, detectEmotionFromMessage,
  updateInternalStatesForSlot, applyNaturalDecay, adjustMaxTokens, getInternalState,
} = require('../bot/emotions');
const { ensureMemberBond, applyInteractionToBond, describeBond } = require('../db/memberBonds');
const {
  detectStoriesFromMessage, getMemberStories, addMemberStory, formatStoriesBlock,
} = require('../db/memberStories');
const { getVipTier, getVipBlockForPrompt } = require('../db/vipSystem');
const {
  getTasteProfile, updateTasteFromMessage, formatTasteBlock,
} = require('../db/tasteProfile');
const { detectHyperFocusTopic, registerObsession } = require('../bot/hyperFocus');
const { getEmotionCombosBlock } = require('../bot/emotionCombos');
const {
  getActiveWindow, detectSupport, recordSupportFromMember, getVulnerabilityBlock,
} = require('../bot/vulnerability');
const { getRandomReaction } = require('../bot/reactions');
const { formatContext } = require('../features/context');
const { scheduleDelayedReplyAfterEmoji } = require('../features/delayedReply');
const { LIGHT_TAG_CLAUSE } = require('../features/greetings');
const { scheduleDiscordToFile } = require('./sync');
const { sendWelcomeMessage } = require('../features/welcome');
const { enrichDMWithServerContext, logMessageForBridge } = require('../features/dmServerBridge');
const { YOUTUBE_KEYWORDS, GAMING_KEYWORDS } = require('../bot/keywords');
const { shouldRespond, recordMessageTopic } = require('../features/decisionLogic');
const { getNarrativeContext } = require('../db/narrativeMemory');
const { extractGameName, searchSteam } = require('../ai/steam');
const {
  detectDmInvite, detectDmAccept, detectDmRefuse,
  handleDmInvite, maybeProposeInDm,
  checkPendingDmProposal, consumeDmProposal, openAndSendDm,
} = require('../features/dmOutreach');

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
    updateInternalStatesForSlot(slot);
    applyNaturalDecay();
    detectEmotionFromMessage(userQuery, { userId: message.author.id });

    // v2.2.4 : Check if Brainee should respond (autonomy logic)
    // For mentions, we check but still respect the urgent flag from caller
    const vibe = getDailyVibe();
    const internalState = getInternalState();
    const decision = await shouldRespond(slot, vibe, internalState.mentalLoad, userQuery, false);

    if (!decision.should && internalState.mentalLoad > 85) {
      // Only skip if VERY overloaded
      try {
        await message.react('😴').catch(() => {});
      } catch (_) {}
      pushLog('SYS', `🙅 Skip @mention (${decision.reason}): trop fatiguée`);
      return;
    }

    // Record topic for fatigue tracking
    await recordMessageTopic(userQuery);

    // 💬 Court-circuit : invitation DM détectée (v2.3.7)
    // On traite ici avant tout chargement de contexte inutile
    if (detectDmInvite(userQuery)) {
      await updateMemberProfile(message.author.id, message.author.username, userQuery);
      await applyInteractionToBond(message.author.id, message.author.username, userQuery);
      await handleDmInvite(message, userQuery);
      pushLog('SYS', `💬 Invite DM → ${message.author.username}`);
      return;
    }

    const bond = await ensureMemberBond(message.author.id, message.author.username);
    const bondBlock = describeBond(bond, message.author.username);
    const emotionBlock = getEmotionalInjection();
    const temperamentBlock = getTemperamentInjection();
    const narrativeBlock = await getNarrativeContext();

    // 📚 Mémoire narrative par membre (v2.3.4)
    const memberStories = await getMemberStories(message.author.id);
    const memberStoriesBlock = formatStoriesBlock(memberStories, message.author.username);

    // 💎 VIP tier (v2.3.4)
    const vipTier = getVipTier(bond);
    const vipBlock = getVipBlockForPrompt(vipTier, bond, message.author.username);

    // 🎯 Taste profile (v2.3.4)
    const tasteProfile = await getTasteProfile(message.author.id);
    const tasteBlock = formatTasteBlock(tasteProfile, message.author.username);

    // 🎭 Combos émotionnels (v2.3.5)
    const combosBlock = getEmotionCombosBlock(mood);

    // 🤍 Fenêtre de fragilité (v2.3.5) — si support détecté, on l'enregistre
    const vulnWindow = await getActiveWindow();
    const vulnBlock = getVulnerabilityBlock(vulnWindow);
    if (vulnWindow && detectSupport(userQuery)) {
      try { await recordSupportFromMember(message.author.id, message.author.username, userQuery); }
      catch (vErr) { pushLog('ERR', `record support: ${vErr.message}`, 'error'); }
    }
    const channelMemory = await getChannelMemory(message.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntry = await getChannelDirectory(message.channelId);
    const channelTopic = shared.botConfig.conversations.channels.find(c => c.channelId === message.channelId)?.topic || message.channel.name;
    const intentBlock = getChannelIntentBlock(message.channel.name, channelTopic, dirEntry?.officialDescription || '');

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

    const dynamicPrompt = `${toneInstruction}\n💞 LIEN : ${bondBlock}\n${vipBlock}\nHumeur du jour : ${mood}. ${getMoodInjection(mood)}\nVibe du jour : ${vibe.name} — ${vibe.desc}.\n${temperamentBlock}\n${emotionBlock}${combosBlock}${vulnBlock}\n${narrativeBlock}\n${memberStoriesBlock}\n${tasteBlock}\n${memoryBlock}\n${intentBlock}\nContexte #${message.channel.name} :\n${contextLines}\n${taggedBlock}\nTu réponds à ${message.author.username} via reply Discord — pas besoin de re-tagger, la notification part toute seule.\n${LIGHT_TAG_CLAUSE}`;

    const reactionRoll = Math.random();
    if (reactionRoll < 0.10) {
      const emoji = getRandomReaction(userQuery);
      await message.react(emoji);
      await updateMemberProfile(message.author.id, message.author.username, userQuery);
      await applyInteractionToBond(message.author.id, message.author.username, userQuery);
      pushLog('SYS', `😏 Réaction seule : ${emoji} → ${message.author.username} (retour tardif planifié)`);
      scheduleDelayedReplyAfterEmoji(message, userQuery, emoji, slot, mood);
      return;
    }
    const { text: reply, usage } = await callClaude(dynamicPrompt, `${message.author.username} dit : "${userQuery}"\nMax 3 phrases.`, adjustMaxTokens(250), BOT_PERSONA_CONVERSATION);
    await recordTokenUsage(message.author.id, message.author.username, usage.inputTokens, usage.outputTokens, 'mention_reply');
    const replyResolved = resolveMentionsInText(reply, message.guild);
    if (reactionRoll < 0.35) await message.react(getRandomReaction(userQuery + reply)).catch(() => {});

    let steamBlock = '';
    if (GAMING_KEYWORDS.some(kw => `${userQuery} ${reply}`.toLowerCase().includes(kw))) {
      try {
        const gameName = await extractGameName(userQuery, reply);
        if (gameName && !contextLines.toLowerCase().includes(gameName.toLowerCase())) {
          const steamResult = await searchSteam(gameName);
          if (steamResult) {
            steamBlock = `\n🎮 [${steamResult.title} sur Steam](${steamResult.url})`;
            pushLog('SYS', `🎮 Steam link ajouté : ${steamResult.title}`, 'success');
          }
        }
      } catch (_) {}
    }

    await sendHuman(message.channel, replyResolved + youtubeBlock + steamBlock, message, { bond });
    await updateMemberProfile(message.author.id, message.author.username, userQuery);
    await applyInteractionToBond(message.author.id, message.author.username, userQuery);

    // 💬 Proposal DM sortante (v2.3.7) : Brainee propose de continuer en DM (faible proba)
    await maybeProposeInDm(message, userQuery, bond).catch(() => {});

    // 📚 Détection narrative — on enregistre les stories pertinentes (max 1 par message)
    try {
      const detected = detectStoriesFromMessage(userQuery);
      const best = detected.sort((a, b) => b.confidence - a.confidence)[0];
      if (best && best.confidence >= 0.5) {
        await addMemberStory(message.author.id, message.author.username, best);
      }
    } catch (storyErr) { pushLog('ERR', `Story detect: ${storyErr.message}`, 'error'); }

    // 🎯 Mise à jour goûts depuis le message
    try { await updateTasteFromMessage(message.author.id, message.author.username, userQuery); }
    catch (tasteErr) { pushLog('ERR', `Taste update: ${tasteErr.message}`, 'error'); }

    // 🎯 Hyper-focus : si un sujet "obsessionnel" est mentionné, on enregistre une revisit
    try {
      const topic = detectHyperFocusTopic(userQuery);
      if (topic && Math.random() < 0.55) {
        await registerObsession({
          topic,
          sourceUserId: message.author.id,
          sourceUsername: message.author.username,
          sourceChannelId: message.channelId,
          sourceMessageContent: userQuery,
        });
      }
    } catch (hfErr) { pushLog('ERR', `HyperFocus register: ${hfErr.message}`, 'error'); }

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
      const slot = getCurrentSlot();
      updateInternalStatesForSlot(slot);
      applyNaturalDecay();
      detectEmotionFromMessage(userContent, { userId: message.author.id });
      const bond = await ensureMemberBond(message.author.id, message.author.username);
      const bondBlock = describeBond(bond, message.author.username);
      const emotionBlock = getEmotionalInjection();
      const temperamentBlock = getTemperamentInjection();

      // 📚 Stories du membre (DM = contexte privilégié, on les utilise toujours)
      const memberStories = await getMemberStories(message.author.id);
      const memberStoriesBlock = formatStoriesBlock(memberStories, message.author.username);

      // 💎 VIP tier
      const vipTier = getVipTier(bond);
      const vipBlock = getVipBlockForPrompt(vipTier, bond, message.author.username);

      // 🎯 Taste profile
      const tasteProfile = await getTasteProfile(message.author.id);
      const tasteBlock = formatTasteBlock(tasteProfile, message.author.username);

      // 🎭 Combos émotionnels
      const combosBlock = getEmotionCombosBlock(mood);

      // 🤍 Vulnerability window (DM = canal privilégié pour le soutien)
      const vulnWindow = await getActiveWindow();
      const vulnBlock = getVulnerabilityBlock(vulnWindow);
      if (vulnWindow && detectSupport(userContent)) {
        try { await recordSupportFromMember(message.author.id, message.author.username, userContent); } catch (_) {}
      }

      // Enrichir le DM avec le contexte serveur (faire la liaison DM ↔ Serveur)
      const enrichedUserContent = await enrichDMWithServerContext(message.author.id, message.author.username, userContent);

      const dynamicPrompt = `${toneInstruction}\n💞 LIEN DM : ${bondBlock}\n${vipBlock}\n\nHumeur du jour : ${mood}. ${getMoodInjection(mood)}\n${temperamentBlock}\n${emotionBlock}${combosBlock}${vulnBlock}\n${memberStoriesBlock}\n${tasteBlock}\n\n${historyBlock ? `Historique de vos échanges précédents :\n${historyBlock}` : 'Premier échange avec cette personne.'}\n\nTu es en message privé avec ${message.author.username}. Réponds de façon naturelle et suivie.`;
      const userPrompt = `${message.author.username} : "${enrichedUserContent}"`;
      await simulateTyping(message.channel, 1000 + Math.random() * 2000);
      const { text: reply, usage } = await callClaude(dynamicPrompt, userPrompt, adjustMaxTokens(350), BOT_PERSONA_DM);
      await recordTokenUsage(message.author.id, message.author.username, usage.inputTokens, usage.outputTokens, 'dm_reply');

      let dmSteamBlock = '';
      if (GAMING_KEYWORDS.some(kw => `${userContent} ${reply}`.toLowerCase().includes(kw))) {
        try {
          const gameName = await extractGameName(userContent, reply);
          if (gameName && !(historyBlock || '').toLowerCase().includes(gameName.toLowerCase())) {
            const steamResult = await searchSteam(gameName);
            if (steamResult) {
              dmSteamBlock = `\n🎮 [${steamResult.title} sur Steam](${steamResult.url})`;
              pushLog('SYS', `🎮 Steam link DM : ${steamResult.title}`, 'success');
            }
          }
        } catch (_) {}
      }

      // Logger le message pour la liaison DM/Serveur
      await logMessageForBridge(message.author.id, message.author.username, userContent, message.channelId, 'DM', 'dm');
      if (Math.random() < 0.15 && reply.length > 80) { await sendHuman(message.channel, reply + dmSteamBlock, null, { bond }); }
      else {
        const { humanize } = require('../bot/humanize');
        const { getHumanizationSignal } = require('../bot/emotions');
        const { getBondSignal } = require('../db/memberBonds');
        const humanized = humanize(reply, {
          emotionalSignal: getHumanizationSignal(),
          bondSignal: getBondSignal(bond),
          mood,
          slotStatus: slot.status,
        });
        await message.reply(humanized + dmSteamBlock);
      }
      await appendDmMessage(message.author.id, message.author.username, 'user', userContent);
      await appendDmMessage(message.author.id, message.author.username, 'assistant', reply);
      await updateMemberProfile(message.author.id, message.author.username, userContent);
      await applyInteractionToBond(message.author.id, message.author.username, userContent);

      // 📚 Détection narrative en DM aussi
      try {
        const detected = detectStoriesFromMessage(userContent);
        const best = detected.sort((a, b) => b.confidence - a.confidence)[0];
        if (best && best.confidence >= 0.5) {
          await addMemberStory(message.author.id, message.author.username, best);
        }
      } catch (_) {}

      // 🎯 Update goûts depuis le DM
      try { await updateTasteFromMessage(message.author.id, message.author.username, userContent); }
      catch (_) {}

      pushLog('SYS', `📨 DM répondu à ${message.author.username} (mood: ${mood})`, 'success');
    } catch (err) { pushLog('ERR', `DM handler échoué pour ${message.author.username} : ${err.message}`, 'error'); }
  });

  // @mention handler v2.1.0 — urgence + vibe + relance demain
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || message.guild.id !== GUILD_ID) return;
    if (!shared.discord.user || !message.mentions.has(shared.discord.user)) return;
    const userQuery = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!userQuery) return;
    const slot = getCurrentSlot();
    const urgent = isUrgentQuery(userQuery);
    const decision = decideMentionResponse(slot, urgent);

    // Émojis de signal selon la vibe (montre que Brainee a vu mais est dans un état particulier)
    const VIBE_SIGNAL_EMOJI = {
      grumpy: '😒', lazy: '😴', introvert: '👀', focus: '🔕',
      melancholic: '😔', withdrawn: '💤',
    };

    // Décision : skip total → on ne skip jamais une mention directe, on répond avec délai
    // On réagit avec un emoji pour signaler qu'on a vu le message
    if (decision.action === 'skip') {
      const vibe = getDailyVibe();
      const signalEmoji = VIBE_SIGNAL_EMOJI[vibe.name] || '⏳';
      await message.react(signalEmoji).catch(() => {});
      const vibeDelay = 3 * 60 * 1000 + Math.random() * 12 * 60 * 1000; // 3-15 min
      pushLog('SYS', `⏳ @mention retardée ${signalEmoji} (vibe ${vibe.name}) → ${message.author.username} (${Math.round(vibeDelay / 60000)} min)`);
      setTimeout(() => handleMentionReply(message, userQuery), vibeDelay);
      return;
    }

    // Décision : reporter au lendemain — seulement si le bot dort vraiment
    if (decision.action === 'defer_tomorrow') {
      if (slot?.status === 'sleep') {
        await message.react('💤').catch(() => {});
        queueRelance({
          userId: message.author.id,
          username: message.author.username,
          channelId: message.channelId,
          messageId: message.id,
          query: userQuery,
        });
        pushLog('SYS', `📬 @mention différée à demain → ${message.author.username} (slot sommeil)`);
        return;
      }
      // Hors sommeil : signal + délai long plutôt que vrai report
      const vibe = getDailyVibe();
      const signalEmoji = VIBE_SIGNAL_EMOJI[vibe.name] || '⏳';
      await message.react(signalEmoji).catch(() => {});
      const deferDelay = 10 * 60 * 1000 + Math.random() * 20 * 60 * 1000; // 10-30 min
      pushLog('SYS', `⏳ @mention retardée ${signalEmoji} (vibe ${vibe.name}) → ${message.author.username} (${Math.round(deferDelay / 60000)} min)`);
      setTimeout(() => handleMentionReply(message, userQuery), deferDelay);
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

  // 💬 Réponse à une proposal DM de Brainee (v2.3.7)
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || message.guild.id !== GUILD_ID) return;
    // Ignorer les messages qui mentionnent Brainee (déjà gérés par le handler @mention)
    if (shared.discord.user && message.mentions.has(shared.discord.user)) return;

    const proposal = checkPendingDmProposal(message);
    if (!proposal) return;

    const content = message.content?.trim();
    if (!content) return;

    if (detectDmAccept(content)) {
      consumeDmProposal(message.author.id);
      const bond = await ensureMemberBond(message.author.id, message.author.username);
      await openAndSendDm(message.author, proposal.contextHint, bond);
    } else if (detectDmRefuse(content)) {
      consumeDmProposal(message.author.id);
      pushLog('SYS', `💬 Proposal DM refusée par ${message.author.username}`);
    }
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
