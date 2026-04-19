const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { getChannelMemory, enrichChannelMemory, formatChannelMemoryBlock } = require('../db/channelMem');
const { BOT_PERSONA_CONVERSATION } = require('../bot/persona');
const { simulateTyping, resolveMentionsInText } = require('../bot/messaging');
const { shouldCreateThread } = require('../bot/reactions');
const { getCurrentSlot } = require('../bot/scheduling');
const { DRIFT_REDIRECT_MAP } = require('../bot/keywords');
const { formatContext } = require('./context');
const { sleep, sanitizeForJson } = require('../utils');

async function detectThematicDrift(channelId, channelName, channelTopic, recentContext, channelMemory) {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const memoryStr = channelMemory ? formatChannelMemoryBlock(channelMemory) : '';
    const redirectOptions = Object.entries(DRIFT_REDIRECT_MAP)
      .map(([k, v]) => `${k} → ${v.channelName}`)
      .join(', ');

    const result = await callClaude(
      'Tu analyses la dérive thématique d\'un salon Discord. Réponds UNIQUEMENT en JSON valide sans balises markdown ni texte autour.',
      `Salon analysé : ${sanitizeForJson(channelName)}\nTopic officiel : ${sanitizeForJson(channelTopic)}\n${memoryStr}\n\nRedirections disponibles : ${redirectOptions}\n\nDerniers messages :\n${sanitizeForJson(recentContext.slice(0, 1200))}\n\nAnalyse et réponds en JSON :\n{\n  "dominantTheme": "le thème dominant des derniers messages",\n  "driftScore": 1-10,\n  "driftDuration": "court/moyen/long",\n  "membersInvolved": 1-10,\n  "action": "observe|suggest|redirect|moderate",\n  "reason": "explication courte de pourquoi cette action",\n  "suggestedChannelId": "ID Discord si redirection sinon null",\n  "suggestedChannelName": "nom du salon cible sinon null",\n  "bridgeMessage": "message naturel Brainee pour le salon d'origine (style oral, max 2 phrases, jamais corporate)",\n  "targetMessage": "mini résumé à poster dans le salon cible si redirection (style Brainee, max 2 phrases)"\n}\n\nRègles de scoring :\n- driftScore 1-3 : dérive légère ou normale pour ce salon → observe\n- driftScore 4-6 : dérive notable mais pas urgente → suggest\n- driftScore 7-8 : dérive claire, plusieurs membres, salon précis dispo → redirect\n- driftScore 9-10 : spam, conflit ou dérapage sérieux → moderate\n- Si le topic officiel du salon est large (général, off-topic), la tolérance est plus haute\n- Ne jamais rediriger sur des conversations légères ou spontanées normales`,
      400
    );

    let parsed;
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      pushLog('ERR', `detectThematicDrift JSON parse échoué pour ${channelName}`, 'error');
      return null;
    }

    const tolerance = channelMemory?.offTopicTolerance ?? 5;
    if (parsed.driftScore <= tolerance * 0.6) parsed.action = 'observe';

    pushLog('SYS', `🔍 Dérive #${channelName} : score ${parsed.driftScore}/10 → ${parsed.action} (${parsed.dominantTheme})`);
    return parsed;
  } catch (err) {
    pushLog('ERR', `detectThematicDrift échoué : ${err.message}`, 'error');
    return null;
  }
}

