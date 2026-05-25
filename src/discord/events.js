const discord_js = require('discord.js');
const Events = discord_js.Events;
const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { handleAffinityCommand } = require('../features/affinityCommand');
const { GUILD_ID, ANTHROPIC_API_KEY, TAVILY_API_KEY } = require('../config');
const { callClaude, callClaudeWithTools } = require('../ai/claude');
const { gamingToolHandler, getAvailableTools } = require('../ai/tavilySearch');
const { recordTokenUsage } = require('../db/tokenUsage');
const { extractYoutubeQuery, searchYoutube } = require('../ai/youtube');
const { getMemberProfile, updateMemberProfile, getToneInstruction } = require('../db/members');
const { getChannelMemory, formatChannelMemoryBlock } = require('../db/channelMem');
const { getChannelDirectory } = require('../db/channelDir');
const { getDmHistory, appendDmMessage, formatDmHistory } = require('../db/dmHistory');
const { BOT_PERSONA_CONVERSATION, BOT_PERSONA_DM, BOT_PERSONA_DM_LIBRE } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getCurrentSlot, getMentionDelayMs, getParisDay, getTemporalBlock } = require('../bot/scheduling');
const { getDailyVibe, isUrgentQuery, decideMentionResponse, queueRelance } = require('../bot/adaptiveSchedule');
const { getChannelIntentBlock } = require('../bot/channelIntel');
const { simulateTyping, simulateDmTyping, sendHuman, resolveMentionsInText, stripEmDash } = require('../bot/messaging');
const { checkBusyExcuse, triggerBusyExcuse } = require('../features/busyExcuse');
const {
  getEmotionalInjection, getTemperamentInjection, detectEmotionFromMessage,
  updateInternalStatesForSlot, applyNaturalDecay, adjustMaxTokens, getInternalState,
} = require('../bot/emotions');
const { ensureMemberBond, applyInteractionToBond, describeBond, getBondToneInstruction } = require('../db/memberBonds');
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
const { formatContext, extractRecentBraineeWords } = require('../features/context');
const { scheduleDelayedReplyAfterEmoji } = require('../features/delayedReply');
const { LIGHT_TAG_CLAUSE } = require('../features/greetings');
const { scheduleDiscordToFile } = require('./sync');
const { sendWelcomeMessage } = require('../features/welcome');
const { enrichDMWithServerContext, enrichServerWithDmContext, logMessageForBridge } = require('../features/dmServerBridge');
const {
  extractImageAttachments, buildMultimodalUserContent, getImageCommentInstruction,
} = require('../features/imageAttachments');
const { YOUTUBE_KEYWORDS, GAMING_KEYWORDS } = require('../bot/keywords');
const { shouldRespond, recordMessageTopic } = require('../features/decisionLogic');
const { isAbsent } = require('../features/absence');
const { getNarrativeContext, getWeeklyContext } = require('../db/narrativeMemory');
const { checkEmotionalRefusal, isInRefusalCooldown } = require('../features/emotionalRefusal');
const { checkAndHandleSpam } = require('../features/spamDetector');
const { getBudgetProfile } = require('../ai/budget');
const { handleHangmanDm, isHangmanActive, launchHangmanFromDm } = require('../features/hangman');
const { logMemberJoin, logMemberLeave, logMemberBan } = require('../features/modLogger');
const { analyzeConviction } = require('../features/conviction');
const {
  getAttachmentStage, tryPromoteSingularBond,
  detectRejectionSignal, handleSingularBondRejection,
  getSingularBondBlock, getAppreciationInjection,
} = require('../features/attachmentStages');
const { extractGameName, searchSteam } = require('../ai/steam');
const {
  detectDmInvite, detectDmAccept, detectDmRefuse,
  handleDmInvite, maybeProposeInDm,
  checkPendingDmProposal, consumeDmProposal, openAndSendDm,
} = require('../features/dmOutreach');
const { recordEngagement } = require('../db/messageEngagement');

const NEWS_KEYWORDS = [
  'actu', 'news', 'nouvelles', 'dernier', 'dernière', 'dernières', 'récent', 'récente',
  "aujourd'hui", 'cette semaine', 'ce mois', 'annonce', 'sorti', 'sortie', 'vient de',
  'release', 'trailer', 'reveal', 'leak', 'rumeur', 'update', 'patch', 'maj',
  'mise à jour', 'nintendo direct', 'state of play', 'showcase', 'event', 'événement',
];

