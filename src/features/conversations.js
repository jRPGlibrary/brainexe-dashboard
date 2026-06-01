const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY, MIN_GAP_ANY_POST } = require('../config');
const { callClaude, callClaudeWithTools } = require('../ai/claude');
const { gamingToolHandler, getAvailableTools } = require('../ai/tavilySearch');
const { GAMING_KEYWORDS } = require('../bot/keywords');
const { getMemberProfile, updateMemberProfile, getToneInstruction } = require('../db/members');
const { getChannelMemory, formatChannelMemoryBlock, enrichChannelMemory } = require('../db/channelMem');
const { getChannelDirectory } = require('../db/channelDir');
const { BOT_PERSONA, BOT_PERSONA_CONVERSATION } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getCurrentSlot, getRandomMode, getSlotIntervalMs, getTemporalBlock } = require('../bot/scheduling');
const { getDailyVibe } = require('../bot/adaptiveSchedule');
const { getChannelIntentBlock, getModeInjectionForChannel } = require('../bot/channelIntel');
const { simulateTyping, sendHuman, resolveMentionsInText } = require('../bot/messaging');
const { getContextualMaxTokens, joinBlocks } = require('../utils');
const {
  getEmotionalInjection, getTemperamentInjection, detectEmotionFromMessage,
  updateInternalStatesForSlot, applyNaturalDecay, adjustMaxTokens, getInternalState,
} = require('../bot/emotions');
const { ensureMemberBond, applyInteractionToBond, describeBond, getBondToneInstruction } = require('../db/memberBonds');
const { NO_TAG_CLAUSE, LIGHT_TAG_CLAUSE, GAMING_FACTS_CLAUSE } = require('./greetings');
const { formatContext } = require('./context');
const {
  getConvDailyCount, getConvMaxPerDay, resetDailyCountIfNeeded,
  updateConvStats, getRankedChannels, getGeneralChannel,
  hasUnansweredLastPost, isDeepTopicChannel,
  isChannelDeadThisWeek,
  isMonologueChannel, countConsecutiveBotPosts,
} = require('./convStats');
const { shouldRespond, recordMessageTopic } = require('./decisionLogic');
const { getRecentTopicCount } = require('../db/topicFatigue');
const { detectAndSetPresenceFromReply } = require('./presenceManager');
const { getNarrativeContext, getWeeklyContext } = require('../db/narrativeMemory');
const { getCachedBlocks, setCacheBlocks } = require('../bot/dailyCache');
const { getChannelVerbosity, recordBotMessage } = require('../db/messageEngagement');
const { recordCrossChannelPost, getCrossChannelContext } = require('../db/crossChannelMem');
const { isAbsent, maybeStartAbsence } = require('./absence');
const { record: recordChannelPost, getLastPost, isOverLimit, COOLDOWN_MS: CHANNEL_COOLDOWN_MS, MAX_POSTS } = require('../bot/channelPostTracker');
const { getBudgetMode } = require('../ai/budget');
const { extractImageAttachments, loadImages, buildMultimodalUserContent, getImageCommentInstruction } = require('./imageAttachments');
const { enrichServerWithDmContext, logMessageForBridge } = require('./dmServerBridge');

const MAX_CONV_ATTEMPTS = 10;
const FALLBACK_NO_INSIST_MS = 6 * 60 * 60 * 1000;

