/**
 * ================================================
 * 💤 BUSY EXCUSE SYSTEM v0.17.0
 * ================================================
 * Avec une très faible probabilité (2% DM / 1% serveur),
 * Brainee prétexte qu'elle est occupée et répond plus tard.
 * L'excuse est générée par l'IA, adaptée au slot horaire.
 * Son statut Discord change pendant l'absence et revient
 * automatiquement en ligne quand elle répond pour de vrai.
 *
 * Retour slot-aware :
 *  - sleep      → silence total, commitment libéré sans message
 *  - latenight  → goodnight + goodnightSent = true
 *  - autres     → retour normal sur le dernier message de l'user
 * ================================================
 */

const { callClaude } = require('../ai/claude');
const { recordTokenUsage } = require('../db/tokenUsage');
const { BOT_PERSONA } = require('../bot/persona');
const { getCurrentSlot } = require('../bot/scheduling');
const { simulateTyping, simulateDmTyping, resolveMentionsInText } = require('../bot/messaging');
const { pushLog } = require('../logger');
const { setOccupied, setAvailable } = require('./presenceManager');
const shared = require('../shared');

const BUSY_PROB_DM     = 0.02; // 2%
const BUSY_PROB_SERVER = 0.01; // 1%

const REASON_BY_SLOT = {
  sleep:      'resting',
  wakeup:     'resting',
  active:     'browsing',
  lunch:      'eating',
  productive: 'browsing',
  transition: 'outside',
  gaming:     'gaming',
  latenight:  'gaming',
};

const REASON_LABELS = {
  eating:   'tu es en train de manger',
  resting:  'tu as besoin de te reposer un moment',
  gaming:   'tu es en pleine session de jeu et tu peux pas lâcher',
  browsing: 'tu es tombée dans un rabbit hole sur le web et tu suis un truc',
  outside:  'tu sors rapidement',
};

// Délai selon le slot : court le soir/nuit, plus long en journée
const DELAY_BY_SLOT = {
  sleep:      [5,  15],
  wakeup:     [10, 25],
  active:     [20, 55],
  lunch:      [15, 35],
  productive: [20, 55],
  transition: [15, 35],
  gaming:     [15, 40],
  latenight:  [10, 25],
};

function checkBusyExcuse(isDM) {
  const prob = isDM ? BUSY_PROB_DM : BUSY_PROB_SERVER;
  return Math.random() < prob;
}

function pickReason(slot) {
  return REASON_BY_SLOT[slot?.status] || 'browsing';
}

function pickDelay(slot) {
  const [min, max] = DELAY_BY_SLOT[slot?.status] || [20, 55];
  return min + Math.random() * (max - min);
}

function delayLabel(delayMin) {
  if (delayMin < 15) return 'dans 10 minutes';
  if (delayMin < 30) return 'dans un quart d\'heure';
  if (delayMin < 50) return 'dans une demi-heure';
  return 'dans une heure environ';
}

