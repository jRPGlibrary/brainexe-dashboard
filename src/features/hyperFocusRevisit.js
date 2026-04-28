/**
 * ================================================
 * 🎯 HYPER-FOCUS REVISIT v2.3.5
 * ================================================
 * Tick cron qui regarde les obsessions arrivées à terme et publie
 * un retour différé dans le salon source ("attends j'ai repensé à ce que tu disais sur...").
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY, MIN_GAP_ANY_POST } = require('../config');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA_CONVERSATION } = require('../bot/persona');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getCurrentSlot } = require('../bot/scheduling');
const { getDailyVibe } = require('../bot/adaptiveSchedule');
const { getInternalState, getEmotionalInjection, adjustMaxTokens } = require('../bot/emotions');
const { sendHuman } = require('../bot/messaging');
const { getDueObsessions, markObsessionRevisited, describeTopic } = require('../bot/hyperFocus');

async function processDueObsessions() {
  const cfg = shared.botConfig?.conversations;
  if (!cfg?.enabled) return;

  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;

  const vibe = getDailyVibe();
  if (['introvert', 'withdrawn', 'lazy'].includes(vibe.name)) return;

  const state = getInternalState();
  if (state.mentalLoad > 75 || state.energy < 30) return;

  if (Date.now() - (shared.lastAnyBotPostTime || 0) < (MIN_GAP_ANY_POST || 15 * 60 * 1000)) return;
  if (!ANTHROPIC_API_KEY) return;

  const due = await getDueObsessions();
  if (!due.length) return;

  // On en traite UNE seule par tick pour ne pas saturer
  const obsession = due[0];

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(obsession.sourceChannelId);
    if (!channel) {
      await markObsessionRevisited(obsession._id);
      return;
    }

    const mood = refreshDailyMood();
    const emotionBlock = getEmotionalInjection();
    const topicLabel = describeTopic(obsession.topic);

    const ageHours = Math.round((Date.now() - new Date(obsession.createdAt).getTime()) / (1000 * 60 * 60));

    const prompt = `Humeur du jour : ${mood}. ${getMoodInjection(mood)}\nVibe : ${vibe.name}.\n${emotionBlock}\n\n` +
      `CONTEXTE : il y a ~${ageHours}h, @${obsession.sourceUsername} a parlé de ${topicLabel} dans #${channel.name}. ` +
      `Le message qui t'a accroché : "${obsession.snippet}".\n` +
      `Depuis, t'y as repensé. T'as une nouvelle pensée, une remarque, un angle, une question fouillée à ramener.\n\n` +
      `MISSION : écris UN message de retour différé, naturel, comme si tu y repensais à l'instant. ` +
      `Pas de résumé du contexte. Pas "comme tu disais tout à l'heure". Plutôt : "attends j'ai repensé à un truc", "tiens ça m'a fait penser…", "ouais bon j'ai pas lâché ton truc sur X". ` +
      `Tu peux mentionner @${obsession.sourceUsername} naturellement. Max 2 phrases.`;

    const reply = await callClaude(prompt, 'Génère ce retour différé.', adjustMaxTokens(180), BOT_PERSONA_CONVERSATION);
    if (!reply || reply.length < 8) {
      await markObsessionRevisited(obsession._id);
      return;
    }

    await sendHuman(channel, reply, null, {});
    shared.lastAnyBotPostTime = Date.now();
    await markObsessionRevisited(obsession._id);
    pushLog('SYS', `🎯 Hyper-focus revisit (${obsession.topic}) → #${channel.name} (← ${obsession.sourceUsername}, ${ageHours}h)`, 'success');
  } catch (err) {
    pushLog('ERR', `hyperFocusRevisit: ${err.message}`, 'error');
  }
}

module.exports = { processDueObsessions };