async function evaluateChannelForConv(ch, channelResolver, { relaxed = false } = {}) {
  if (isOverLimit(ch.channelId)) {
    return { ok: false, reason: `limite ${MAX_POSTS} posts/3h atteinte` };
  }
  const lastPost = getLastPost(ch.channelId);
  if (lastPost && Date.now() - lastPost < CHANNEL_COOLDOWN_MS) {
    const elapsed = Math.round((Date.now() - lastPost) / 60000);
    return { ok: false, reason: `cooldown 2h canal (${elapsed}min écoulées)` };
  }
  if (!relaxed) {
    if (await hasUnansweredLastPost(ch.channelId, channelResolver)) {
      return { ok: false, reason: 'dernier post sans réponse humaine (no-insist 24h)' };
    }
  } else {
    const last = shared.botConfig.conversations.lastPostByChannel || {};
    const lastTs = last[ch.channelId] || 0;
    if (lastTs && Date.now() - lastTs < FALLBACK_NO_INSIST_MS) {
      const channel = await channelResolver(ch.channelId);
      if (channel?.messages) {
        try {
          const msgs = await channel.messages.fetch({ limit: 20 });
          const arr = [...msgs.values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp);
          const botId = shared.discord?.user?.id;
          const lastBotIdx = arr.findIndex(m => m.author?.id === botId);
          if (lastBotIdx !== -1) {
            const humanAfter = arr.slice(0, lastBotIdx).some(m => !m.author?.bot);
            if (!humanAfter) return { ok: false, reason: 'dernier post sans réponse (fallback 6h)' };
          }
        } catch (_) {}
      }
    }
  }
  if (await isMonologueChannel(ch.channelId, channelResolver)) {
    return { ok: false, reason: 'salon monologue (Brainee parle seule)' };
  }
  try {
    const channel = await channelResolver(ch.channelId);
    if (channel?.messages) {
      const msgs = await channel.messages.fetch({ limit: 20 });
      const hasHuman = [...msgs.values()].some(m => !m.author?.bot);
      if (!hasHuman) return { ok: false, reason: 'aucun message humain récent (skip tokens vides)' };
    }
  } catch (_) {}
  const consecutive = await countConsecutiveBotPosts(ch.channelId, channelResolver);
  if (consecutive >= 1) {
    return { ok: false, reason: `Brainee a déjà parlé en dernier (${consecutive} post(s) non répondu(s))` };
  }
  if (!relaxed && await isChannelDeadThisWeek(ch.channelId, channelResolver)) {
    return { ok: false, reason: 'calme plat (limite atteinte)' };
  }
  return { ok: true, reason: null };
}