const GAME_INFO_KEYWORDS = [
  'jeu', 'game', 'ps5', 'ps4', 'ps3', 'xbox', 'switch', 'sur pc', 'sur steam',
  'nintendo', 'playstation', 'tu connais', 'tu sais', "c'est quoi", 'dis-moi',
  'parle-moi', 'infos sur', 'info sur', 'qui a fait', 'qui développe', 'qui a développé',
  'sorti sur', 'disponible sur', 'développeur', 'éditeur', 'studio', 'rpg', 'fps',
  'indie', 'open world', 'multijoueur',
];

const HELP_KEYWORDS = [
  'soluce', 'soluces', 'astuce', 'astuces', 'guide', 'aide', 'aider',
  'comment faire', 'comment passer', 'comment battre', 'comment tuer',
  'comment trouver', 'comment débloquer', 'comment terminer', 'comment finir',
  'boss', 'niveau', 'mission', 'quête', 'trophée', 'achievement', 'succès',
  'walkthrough', 'tips', 'trick', 'cheat', 'secret', 'easter egg',
  'je bloque', "j'arrive pas", "j'y arrive pas", 'trop dur', 'impossible',
  'farm', 'grind', 'build', 'stratégie', 'tactique', 'deck', 'loadout',
  'où trouver', 'où est', 'comment avoir', 'comment obtenir',
  'rétro', 'retro', 'cheat code', 'code triche',
];

// Steam link ignoré si l'user demande explicitement une console non-PC
const CONSOLE_ONLY_KEYWORDS = ['ps5', 'ps4', 'ps3', 'playstation', 'xbox', 'switch', 'nintendo eshop'];