async function handleDrift(guild, channelId, channelName, driftResult, participantIds = []) {
  if (!driftResult || driftResult.action === 'observe') return;
  if (!ANTHROPIC_API_KEY) return;

  try {
    await guild.channels.fetch();
    const originChannel = guild.channels.cache.get(channelId);
    if (!originChannel) return;

    if (driftResult.action === 'suggest') {
      const suggestName = driftResult.suggestedChannelName || 'un autre salon';
      const msg = resolveMentionsInText(driftResult.bridgeMessage || `au passage, ce sujet serait parfait dans ${suggestName} 👀`, guild);
      await simulateTyping(originChannel, 800);
      await originChannel.send(msg);
      shared.lastAnyBotPostTime = Date.now();
      pushLog('SYS', `💡 Suggestion douce dans #${channelName} → ${suggestName}`, 'success');
      return;
    }

    if (driftResult.action === 'redirect') {
      const targetId = driftResult.suggestedChannelId;
      const targetName = driftResult.suggestedChannelName;
      if (!targetId || !targetName) return;

      const targetChannel = guild.channels.cache.get(targetId);
      if (!targetChannel) return;

      if (shouldCreateThread(driftResult.dominantTheme)) {
        try {
          const threadName = await callClaude(
            'Tu génères des noms de fils Discord courts (max 60 caractères, pas de guillemets, emoji gaming).',
            `Nom de fil pour ce sujet : "${sanitizeForJson(driftResult.dominantTheme)}". Max 60 car. Emoji adapté.`, 60
          );
          const cleanThreadName = threadName.replace(/"/g, '').trim().slice(0, 100);
          const bridgeResolved = resolveMentionsInText(driftResult.bridgeMessage || `ce sujet mérite son propre espace 🧵`, guild);
          const sentMsg = await originChannel.send(bridgeResolved);
          const thread = await sentMsg.startThread({
            name: cleanThreadName,
            autoArchiveDuration: 1440,
            reason: 'Fil dérive Brainee',
          });

          // Premier message dans le fil : intro + invitation (+ tag des participants actifs)
          const threadIntro = await callClaude(
            `\nTu viens d'ouvrir un fil Discord "${cleanThreadName}" sur le sujet "${driftResult.dominantTheme}".`,
            `Écris un message d'ouverture pour ce fil : 1 ligne de titre en gras style "**[titre accrocheur]**", puis 1-2 phrases d'invitation à continuer la discussion ici. Ton style Brainee, oral, chaleureux. Pas de @.`,
            140,
            BOT_PERSONA_CONVERSATION
          );
          const tagLine = (Array.isArray(participantIds) && participantIds.length)
            ? participantIds.slice(0, 5).map(id => `<@${id}>`).join(' ') + ' '
            : '';
          await thread.send(tagLine + resolveMentionsInText(threadIntro, guild));

          shared.lastAnyBotPostTime = Date.now();
          pushLog('SYS', `🧵 Thread "${cleanThreadName}" créé + intro postée dans #${channelName} (${participantIds.length} participants tagués)`, 'success');
        } catch (threadErr) {
          pushLog('ERR', `Thread dérive échoué : ${threadErr.message}`, 'error');
        }
        return;
      }

      const bridgeMsg = resolveMentionsInText(driftResult.bridgeMessage || `ok on a clairement dérivé vers du ${driftResult.dominantTheme} — je vous ouvre un coin dans ${targetName} 🔀`, guild);
      await simulateTyping(originChannel, 800);
      await originChannel.send(bridgeMsg);
      await sleep(1500);

      if (driftResult.targetMessage) {
        const targetResolved = resolveMentionsInText(driftResult.targetMessage, guild);
        await simulateTyping(targetChannel, 600);
        await targetChannel.send(targetResolved);
      }

      shared.lastAnyBotPostTime = Date.now();
      pushLog('SYS', `🔀 Redirection #${channelName} → #${targetName}`, 'success');
      broadcast('drift', { from: channelName, to: targetName, theme: driftResult.dominantTheme, score: driftResult.driftScore });
      return;
    }

    if (driftResult.action === 'moderate') {
      const moderateMsg = await callClaude(
        '\nTu interviens dans un salon Discord qui dérive sérieusement.',
        `Le salon ${channelName} dérive sur : "${driftResult.dominantTheme}". Raison : ${driftResult.reason}. Lance une intervention ferme mais humaine — pas de message admin froid, pas de liste de règles. Style Brainee direct. Max 2 phrases.`,
        100,
        BOT_PERSONA_CONVERSATION
      );
      const moderateResolved = resolveMentionsInText(moderateMsg, guild);
      await simulateTyping(originChannel, 1000);
      await originChannel.send(moderateResolved);
      shared.lastAnyBotPostTime = Date.now();
      pushLog('SYS', `🚨 Modération dans #${channelName}`, 'success');
    }
  } catch (err) {
    pushLog('ERR', `handleDrift échoué : ${err.message}`, 'error');
  }
}

async function runDriftCheck() {
  const cfg = shared.botConfig.conversations;
  if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;

  pushLog('SYS', '🔍 Check dérive thématique...');
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();

    const lastPostByChannel = cfg.lastPostByChannel || {};
    const activeChannels = cfg.channels
      .filter(c => c.enabled)
      .sort((a, b) => (lastPostByChannel[b.channelId] || 0) - (lastPostByChannel[a.channelId] || 0))
      .slice(0, 5);

    for (const ch of activeChannels) {
      const channel = guild.channels.cache.get(ch.channelId);
      if (!channel) continue;

      try {
        const msgs = await channel.messages.fetch({ limit: 30 });
        if (!msgs.size || msgs.size < 5) continue;

        const lastMsg = [...msgs.values()][0];
        if (Date.now() - lastMsg.createdTimestamp > 2 * 60 * 60 * 1000) continue;

        const context = formatContext(msgs, null, 30);
        const memory = await getChannelMemory(ch.channelId);

        // Extraction des participants humains actifs (hors bots) pour tag éventuel dans le fil
        const participantIds = [];
        const seen = new Set();
        for (const m of msgs.values()) {
          if (m.author?.bot) continue;
          if (!m.author?.id || seen.has(m.author.id)) continue;
          seen.add(m.author.id);
          participantIds.push(m.author.id);
          if (participantIds.length >= 5) break;
        }

        const lastEnriched = memory?.lastEnrichedAt ? new Date(memory.lastEnrichedAt).getTime() : 0;
        if (Date.now() - lastEnriched > 6 * 60 * 60 * 1000) {
          enrichChannelMemory(ch.channelId, ch.channelName, ch.topic, context).catch(() => {});
        }

        const drift = await detectThematicDrift(ch.channelId, ch.channelName, ch.topic, context, memory);
        if (drift && drift.action !== 'observe') {
          await handleDrift(guild, ch.channelId, ch.channelName, drift, participantIds);
          await sleep(2000);
        }
      } catch (chErr) {
        if (!chErr.message.includes('Missing Permissions')) {
          pushLog('ERR', `Drift check échoué pour ${ch.channelName} : ${chErr.message}`, 'error');
        }
      }
    }
    pushLog('SYS', '✅ Check dérive terminé');
  } catch (err) {
    pushLog('ERR', `runDriftCheck échoué : ${err.message}`, 'error');
  }
}

module.exports = { detectThematicDrift, handleDrift, runDriftCheck };