async function postConvInChannel(ch, channel, guild, slot, { fallback = false } = {}) {
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
  let emotionBlock, temperamentBlock, narrativeBlock;
  const cached = getCachedBlocks();
  if (cached) {
    emotionBlock = cached.emotionalBlock;
    temperamentBlock = cached.temperamentBlock;
    narrativeBlock = cached.narrativeBlock;
  } else {
    emotionBlock = getEmotionalInjection();
    temperamentBlock = getTemperamentInjection();
    narrativeBlock = await getNarrativeContext();
    const weeklyBlock = await getWeeklyContext();
    if (weeklyBlock) narrativeBlock = `${weeklyBlock}\n${narrativeBlock}`;
    setCacheBlocks(emotionBlock, temperamentBlock, narrativeBlock);
  }
  let contextBlock = '';
  let recentCtxStr = '';
  try {
    const msgs = await channel.messages.fetch({ limit: 8 });
    recentCtxStr = formatContext(msgs, null, 8);
    if (recentCtxStr.length > 20) contextBlock = `Contexte récent:\n${recentCtxStr}`;
  } catch (_) {}
  const crossChannelBlock = await getCrossChannelContext(ch.channelId);
  const verbosity = await getChannelVerbosity(ch.channelId);
  const verbosityInstruct = verbosity.shouldBePavé
    ? `\nCe salon aime les messages détaillés (engagement: ${verbosity.avgEngagement}/5). Va-y, sois bavarde si tu veux.`
    : `\nCe salon préfère les messages courts et directs. Concis > pavé. Max 3 phrases vraiment courtes.`;

  const deepInject = isDeep
    ? `\nCONTEXTE SALON : c'est un salon de thématique profonde (${channel.name}). Lance un angle vraiment fouillé, qui donne envie de creuser. Pas de question générique. Tu peux être plus précise, citer un détail, un souvenir, un mécanisme, une référence. Laisse l'entrée ouverte mais pas vague. Si personne ne rebondit, c'est ok — tu n'insistes pas.`
    : '';

  const fallbackInject = fallback
    ? `\nCONTEXTE : tu reviens au général parce que les autres salons étaient calmes. Parle naturellement de tout et rien — un truc qui te traverse, une remarque sur ta journée, une mini-question légère. Pas de "j'ai rien trouvé à dire ailleurs", reste fluide.`
    : '';

  const maxTokens = verbosity.shouldBePavé
    ? adjustMaxTokens(isDeep ? 220 : 160)
    : adjustMaxTokens(isDeep ? 130 : 85);

  // Anti-gaming-overload : pivot forcé si gaming > 3 échanges dans les 3 dernières heures
  const [_g1, _g2, _g3] = await Promise.all([
    getRecentTopicCount('gaming-general', 3),
    getRecentTopicCount('elden ring', 3),
    getRecentTopicCount('rpg', 3),
  ]);
  const _gamingCount = _g1 + _g2 + _g3;
  const gamingDiversifyInject = _gamingCount >= 3
    ? `\n⚠️ DIVERSIFICATION OBLIGATOIRE : gaming mentionné ${_gamingCount}× ces 3 dernières heures. Lance un autre sujet — films, musique, actualité, vie réelle, tech, humeur, ou culture. Aucune référence aux jeux vidéo dans ce message.`
    : '';

  const { text: content } = await callClaude(
    joinBlocks(
      getTemporalBlock(),
      `Humeur : ${mood}. ${getMoodInjection(mood)}`,
      `Vibe du jour : ${vibe.name} — ${vibe.desc}.`,
      temperamentBlock,
      emotionBlock,
      memoryBlock,
      narrativeBlock,
      intentBlockC,
      modeBlock,
      deepInject,
      fallbackInject,
      verbosityInstruct,
      gamingDiversifyInject,
      crossChannelBlock,
      NO_TAG_CLAUSE + GAMING_FACTS_CLAUSE,
      contextBlock,
    ),
    `Direct. Adapte-toi au salon. Pas de @ — c'est un lance-conv ambiant.`,
    maxTokens,
    BOT_PERSONA
  );
  const contentResolved = resolveMentionsInText(content, guild);
  await simulateTyping(channel, 1000 + Math.random() * 2000);
  const sentMsg = await channel.send(contentResolved);
  shared.lastAnyBotPostTime = Date.now();
  recordChannelPost(ch.channelId);
  recordCrossChannelPost(ch.channelId, ch.channelName, contentResolved).catch(() => {});
  await updateConvStats(ch.channelId);
  recordBotMessage(sentMsg.id, ch.channelId, mode.name, contentResolved.length).catch(() => {});
  if (recentCtxStr) enrichChannelMemory(ch.channelId, ch.channelName, ch.topic || '', recentCtxStr).catch(() => {});
  const tag = fallback ? '🔁 Conv (fallback général)' : '💬 Conv';
  pushLog('SYS', `${tag} [${mode.name}] ${ch.channelName} [${slot.label}] (${getConvDailyCount()}/${getConvMaxPerDay()})`, 'success');
  broadcast('conversation', { channel: ch.channelName, time: new Date().toLocaleTimeString('fr-FR'), mode: mode.name, slot: slot.label, dayCount: getConvDailyCount(), fallback });
  return true;
}