// Demandes de post/liste formaté → plus de tokens, livraison directe sans "j'arrive"
const POST_KEYWORDS = [
  'post', 'poste', 'prépare', 'prépares', 'compile', 'rédige',
  'fais un', 'fait moi', 'fait un', 'liste', 'liste-moi', 'sélection',
  'top 5', 'top 10', 'top 3', '5 jeux', '3 jeux', '10 jeux',
  'à surveiller', 'à ne pas manquer', 'à venir', 'les meilleurs', 'meilleurs jeux',
];

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

    // Tracker l'engagement sur les messages du bot
    if (add && reaction.message.author?.id === shared.discord?.user?.id) {
      try {
        await recordEngagement(reaction.message.id, 'reaction');
      } catch (err) {
        // Silent fail, engagement tracking ne doit pas bloquer
      }
    }

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
    const budgetProfile = getBudgetProfile();
    const fetched = await message.channel.messages.fetch({ limit: Math.max(budgetProfile.ctxLimit + 2, 5) });
    const contextLines = formatContext(fetched, message.id, budgetProfile.ctxLimit);
    const profile = await getMemberProfile(message.author.id);
    const toneInstruction = getToneInstruction(profile, message.author.username);
    const mood = refreshDailyMood();
    updateInternalStatesForSlot(slot);
    applyNaturalDecay();
    detectEmotionFromMessage(userQuery, { userId: message.author.id });

    // v0.12.0 : Refus émotionnel — vérifié AVANT tout le reste
    const refusal = await checkEmotionalRefusal(true); // true = mention directe
    if (refusal.shouldRefuse && !refusal.isSilent) {
      // Elle dit pourquoi elle ne répond pas
      try {
        await message.reply(refusal.message);
        await message.react('😶').catch(() => {});
      } catch (_) {}
      pushLog('SYS', `🚫 Refus émotionnel @mention [${refusal.type}] → ${message.author.username}`);
      return;
    }
    if (refusal.shouldRefuse && refusal.isSilent) {
      // Cooldown actif mais silencieux — juste une réaction
      await message.react('⏳').catch(() => {});
      pushLog('SYS', `🚫 Cooldown refus silencieux @mention → ${message.author.username}`);
      return;
    }

    // v0.16.0 : Excuse occupée (2% de chance en serveur) — après le refus émotionnel
    if (checkBusyExcuse(false)) {
      await triggerBusyExcuse(message, userQuery, slot, false);
      return;
    }

    // v0.6.0 : Check if Brainee should respond (autonomy logic)
    // For mentions, we check but still respect the urgent flag from caller
    const vibe = getDailyVibe();
    const internalState = getInternalState();
    const decision = await shouldRespond(slot, vibe, internalState.mentalLoad, userQuery, false, true);

    if (!decision.should) {
      try { await message.react('😴').catch(() => {}); } catch (_) {}
      pushLog('SYS', `🙅 Skip @mention (${decision.reason}): ${decision.message || ''}`);
      return;
    }

    // Record topic for fatigue tracking
    await recordMessageTopic(userQuery);

    // 💬 Court-circuit : invitation DM détectée (v0.8.6)
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
    const bondToneInstruction = getBondToneInstruction(bond, message.author.username);
    const emotionBlock = getEmotionalInjection();
    const temperamentBlock = getTemperamentInjection();
    let narrativeBlock = await getNarrativeContext();
    const weeklyBlock = await getWeeklyContext();
    if (weeklyBlock) narrativeBlock = `${weeklyBlock}\n${narrativeBlock}`;

    // v0.12.0 : Système de conviction — détecte l'insistance/contradiction
    const convictionResult = analyzeConviction(message.author.id, userQuery);
    const convictionBlock = convictionResult?.convictionBlock || '';

    // v0.12.0 : Lien singulier + arc de rejet
    const singularBlock = getSingularBondBlock(bond, message.author.username);
    const appreciationBlock = getAppreciationInjection(bond, message.author.username);

    // Détection de rejet du lien singulier
    const singularHolder = await (async () => {
      try { const { getSingularBondHolder } = require('../features/attachmentStages'); return await getSingularBondHolder(); } catch (_) { return null; }
    })();
    if (singularHolder === message.author.id && detectRejectionSignal(userQuery)) {
      await handleSingularBondRejection(message.author.id, message.author.username);
      pushLog('SYS', `💔 Signal de rejet détecté → ${message.author.username}`);
    }

    // Peurs : vérifier si le message déclenche une peur existentielle
    if (shared.fears) {
      shared.fears.checkTriggers(userQuery.toLowerCase()).catch(() => {});
    }

    // 📚 Mémoire narrative par membre (v0.8.0)
    const memberStories = await getMemberStories(message.author.id);
    const memberStoriesBlock = formatStoriesBlock(memberStories, message.author.username);

    // 💎 VIP tier (v0.8.0)
    const vipTier = getVipTier(bond);
    const vipBlock = getVipBlockForPrompt(vipTier, bond, message.author.username);

    // 🎯 Taste profile (v0.8.0)
    const tasteProfile = await getTasteProfile(message.author.id);
    const tasteBlock = formatTasteBlock(tasteProfile, message.author.username);

    // 🎭 Combos émotionnels (v0.8.1)
    const combosBlock = getEmotionCombosBlock(mood);

    // 🤍 Fenêtre de fragilité (v0.8.1) — si support détecté, on l'enregistre
    const vulnWindow = await getActiveWindow();
    const vulnBlock = getVulnerabilityBlock(vulnWindow);
    if (vulnWindow && detectSupport(userQuery)) {
      try { await recordSupportFromMember(message.author.id, message.author.username, userQuery); }
      catch (vErr) { pushLog('ERR', `Enregistrement soutien : ${vErr.message}`, 'error'); }
    }
    const channelMemory = await getChannelMemory(message.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntry = await getChannelDirectory(message.channelId);
    const channelTopic = shared.botConfig.conversations.channels.find(c => c.channelId === message.channelId)?.topic || message.channel.name;
    const intentBlock = getChannelIntentBlock(message.channel.name, channelTopic, dirEntry?.officialDescription || '');

    const taggedMembers = [...message.mentions.users.values()].filter(u => u.id !== shared.discord.user.id).map(u => '@' + u.username);
    const taggedBlock = taggedMembers.length > 0 ? `Membres tagués : ${taggedMembers.join(', ')}. Tu peux les évoquer naturellement SANS les re-tagger — ils ont déjà été notifiés.` : '';

    // 🔁 Anti-répétition lexicale — mots récents utilisés par Brainee dans ce salon
    const recentBraineeWords = extractRecentBraineeWords(fetched, 4, shared.discord.user?.id);
    const antiRepeatBlock = recentBraineeWords.length > 0
      ? `\n🔁 MOTS RÉCENTS À ÉVITER (tu les as utilisés dans tes derniers messages) : ${recentBraineeWords.join(', ')}. Utilise des synonymes ou reformule complètement.`
      : '';

    const needsYoutube = YOUTUBE_KEYWORDS.some(kw => userQuery.toLowerCase().includes(kw));
    let youtubeBlock = '';
    if (needsYoutube && require('../config').YOUTUBE_API_KEY) {
      try {
        const q = await extractYoutubeQuery(userQuery);
        const results = await searchYoutube(q, 3);
        if (results.length) youtubeBlock = '\n\nInfos web:\n' + results.map(r => `• [${r.title}](${r.url}) — *${r.channel}*`).join('\n');
      } catch (_) {}
    }

    const temporalBlock = getTemporalBlock();
    // 🔗 Contexte DM récents avec cette personne pour faire le lien serveur ↔ DM
    const dmCrossContext = await enrichServerWithDmContext(message.author.id, message.author.username).catch(() => '');
    const dynamicPrompt = `${temporalBlock}\n${toneInstruction}\n💞 LIEN : ${bondBlock}\n${bondToneInstruction}\n${vipBlock}\nHumeur du jour : ${mood}. ${getMoodInjection(mood)}\nVibe du jour : ${vibe.name} — ${vibe.desc}.\n${temperamentBlock}\n${emotionBlock}${combosBlock}${vulnBlock}\n${narrativeBlock}\n${memberStoriesBlock}\n${tasteBlock}\n${memoryBlock}\n${intentBlock}${singularBlock}${convictionBlock}${appreciationBlock}${antiRepeatBlock}\nContexte #${message.channel.name} :\n${contextLines}\n${dmCrossContext}\n${taggedBlock}\nTu réponds à ${message.author.username} via reply Discord — pas besoin de re-tagger, la notification part toute seule.\n${LIGHT_TAG_CLAUSE}`;

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
    const { getContextualMaxTokens } = require('../utils');
    // 🖼️ Captation images jointes par l'utilisateur
    const userImages = extractImageAttachments(message);
    const imgInstruction = userImages.length ? getImageCommentInstruction(userImages.length) : '';
    const lowerQuery = userQuery.toLowerCase();
    const isPostRequest = POST_KEYWORDS.some(kw => lowerQuery.includes(kw));
    const _baseMentionTokens = isPostRequest ? 900 : getContextualMaxTokens(userQuery, { defaultShort: 110, extended: 240 });
    const mentionMaxTokens = adjustMaxTokens(Math.floor(_baseMentionTokens * budgetProfile.maxTokensMult));

    // Contexte du message auquel répond l'utilisateur (reply Discord)
    let replyRefContext = '';
    if (message.reference?.messageId) {
      const refMsg = fetched.get(message.reference.messageId);
      if (refMsg) {
        const refAuthor = refMsg.author.bot ? 'Brainee' : refMsg.author.username;
        const refContent = (refMsg.content || '').slice(0, 150).replace(/\n/g, ' ');
        replyRefContext = `\n[Ce message est une réponse à ce que ${refAuthor} a dit : "${refContent}${refContent.length >= 150 ? '...' : ''}"]`;
      }
    }

    const userTextPrompt = isPostRequest
      ? `${message.author.username} demande : "${userQuery}"\nUtilise tes outils de recherche pour trouver les infos réelles, puis livre le post complet directement dans ce message. Format Markdown Discord (**, [texte](url)). Inclus les liens. Ne dis pas que tu vas chercher — cherche et envoie maintenant.`
      : `${message.author.username} dit : "${userQuery || '(image envoyée sans texte)'}"\nRéponds court (1-2 phrases) sauf si le sujet mérite vraiment plus.${replyRefContext}`;
    const userContent = buildMultimodalUserContent(userTextPrompt, userImages);
    const availableTools = getAvailableTools();
    const isNewsQuery = availableTools.length > 0
      && (isPostRequest
        || NEWS_KEYWORDS.some(kw => lowerQuery.includes(kw))
        || GAME_INFO_KEYWORDS.some(kw => lowerQuery.includes(kw))
        || HELP_KEYWORDS.some(kw => lowerQuery.includes(kw)));

    let reply, usage;
    let usedToolCall = false;
    if (isNewsQuery) {
      try {
        ({ text: reply, usage } = await callClaudeWithTools(
          dynamicPrompt + imgInstruction,
          [{ role: 'user', content: userContent }],
          getAvailableTools(),
          gamingToolHandler,
          { maxTokens: mentionMaxTokens, cachedPrefix: BOT_PERSONA_CONVERSATION, model: budgetProfile.model }
        ));
        usedToolCall = true;
        pushLog('SYS', `🔍 Tool use Tavily → @mention ${message.author.username}`, 'success');
      } catch (toolErr) {
        pushLog('DBG', `Tool use échoué, fallback callClaude: ${toolErr.message}`, 'debug');
        ({ text: reply, usage } = await callClaude(dynamicPrompt + imgInstruction, userContent, mentionMaxTokens, BOT_PERSONA_CONVERSATION, budgetProfile.model));
      }
    } else {
      ({ text: reply, usage } = await callClaude(dynamicPrompt + imgInstruction, userContent, mentionMaxTokens, BOT_PERSONA_CONVERSATION, budgetProfile.model));
    }
    if (userImages.length) pushLog('SYS', `🖼️ ${userImages.length} image(s) lues (mention ${message.author.username})`);
    await recordTokenUsage(message.author.id, message.author.username, usage.inputTokens, usage.outputTokens, 'mention_reply');
    const replyResolved = resolveMentionsInText(reply, message.guild);
    if (reactionRoll < 0.35) await message.react(getRandomReaction(userQuery + reply)).catch(() => {});

    const isConsoleFocused = CONSOLE_ONLY_KEYWORDS.some(kw => lowerQuery.includes(kw));
    let steamBlock = '';
    if (!usedToolCall && !isConsoleFocused && GAMING_KEYWORDS.some(kw => `${userQuery} ${reply}`.toLowerCase().includes(kw))) {
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
    const updatedBond = await applyInteractionToBond(message.author.id, message.author.username, userQuery);

    // v0.12.0 : Vérifier la promotion au lien singulier (stade 5) après chaque interaction
    if (updatedBond && updatedBond.baseAttachment > 83) {
      tryPromoteSingularBond(message.author.id, updatedBond).catch(() => {});
    }

    // 💞 Sync deepBonds (BRAINEE-LIVING) — jamais écrit depuis les @mentions sinon
    if (shared.relationships) {
      const mentionEventType = detectSupport(userQuery) ? 'support' : 'interaction';
      shared.relationships.updateBond(message.author.id, {
        type: mentionEventType,
        description: `@mention de ${message.author.username}`,
      }).catch(() => {});
    }

    // v0.12.0 : Mettre à jour les besoins sociaux dans le module desires
    if (shared.desires) {
      shared.desires.updateNeeds().catch(() => {});
    }
    // Log pour le bridge DM/Serveur (côté serveur)
    try {
      await logMessageForBridge(message.author.id, message.author.username, userQuery, message.channelId, message.channel.name, 'server');
    } catch (_) {}

    // 💬 Proposal DM sortante (v0.8.6) : Brainee propose de continuer en DM (faible proba)
    await maybeProposeInDm(message, userQuery, bond).catch(() => {});

    // 📚 Détection narrative — on enregistre les stories pertinentes (max 1 par message)
    try {
      const detected = detectStoriesFromMessage(userQuery);
      const best = detected.sort((a, b) => b.confidence - a.confidence)[0];
      if (best && best.confidence >= 0.5) {
        await addMemberStory(message.author.id, message.author.username, best);
      }
    } catch (storyErr) { pushLog('ERR', `Détection histoire : ${storyErr.message}`, 'error'); }

    // 🎯 Mise à jour goûts depuis le message
    try { await updateTasteFromMessage(message.author.id, message.author.username, userQuery); }
    catch (tasteErr) { pushLog('ERR', `Mise à jour goûts : ${tasteErr.message}`, 'error'); }

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
    } catch (hfErr) { pushLog('ERR', `Enregistrement hyperFocus : ${hfErr.message}`, 'error'); }

    pushLog('SYS', `💬 @mention → ${message.author.username} (mood: ${mood})`, 'success');
  } catch (err) { pushLog('ERR', `handleMentionReply échoué : ${err.message}`, 'error'); }
}