async function generateExcuse(reason, username, delayMin) {
  const reasonLabel = REASON_LABELS[reason] || 'tu es occupée';
  const whenLabel   = delayLabel(delayMin);
  const userPrompt  = `${username} vient de t'écrire. ${reasonLabel}. Génère UNE seule phrase très courte et naturelle (max 12 mots) pour lui dire que tu es occupée et que tu reviens ${whenLabel}. Style oral Brainee, en français, sans majuscule au début si ça sonne plus naturel. SANS emoji. Juste la phrase brute, sans guillemets.`;
  try {
    const { text, usage } = await callClaude('', userPrompt, 60, BOT_PERSONA, 'claude-haiku-4-5-20251001');
    await recordTokenUsage('system', 'brainee', usage.inputTokens, usage.outputTokens, 'busy_excuse');
    return text.trim().replace(/^["']|["']$/g, '');
  } catch (_) {
    return `j'suis sur un truc, je reviens ${whenLabel}`;
  }
}

async function generateReturnMessage(userQuery, username) {
  const userPrompt = `${username} t'avait écrit : "${userQuery}". Réponds directement à son message — pas de "je suis de retour", pas de préambule. Juste la réponse. Max 2 phrases, style oral Brainee.`;
  try {
    const { text, usage } = await callClaude('', userPrompt, 150, BOT_PERSONA, 'claude-haiku-4-5-20251001');
    await recordTokenUsage('system', 'brainee', usage.inputTokens, usage.outputTokens, 'busy_return');
    return text.trim();
  } catch (_) {
    return null;
  }
}

async function generateGoodnightMessage() {
  const userPrompt = `Il est tard, tu avais dit que tu revenais mais t'as sommeil. Génère UNE seule phrase très courte (max 10 mots) pour dire que tu vas dormir / que tu lâches pour ce soir. Style oral Brainee, en français, sans majuscule si ça sonne mieux. SANS emoji. Juste la phrase brute.`;
  try {
    const { text, usage } = await callClaude('', userPrompt, 60, BOT_PERSONA, 'claude-haiku-4-5-20251001');
    await recordTokenUsage('system', 'brainee', usage.inputTokens, usage.outputTokens, 'busy_goodnight');
    return text.trim().replace(/^["']|["']$/g, '');
  } catch (_) {
    return 'bon finalement je vais dormir, bonne nuit';
  }
}

async function triggerBusyExcuse(message, userQuery, slot, isDM) {
  const reason   = pickReason(slot);
  const username = message.author.username;
  const delayMin = pickDelay(slot);
  const delayMs  = Math.floor(delayMin * 60 * 1000);

  try {
    const excuse = await generateExcuse(reason, username, delayMin);
    await message.reply(excuse);
    setOccupied(reason);

    shared.commitmentUntil  = Date.now() + delayMs;
    shared.commitmentReason = reason;

    pushLog('SYS', `💤 Absence simulée [${reason}] → ${username} — retour dans ${Math.round(delayMin)} min`);

    setTimeout(async () => {
      try {
        const currentSlot = getCurrentSlot();
        shared.commitmentUntil  = null;
        shared.commitmentReason = null;

        // Slot sleep → silence, on libère juste le commitment
        if (currentSlot.maxConv === 0) {
          setAvailable();
          pushLog('SYS', `💤 Retour busyExcuse annulé — Brainee dort`);
          return;
        }

        // Slot latenight → goodnight au lieu de revenir dans la conv
        if (currentSlot.status === 'latenight') {
          const goodnightMsg = await generateGoodnightMessage();
          await simulateTyping(message.channel, 800 + Math.random() * 1200);
          await message.channel.send(goodnightMsg);
          shared.goodnightSent         = true;
          shared.lastAnyBotPostTime    = Date.now();
          setAvailable();
          pushLog('SYS', `🌙 BusyExcuse → goodnight latenight → ${username}`, 'success');
          return;
        }

        // Retour normal : cherche le dernier message de l'user dans le channel
        let pendingQuery = userQuery;
        try {
          const fetched = await message.channel.messages.fetch({ limit: 20 });
          const sorted  = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
          const lastUserMsg = sorted.filter(m => m.author.id === message.author.id).pop();
          if (lastUserMsg?.content.trim()) pendingQuery = lastUserMsg.content.trim();
        } catch (_) {}

        const returnMsg = await generateReturnMessage(pendingQuery, username);
        if (!returnMsg) { setAvailable(); return; }

        const returnResolved = resolveMentionsInText(returnMsg, message.guild || null);
        if (isDM) {
          await simulateDmTyping(message.channel, returnResolved.length);
        } else {
          await simulateTyping(message.channel, 1000 + Math.random() * 2000);
        }
        await message.reply(returnResolved);
        shared.lastAnyBotPostTime = Date.now();
        setAvailable();
        pushLog('SYS', `↩️ Retour busyExcuse → ${username}`, 'success');
      } catch (err) {
        pushLog('ERR', `Retour busyExcuse échoué : ${err.message}`, 'error');
        shared.commitmentUntil  = null;
        shared.commitmentReason = null;
        setAvailable();
      }
    }, delayMs);

    return true;
  } catch (err) {
    pushLog('ERR', `triggerBusyExcuse échoué : ${err.message}`, 'error');
    return false;
  }
}

module.exports = { checkBusyExcuse, triggerBusyExcuse };