async function postRandomConversation() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled) return;
  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;
  await resetDailyCountIfNeeded();
  if (getConvDailyCount() >= getConvMaxPerDay()) return;
  if (Date.now() - shared.lastAnyBotPostTime < getSlotIntervalMs(slot)) return;
  if (!ANTHROPIC_API_KEY) return;
  const _budgetMode = getBudgetMode();
  if (_budgetMode !== 'normal') { pushLog('SYS', `💰 Conv skip — budget ${_budgetMode}`); return; }

  if (isAbsent()) return;

  const _skipConvProba = { wakeup: 0, active: 0.10, lunch: 0.15, productive: 0.15, transition: 0.20, gaming: 0.25, latenight: 0.30 };
  const _convSkip = _skipConvProba[slot.status] ?? 0.15;
  if (Math.random() < _convSkip) { pushLog('SYS', `🌫️ Vraie absence (skip lance-conv ${Math.round(_convSkip * 100)}%)`); return; }

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channelResolver = async (id) => {
      const g = await shared.discord.guilds.fetch(GUILD_ID);
      await g.channels.fetch();
      return g.channels.cache.get(id);
    };

    const _slotKey = slot.status || slot.label || '';
    const absencePhrase = _slotKey !== 'wakeup' ? await maybeStartAbsence(_slotKey) : null;
    if (absencePhrase) {
      const general = getGeneralChannel();
      if (general) {
        const genCh = guild.channels.cache.get(general.channelId);
        if (genCh) {
          try {
            await simulateTyping(genCh, 500 + Math.random() * 1000);
            await genCh.send(absencePhrase);
            shared.lastAnyBotPostTime = Date.now();
            recordChannelPost(general.channelId);
            pushLog('SYS', `🌙 Absence annoncée dans #${general.channelName} : "${absencePhrase}"`, 'success');
          } catch (_) {}
        }
      }
      return;
    }

    const candidates = getRankedChannels({ excludeGeneral: true }).slice(0, MAX_CONV_ATTEMPTS);
    let skipped = 0;
    for (const ch of candidates) {
      const channel = guild.channels.cache.get(ch.channelId);
      if (!channel) continue;
      const evalRes = await evaluateChannelForConv(ch, channelResolver, { relaxed: false });
      if (!evalRes.ok) {
        pushLog('SYS', `🔇 Skip ${ch.channelName} — ${evalRes.reason}`);
        skipped++;
        continue;
      }
      try {
        await postConvInChannel(ch, channel, guild, slot, { fallback: false });
        return;
      } catch (err) {
        pushLog('ERR', `Lance-conv échouée sur ${ch.channelName} : ${err.message}`, 'error');
        return;
      }
    }

    const general = getGeneralChannel();
    if (!general) {
      pushLog('SYS', `🤐 Aucun salon postable (${skipped} skips) — pas de général configuré`);
      return;
    }
    const generalChannel = guild.channels.cache.get(general.channelId);
    if (!generalChannel) {
      pushLog('SYS', `🤐 Général introuvable côté Discord (${skipped} skips)`);
      return;
    }
    const fallbackEval = await evaluateChannelForConv(general, channelResolver, { relaxed: true });
    if (!fallbackEval.ok) {
      pushLog('SYS', `🤐 Fallback général skip — ${fallbackEval.reason} (${skipped} skips avant)`);
      return;
    }
    pushLog('SYS', `🔁 Fallback général après ${skipped} skip(s)`);
    try {
      await postConvInChannel(general, generalChannel, guild, slot, { fallback: true });
    } catch (err) {
      pushLog('ERR', `Lance-conv fallback échouée : ${err.message}`, 'error');
    }
  } catch (err) {
    pushLog('ERR', `Lance-conv échouée : ${err.message}`, 'error');
  }
}