function registerMessageHandlers() {
  // Spam detector — serveur uniquement, s'exécute avant tout autre traitement
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    await checkAndHandleSpam(message);
  });

  // DM handler
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.channel.type !== 1) return;
    if (!ANTHROPIC_API_KEY) return;
    const rawContent = message.content?.trim();
    const dmImages = extractImageAttachments(message);
    if (!rawContent && dmImages.length === 0) return;
    // Si juste image sans texte, on remplace par un marqueur pour que le reste du code fonctionne
    const userContent = rawContent || (dmImages.length ? `[image envoyée]` : '');

    // 🎮 Pendu — interception si partie active (lettre) ou commande stop
    {
      const lower = userContent.toLowerCase().trim();
      const isStop = lower === '!pendu stop';
      const isGuess = isHangmanActive(message.author.id) && /^[a-zA-Z]$/.test(userContent.trim());
      if (isStop || isGuess) {
        await handleHangmanDm(message, userContent.trim()).catch(err => pushLog('ERR', `Pendu: ${err.message}`, 'error'));
        return;
      }
    }

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
      const bondToneInstruction = getBondToneInstruction(bond, message.author.username);
      const emotionBlock = getEmotionalInjection();
      const temperamentBlock = getTemperamentInjection();

      // 📚 Stories du membre (DM = contexte privilégié, on les utilise toujours)
      const memberStories = await getMemberStories(message.author.id);
      const memberStoriesBlock = formatStoriesBlock(memberStories, message.author.username);

      // 🌐 Mémoire narrative du serveur — pour faire le lien DM ↔ vie serveur
      const dmNarrativeBlock = await getNarrativeContext().catch(() => '');

      // 💎 VIP tier
      const vipTier = getVipTier(bond);
      const vipBlock = getVipBlockForPrompt(vipTier, bond, message.author.username);

      // 🔓 Mode dialogue libre — DM uniquement, inner_circle uniquement
      const isLibreMode = shared.botConfig.dialogueLibre?.enabled === true
        && vipTier?.key === 'inner_circle';
      const dmPersona = isLibreMode ? `${BOT_PERSONA_DM}\n\n${BOT_PERSONA_DM_LIBRE}` : BOT_PERSONA_DM;
      if (isLibreMode) pushLog('SYS', `🔓 Mode libre actif → DM ${message.author.username}`);

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

      // 🚫 Refus émotionnel en DM (manquait — ne s'appliquait qu'aux @mentions)
      const dmRefusal = await checkEmotionalRefusal(true); // true = interaction directe, seuils plus tolérants
      if (dmRefusal.shouldRefuse && !dmRefusal.isSilent) {
        try { await message.reply(dmRefusal.message); } catch (_) {}
        pushLog('SYS', `🚫 Refus émotionnel DM [${dmRefusal.type}] → ${message.author.username}`);
        return;
      }
      if (dmRefusal.shouldRefuse && dmRefusal.isSilent) {
        pushLog('SYS', `🚫 Cooldown refus silencieux DM → ${message.author.username}`);
        return;
      }

      // 💤 v0.16.0 : Excuse occupée (4% de chance) — après le refus émotionnel
      if (checkBusyExcuse(true)) {
        await triggerBusyExcuse(message, userContent, slot, true);
        return;
      }

      // Enrichir le DM avec le contexte serveur (faire la liaison DM ↔ Serveur)
      const enrichedUserContent = await enrichDMWithServerContext(message.author.id, message.author.username, userContent);

      // 🏷️ Topic fatigue — tracké aussi en DM (manquait)
      try { await recordMessageTopic(enrichedUserContent || userContent); } catch (_) {}

      const dmTemporalBlock = getTemporalBlock();
      const dmImgInstruction = dmImages.length ? getImageCommentInstruction(dmImages.length) : '';
      const penduInstruction = `\n\n🎮 PENDU : Tu peux proposer spontanément une partie de pendu RPG/JRPG, ou accepter si l'utilisateur en demande une. Si tu décides de lancer le jeu, inclus exactement \`[PENDU]\` sur une ligne seule dans ta réponse — le jeu démarre automatiquement. N'explique pas ce marker, fais juste comme si tu lançais la partie naturellement.`;
      const dynamicPrompt = `${dmTemporalBlock}\n${toneInstruction}\n💞 LIEN DM : ${bondBlock}\n${bondToneInstruction}\n${vipBlock}\n\nHumeur du jour : ${mood}. ${getMoodInjection(mood)}\n${temperamentBlock}\n${emotionBlock}${combosBlock}${vulnBlock}\n${memberStoriesBlock}\n${tasteBlock}\n${dmNarrativeBlock}\n\n${historyBlock ? `Historique de vos échanges précédents :\n${historyBlock}` : 'Premier échange avec cette personne.'}\n\nTu es en message privé avec ${message.author.username}. Réponds de façon naturelle et suivie. Si une discussion du serveur est pertinente pour ce DM, fais le lien naturellement sans le signaler explicitement.${dmImgInstruction}${penduInstruction}`;
      const { getContextualMaxTokens } = require('../utils');
      const dmAvailableTools = getAvailableTools();
      const dmQueryText = (enrichedUserContent || userContent || '').toLowerCase();
      const dmIsPostRequest = POST_KEYWORDS.some(kw => dmQueryText.includes(kw));
      const dmBudgetProfile = getBudgetProfile();
      const _baseDmTokens = dmIsPostRequest ? 900 : getContextualMaxTokens(userContent || '', { defaultShort: 130, extended: 320, isDM: true });
      const dmMaxTokens = adjustMaxTokens(Math.floor(_baseDmTokens * dmBudgetProfile.maxTokensMult));
      const userTextOnlyPrompt = dmIsPostRequest
        ? `${message.author.username} demande : "${enrichedUserContent || userContent}"\nUtilise tes outils de recherche pour trouver les infos réelles, puis livre le post complet directement dans ce message. Format Markdown Discord. Inclus les liens. Ne dis pas que tu vas chercher — cherche et envoie maintenant.`
        : `${message.author.username} : "${enrichedUserContent || '(image envoyée sans texte)'}"`;
      const userPrompt = buildMultimodalUserContent(userTextOnlyPrompt, dmImages);
      // Court signal de lecture (0.5-1s) pendant que Claude réfléchit
      await simulateTyping(message.channel, 500 + Math.random() * 500);
      const dmIsNewsQuery = dmAvailableTools.length > 0
        && (dmIsPostRequest
          || NEWS_KEYWORDS.some(kw => dmQueryText.includes(kw))
          || GAME_INFO_KEYWORDS.some(kw => dmQueryText.includes(kw))
          || HELP_KEYWORDS.some(kw => dmQueryText.includes(kw)));

      let rawReply, usage;
      let dmUsedToolCall = false;
      if (dmIsNewsQuery) {
        try {
          ({ text: rawReply, usage } = await callClaudeWithTools(
            dynamicPrompt,
            [{ role: 'user', content: userPrompt }],
            dmAvailableTools,
            gamingToolHandler,
            { maxTokens: dmMaxTokens, cachedPrefix: dmPersona, model: dmBudgetProfile.model }
          ));
          dmUsedToolCall = true;
          pushLog('SYS', `🔍 Tool use Tavily → DM ${message.author.username}`, 'success');
        } catch (toolErr) {
          pushLog('DBG', `Tool use DM échoué, fallback: ${toolErr.message}`, 'debug');
          ({ text: rawReply, usage } = await callClaude(dynamicPrompt, userPrompt, dmMaxTokens, dmPersona, dmBudgetProfile.model));
        }
      } else {
        ({ text: rawReply, usage } = await callClaude(dynamicPrompt, userPrompt, dmMaxTokens, dmPersona, dmBudgetProfile.model));
      }
      if (dmImages.length) pushLog('SYS', `🖼️ ${dmImages.length} image(s) lues (DM ${message.author.username})`);
      const hasPenduTrigger = rawReply.includes('[PENDU]');
      const reply = rawReply.replace(/\[PENDU\]/g, '').trim();
      await recordTokenUsage(message.author.id, message.author.username, usage.inputTokens, usage.outputTokens, 'dm_reply');

      const dmIsConsoleFocused = CONSOLE_ONLY_KEYWORDS.some(kw => dmQueryText.includes(kw));
      let dmSteamBlock = '';
      if (!dmUsedToolCall && !dmIsConsoleFocused && GAMING_KEYWORDS.some(kw => `${userContent} ${reply}`.toLowerCase().includes(kw))) {
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
      // v0.16.0 : Typing proportionnel à la longueur de la réponse
      await simulateDmTyping(message.channel, reply.length);
      if (Math.random() < 0.15 && reply.length > 80) { await sendHuman(message.channel, reply + dmSteamBlock, null, { bond, isDM: true }); }
      else {
        const { humanize, maybeAddOccasionalEmoji } = require('../bot/humanize');
        const { getHumanizationSignal } = require('../bot/emotions');
        const { getBondSignal } = require('../db/memberBonds');
        let humanized = humanize(stripEmDash(reply), {
          emotionalSignal: getHumanizationSignal(),
          bondSignal: getBondSignal(bond),
          mood,
          slotStatus: slot.status,
        });
        humanized = maybeAddOccasionalEmoji(humanized, { isDM: true });
        await message.reply(humanized + dmSteamBlock);
      }
      await appendDmMessage(message.author.id, message.author.username, 'user', userContent);
      await appendDmMessage(message.author.id, message.author.username, 'assistant', reply);
      await updateMemberProfile(message.author.id, message.author.username, userContent);
      await applyInteractionToBond(message.author.id, message.author.username, userContent);

      // 💞 Sync deepBonds (BRAINEE-LIVING) — collection vide sinon car jamais écrite en DM
      if (shared.relationships) {
        const deepEventType = (vulnWindow && detectSupport(userContent)) ? 'support' : 'interaction';
        shared.relationships.updateBond(message.author.id, {
          type: deepEventType,
          description: `DM avec ${message.author.username}`,
        }).catch(() => {});
      }

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

      if (hasPenduTrigger) {
        await launchHangmanFromDm(message).catch(err => pushLog('ERR', `Pendu launch: ${err.message}`, 'error'));
      }
      pushLog('SYS', `📨 DM répondu à ${message.author.username} (mood: ${mood})`, 'success');
    } catch (err) { pushLog('ERR', `DM handler échoué pour ${message.author.username} : ${err.message}`, 'error'); }
  });

  // @mention handler v0.2.6 — urgence + vibe + relance demain
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || message.guild.id !== GUILD_ID) return;
    if (!shared.discord.user || !message.mentions.has(shared.discord.user)) return;
    const userQuery = message.content.replace(/<@!?\d+>/g, '').trim();
    // Si pas de texte ET pas d'image jointe → on ignore. Sinon on continue (image seule = ok)
    const hasImageAttachment = extractImageAttachments(message).length > 0;
    if (!userQuery && !hasImageAttachment) return;

    // Absence : répond seulement 35% du temps (comme jeter un œil à son tel en passant)
    if (isAbsent() && Math.random() > 0.35) {
      pushLog('SYS', `📱 @mention pendant absence → ignorée (${message.author.username})`);
      return;
    }

    // E3 — Engagement actif : @mention autorisée mais retardée (min 15 min)
    if (shared.commitmentUntil && Date.now() < shared.commitmentUntil) {
      const remaining    = shared.commitmentUntil - Date.now();
      const commitDelay  = Math.max(15 * 60 * 1000, remaining) + Math.random() * 10 * 60 * 1000;
      await message.react('⏳').catch(() => {});
      pushLog('SYS', `⏳ @mention pendant engagement → retardée ${Math.round(commitDelay / 60000)} min → ${message.author.username}`);
      setTimeout(() => handleMentionReply(message, userQuery), commitDelay);
      return;
    }

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

  // 💬 Réponse à une proposal DM de Brainee (v0.8.6)
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

  // Track engagement when people reply to bot messages
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || message.guild.id !== GUILD_ID) return;
    if (!message.reference) return;
    try {
      const repliedTo = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (repliedTo && repliedTo.author?.id === shared.discord?.user?.id) {
        await recordEngagement(repliedTo.id, 'reply');
      }
    } catch (_) {
      // Silent fail
    }
  });

  // v0.12.0 : Listener threads — détection de création de thread + messages dans threads
  shared.discord.on(Events.ThreadCreate, async (thread) => {
    if (!thread.guildId || thread.guildId !== GUILD_ID) return;
    pushLog('SYS', `🧵 Thread créé : "${thread.name}" dans #${thread.parent?.name || 'inconnu'}`);
    // On ne réagit pas automatiquement à la création — le channelWatcher s'en charge
  });

  // Messages dans les threads — déclenchement du refus émotionnel si besoin
  shared.discord.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || message.guild.id !== GUILD_ID) return;
    if (!message.channel.isThread()) return;
    // Si mentionnée dans un thread, traiter comme une mention classique
    if (shared.discord.user && message.mentions.has(shared.discord.user)) return; // Géré par le handler @mention
    // Conviction dans les threads si réponse au bot
    if (message.reference) {
      try {
        const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (refMsg?.author?.id === shared.discord.user?.id) {
          await recordEngagement(refMsg.id, 'thread_reply').catch(() => {});
          // Analyser conviction dans les threads aussi
          const conv = analyzeConviction(message.author.id, message.content || '');
          if (conv?.isShutdown) pushLog('SYS', `💪 Conviction shutdown (thread) → ${message.author.username}`);
        }
      } catch (_) {}
    }

    // v0.13.0 : Lecture réactive des threads — 30% de chance de vérifier si elle veut rejoindre
    // Le channelWatcher couvre le proactif (toutes les 4 min), ceci couvre le réactif (sur nouveau message)
    if (Math.random() < 0.55) {
      const { maybeRespondToThreadMessage } = require('../features/channelWatcher');
      maybeRespondToThreadMessage(message.channel).catch(() => {});
    }
  });

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
      logMemberJoin(member).catch(() => {});
    } catch (err) { pushLog('ERR', `Arrivée échouée : ${err.message}`, 'error'); }
  });

  // Member leave
  shared.discord.on(Events.GuildMemberRemove, async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    logMemberLeave(member).catch(() => {});
  });

  // Member banned
  shared.discord.on(Events.GuildBanAdd, async (ban) => {
    if (ban.guild.id !== GUILD_ID) return;
    logMemberBan(ban.guild, ban.user, ban.reason).catch(() => {});
  });
}

function registerSlashHandlers() {
  shared.discord.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'affinite') {
      await handleAffinityCommand(interaction).catch(err =>
        pushLog('ERR', `handleAffinityCommand: ${err.message}`, 'error')
      );
    }
  });
}

module.exports = { registerDiscordEvents, registerMessageHandlers, registerSlashHandlers, handleMentionReply, handleReaction };
