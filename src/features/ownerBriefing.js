/**
 * ================================================
 * 💡 OWNER BRIEFING v1.0.0
 * ================================================
 * Brainee envoie un DM privé à Brain (owner) une fois par semaine
 * avec des idées de futures features, basées sur ce qu'elle a observé
 * dans les conversations et patterns de la semaine.
 * ================================================
 */

const { OWNER_USER_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA_DM } = require('../bot/persona');
const { getBotState, setBotState } = require('../db/botState');
const { pushLog } = require('../logger');
const { postBriefingToChannel } = require('./modLogger');
const shared = require('../shared');

const BRIEFING_COOLDOWN_DAYS = 6; // au moins 6j entre deux briefings

async function shouldSendBriefing() {
  if (!OWNER_USER_ID || !ANTHROPIC_API_KEY) return false;
  const state = await getBotState();
  const lastBriefingTs = state.ownerBriefingLastTs || 0;
  const elapsed = Date.now() - lastBriefingTs;
  return elapsed > BRIEFING_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

async function sendOwnerBriefing() {
  if (!await shouldSendBriefing()) return;
  if (!shared.discord?.isReady()) return;

  try {
    const owner = await shared.discord.users.fetch(OWNER_USER_ID);
    if (!owner) { pushLog('ERR', `ownerBriefing: user ${OWNER_USER_ID} introuvable`); return; }

    // Collecter des patterns depuis la semaine (narrative + stats)
    let weekContext = '';
    try {
      const { getWeeklyContext } = require('../db/narrativeMemory');
      weekContext = await getWeeklyContext();
    } catch (_) {}

    const prompt = `Tu es Brainee. Tu envoies un DM privé à Brain (le créateur du projet) pour lui partager tes observations de la semaine et lui proposer 2-3 idées de features ou améliorations.

Tu parles naturellement, comme à quelqu'un que tu connais bien. Tu peux mentionner des trucs concrets que t'as observé (conversations, patterns, ce qui a marché ou pas). Tes idées doivent être réalistes et utiles pour le bot.

${weekContext ? 'Contexte semaine :\n' + weekContext + '\n' : ''}

Ton message doit :
- commencer directement sans "bonjour" ni présentation
- donner 2-3 idées courtes et concrètes (pas de listes formelles, reste naturelle)
- max 200 mots
- ton conversationnel, comme si t'écrivais un vrai message privé à Brain`;

    const { text } = await callClaude(prompt, 'Rédige le DM de propositions pour Brain.', 300, BOT_PERSONA_DM);

    const dm = await owner.createDM();
    await dm.send(`💡 **Idées de la semaine**\n\n${text}`);

    // Also post to #briefing-brainee for the mod team
    postBriefingToChannel(text).catch(() => {});

    await setBotState({ ownerBriefingLastTs: Date.now() });
    pushLog('SYS', `💡 Owner briefing envoyé à Brain`, 'success');
  } catch (err) {
    pushLog('ERR', `ownerBriefing échoué : ${err.message}`, 'error');
  }
}

module.exports = { sendOwnerBriefing };