async function replyToConversations() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !cfg.canReply || !ANTHROPIC_API_KEY) return;
  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;
  if (shared.goodnightSent) return;
  if (isAbsent()) return;
  const _skipReplyProba = { wakeup: 0.10, active: 0.20, lunch: 0.25, productive: 0.25, transition: 0.30, gaming: 0.40, latenight: 0.50 };
  const _replySkip = _skipReplyProba[slot.status] ?? 0.30;
  if (Math.random() < _replySkip) { pushLog('SYS', `🌫️ Vraie absence (skip silencieux ${Math.round(_replySkip * 100)}%)`); return; }
  const active = cfg.channels.filter(c => c.enabled);
  if (!active.length) return;
  const ch = active[Math.floor(Math.random() * active.length)];
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel) return;
    const msgs = await channel.messages.fetch({ limit: 10 });
    const msgArray = [...msgs.values()];
    if (!msgArray.length) return;
    const lastMsg = msgArray[0];
    if (lastMsg.author.bot) return;
    const age = Date.now() - lastMsg.createdTimestamp;
    if (age < 30 * 60 * 1000 || age > 90 * 60 * 1000) return;
    if (Date.now() - shared.lastAnyBotPostTime < MIN_GAP_ANY_POST) return;

    if (isOverLimit(ch.channelId)) {
      pushLog('SYS', `🔇 Skip reply ${ch.channelName} — limite ${MAX_POSTS} posts/3h`);
      return;
    }
    const chLastPost = getLastPost(ch.channelId);
    let softReply = false;
    if (chLastPost && Date.now() - chLastPost < CHANNEL_COOLDOWN_MS) {
      const msgArr = [...msgs.values()];
      const cutoff30 = Date.now() - 30 * 60 * 1000;
      const botId = shared.discord?.user?.id;
      const recentHumans = msgArr.filter(m => !m.author?.bot && m.author?.id !== botId && m.createdTimestamp > cutoff30).length;
      if (recentHumans >= 3 && Math.random() < 0.40) {
        softReply = true;
        pushLog('SYS', `💬 Override cooldown 2h reply (${recentHumans} msgs/30min) → ${ch.channelName} [soft]`);
      } else {
        pushLog('SYS', `🔇 Skip reply ${ch.channelName} — cooldown 2h (${Math.round((Date.now()-chLastPost)/60000)}min)`);
        return;
      }
    }

    const channelResolver = async (id) => {
      const g = await shared.discord.guilds.fetch(GUILD_ID);
      await g.channels.fetch();
      return g.channels.cache.get(id);
    };
    const alone = await hasUnansweredLastPost(ch.channelId, channelResolver);
    if (alone) {
      pushLog('SYS', `🔇 Skip reply ${ch.channelName} — dernier post sans réponse (no-insist)`);
      return;
    }
    const consecBots = await countConsecutiveBotPosts(ch.channelId, channelResolver);
    if (consecBots >= 1) {
      pushLog('SYS', `🔇 Skip reply ${ch.channelName} — Brainee a déjà parlé en dernier`);
      return;
    }
    if (await isMonologueChannel(ch.channelId, channelResolver)) {
      pushLog('SYS', `🔇 Skip reply ${ch.channelName} — salon monologue`);
      return;
    }

    const msgContent = lastMsg.content;
    const images = extractImageAttachments(lastMsg);
    if ((!msgContent || msgContent.length < 5) && images.length === 0) return;
    const contentForDecision = msgContent || (images.length ? '[image envoyée]' : '');

    const vibe = getDailyVibe();
    const internalState = getInternalState();
    const decision = await shouldRespond(slot, vibe, internalState.mentalLoad, contentForDecision, false);

    if (!decision.should) {
      pushLog('SYS', `🙅 Skip reply (${decision.reason}): ${decision.message ? decision.message : ''}`);
      return;
    }

    await recordMessageTopic(contentForDecision);

    const profile = await getMemberProfile(lastMsg.author.id);
    const toneInstruction = getToneInstruction(profile, lastMsg.author.username);
    const mood = refreshDailyMood();
    updateInternalStatesForSlot(slot);
    applyNaturalDecay();
    detectEmotionFromMessage(contentForDecision, { userId: lastMsg.author.id });
    const bond = await ensureMemberBond(lastMsg.author.id, lastMsg.author.username);
    const bondBlock = describeBond(bond, lastMsg.author.username);
    const bondToneInstruction = getBondToneInstruction(bond, lastMsg.author.username);
    const emotionBlock = getEmotionalInjection();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    const dirEntryR = await getChannelDirectory(ch.channelId);
    const intentBlockR = getChannelIntentBlock(channel.name, ch.topic, dirEntryR?.officialDescription || '');
    const context = formatContext(msgs, null, 5);

    const verbosity = await getChannelVerbosity(ch.channelId);
    const verbosityReplyInstruct = softReply
      ? `1 phrase max, tu passes vite, reste légère.`
      : verbosity.shouldBePavé
        ? `Tu peux te permettre 3-4 phrases si le sujet le mérite (ce salon aime l'engagement).`
        : `Réponse courte (1-2 phrases). Les gens ici préfèrent les réponses concises.`;
    const baseReplyTokens = getContextualMaxTokens(msgContent, { defaultShort: 100, extended: 200 });
    const replyMaxTokens = softReply
      ? adjustMaxTokens(55)
      : adjustMaxTokens(verbosity.shouldBePavé ? Math.round(baseReplyTokens * 1.3) : baseReplyTokens);

    const crossReplyBlock = await getCrossChannelContext(ch.channelId);
    const dmBridgeBlock = await enrichServerWithDmContext(lastMsg.author.id, lastMsg.author.username).catch(() => '');

    // Charger les images AVANT de construire dynamicPrompt :
    // Si le téléchargement échoue (URL expirée, réseau), imgInstruction reste vide
    // → Brainee ne dira pas "je vois pas l'image" car elle ne sait pas qu'il y en avait une.
    const imageBlocks = images.length ? await loadImages(images) : [];
    const imgInstruction = imageBlocks.length ? getImageCommentInstruction(imageBlocks.length) : '';
    const dynamicPrompt = joinBlocks(
      getTemporalBlock(),
      toneInstruction,
      `💞 LIEN : ${bondBlock}`,
      bondToneInstruction,
      `Humeur : ${mood}. ${getMoodInjection(mood)}`,
      `Vibe du jour : ${vibe.name}.`,
      emotionBlock,
      memoryBlock,
      intentBlockR,
      crossReplyBlock,
      dmBridgeBlock,
      `Contexte #${channel.name} :\n${context}`,
      `Tu réponds à ${lastMsg.author.username} via reply (pas besoin de tag).`,
      verbosityReplyInstruct,
      LIGHT_TAG_CLAUSE + GAMING_FACTS_CLAUSE + imgInstruction,
    );

    const availableTools = getAvailableTools();
    const lowerMsgContent = contentForDecision.toLowerCase();
    const INFO_REQUEST_KEYWORDS = [
      'tu sais', 'tu connais', "c'est quoi", 'dis-moi', 'parle-moi',
      'infos sur', 'info sur', 'ce que tu sais', 'tu peux dire',
      'que sais-tu', 'dis moi', 'parle moi', 'tu peux me dire',
    ];
    // Élargi : "jeu", "sorti", "ps5", etc. → déclenche la recherche même pour conversations casual gaming
    const GENERAL_GAMING_KWS = [
      'jeu', 'game', 'sorti', 'sortie', 'ps5', 'ps4', 'ps3', 'xbox', 'switch',
      'nintendo', 'playstation', 'studio', 'développeur', 'éditeur', 'prix', 'vend',
      'rpg', 'fps', 'indie', 'open world', 'multijoueur',
    ];
    const isGamingTopic = availableTools.length > 0 && (
      GAMING_KEYWORDS.some(kw => lowerMsgContent.includes(kw))
      || GENERAL_GAMING_KWS.some(kw => lowerMsgContent.includes(kw))
      || INFO_REQUEST_KEYWORDS.some(kw => lowerMsgContent.includes(kw))
    );
    const effectiveMsgContent = msgContent || '[image envoyée sans texte]';
    let reply;
    if (isGamingTopic) {
      try {
        const gamingText = `${lastMsg.author.username} parle de : "${effectiveMsgContent}"\nSi ce message contient ou implique un fait gaming (date de sortie, prix, contenu, studio, note) → utilise l'outil de recherche EN PREMIER avant toute réponse. Ne formule jamais un fait gaming depuis ta mémoire. APRÈS OUTIL : parle des infos comme Brainee — ton oral, 2-4 phrases si le sujet le mérite. Réagis d'abord si t'as un avis, puis partage les faits clés à ta façon. Zéro header, zéro section, zéro ---, zéro liste à puces, zéro lien (sauf si demandé). Jamais "selon mes recherches" ou "j'ai trouvé".`;
        const gamingContent = imageBlocks.length ? await buildMultimodalUserContent(gamingText, null, imageBlocks) : gamingText;
        ({ text: reply } = await callClaudeWithTools(
          dynamicPrompt,
          [{ role: 'user', content: gamingContent }],
          availableTools,
          gamingToolHandler,
          { maxTokens: adjustMaxTokens(300), cachedPrefix: BOT_PERSONA_CONVERSATION, model: 'claude-haiku-4-5-20251001' }
        ));
        pushLog('SYS', `🔍 Tool use gaming → reply spontanée ${lastMsg.author.username}`, 'success');
      } catch (_) {
        const fbText = `${lastMsg.author.username} dit : "${effectiveMsgContent}"\nSois naturelle. Court (1-2 phrases).`;
        const fbContent = imageBlocks.length ? await buildMultimodalUserContent(fbText, null, imageBlocks) : fbText;
        ({ text: reply } = await callClaude(dynamicPrompt, fbContent, replyMaxTokens, BOT_PERSONA_CONVERSATION));
      }
    } else {
      const replyText = `${lastMsg.author.username} dit : "${effectiveMsgContent}"\nSois naturelle. Court par défaut (1-2 phrases). Plus long uniquement si vraiment utile.`;
      const replyContent = imageBlocks.length ? await buildMultimodalUserContent(replyText, null, imageBlocks) : replyText;
      ({ text: reply } = await callClaude(dynamicPrompt, replyContent, replyMaxTokens, BOT_PERSONA_CONVERSATION));
    }
    if (imageBlocks.length) pushLog('SYS', `🖼️ ${imageBlocks.length} image(s) lues (reply spontanée ${lastMsg.author.username})`, 'success');
    const replyResolved = resolveMentionsInText(reply, guild);
    const { THREAD_TRIGGERS } = require('../bot/keywords');
    const lowerReply = replyResolved.toLowerCase();
    const lowerMsg = msgContent.toLowerCase();
    let postedInThread = false;
    try {
      const matchedTopic = THREAD_TRIGGERS.find(kw => lowerReply.includes(kw) || lowerMsg.includes(kw));
      if (matchedTopic) {
        const activeThreads = await channel.threads.fetchActive();
        const existingThread = activeThreads.threads.find(t =>
          THREAD_TRIGGERS.some(kw => t.name.toLowerCase().includes(kw) && (lowerReply.includes(kw) || lowerMsg.includes(kw)))
        );
        if (existingThread) {
          await existingThread.send(`<@${lastMsg.author.id}> ${replyResolved}`);
          pushLog('SYS', `🧵 Reply dans fil existant "${existingThread.name}"`, 'success');
          broadcast('conversation', { channel: ch.channelName, type: 'thread-reply' });
          postedInThread = true;
        }
      }
    } catch (_) {}
    if (!postedInThread) {
      const replyMsg = await sendHuman(channel, replyResolved, lastMsg, { bond });
      if (replyMsg) recordBotMessage(replyMsg.id, ch.channelId, 'reply', replyResolved.length).catch(() => {});
      pushLog('SYS', `💬 Reply → ${lastMsg.author.username} (mood: ${mood})`, 'success');
      broadcast('conversation', { channel: ch.channelName, type: 'reply' });
    }
    detectAndSetPresenceFromReply(replyResolved).catch(() => {});
    recordCrossChannelPost(ch.channelId, ch.channelName, replyResolved).catch(() => {});
    logMessageForBridge(lastMsg.author.id, lastMsg.author.username, contentForDecision, ch.channelId, ch.channelName, 'server').catch(() => {});
    shared.lastAnyBotPostTime = Date.now();
    recordChannelPost(ch.channelId);
    await updateConvStats(ch.channelId);
    await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, contentForDecision);
    await applyInteractionToBond(lastMsg.author.id, lastMsg.author.username, contentForDecision);
  } catch (err) {
    if (!err.message.includes('Missing Permissions') && !err.message.includes('Unknown Message')) {
      pushLog('ERR', `Reply échouée : ${err.message}`, 'error');
    }
  }
}

module.exports = { postRandomConversation, replyToConversations };
