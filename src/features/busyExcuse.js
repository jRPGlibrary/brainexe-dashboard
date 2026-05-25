/**
 * ================================================
 * 💤 BUSY EXCUSE SYSTEM v0.16.0
 * ================================================
 * Avec une très faible probabilité (4% DM / 2% serveur),
 * Brainee prétexte qu'elle est occupée et répond plus tard.
 * L'excuse est générée par l'IA, adaptée au slot horaire.
 * Son statut Discord change pendant l'absence et revient
 * automatiquement en ligne quand elle répond pour de vrai.
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

const BUSY_PROB_DM     = 0.04; // 4% en DM
const BUSY_PROB_SERVER = 0.03; // 3% en serveur

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

function checkBusyExcuse(isDM) {
  const prob = isDM ? BUSY_PROB_DM : BUSY_PROB_SERVER;
  return Math.random() < prob;
}

function pickReason(slot) {
  return REASON_BY_SLOT[slot?.status] || 'browsing';
}

async function generateExcuse(reason, username) {
  const reasonLabel = REASON_LABELS[reason] || 'tu es occupée';
  const userPrompt = `${username} vient de t'écrire. ${reasonLabel}. Génère UNE seule phrase très courte et naturelle (max 10 mots) pour lui dire que tu es occupée et que tu reviendras. Style oral Brainee, en français, sans majuscule au début si ça sonne plus naturel. SANS emoji. Juste la phrase brute, sans guillemets.`;
  try {
    const { text, usage } = await callClaude('', userPrompt, 60, BOT_PERSONA, 'claude-haiku-4-5-20251001');
    await recordTokenUsage('system', 'brainee', usage.inputTokens, usage.outputTokens, 'busy_excuse');
    return text.trim().replace(/^["']|["']$/g, '');
  } catch (_) {
    return "j'suis sur un truc, je reviens";
  }
}

async function generateReturnMessage(userQuery, username, reason) {
  const userPrompt = `${username} t'avait écrit : "${userQuery}". Réponds directement à son message — pas de "je suis de retour", pas de préambule. Juste la réponse. Max 2 phrases, style oral Brainee.`;
  try {
    const { text, usage } = await callClaude('', userPrompt, 150, BOT_PERSONA, 'claude-haiku-4-5-20251001');
    await recordTokenUsage('system', 'brainee', usage.inputTokens, usage.outputTokens, 'busy_return');
    return text.trim();
  } catch (_) {
    return null;
  }
}

async function triggerBusyExcuse(message, userQuery, slot, isDM) {
  const reason = pickReason(slot);
  const username = message.author.username;

  try {
    const excuse = await generateExcuse(reason, username);
    await message.reply(excuse);
    setOccupied(reason);

    const delayMin = 20 + Math.random() * 55; // 20 à 75 min
    const delayMs  = Math.floor(delayMin * 60 * 1000);

    // E2 — Verrouillage d'engagement : aucune réponse spontanée pendant l'absence
    shared.commitmentUntil  = Date.now() + delayMs;
    shared.commitmentReason = reason;

    pushLog('SYS', `💤 Absence simulée [${reason}] → ${username} — retour dans ${Math.round(delayMin)} min`);

    setTimeout(async () => {
      try {
        const currentSlot = getCurrentSlot();
        shared.commitmentUntil  = null;
        shared.commitmentReason = null;
        setAvailable();
        if (currentSlot.maxConv === 0) {
          pushLog('SYS', `💤 Retour busyExcuse annulé — Brainee dort`);
          return;
        }
        // Cherche le dernier message non-répondu de l'user dans le channel
        let pendingQuery = userQuery;
        try {
          const fetched = await message.channel.messages.fetch({ limit: 20 });
          const sorted = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
          const lastUserMsg = sorted.filter(m => m.author.id === message.author.id).pop();
          if (lastUserMsg && lastUserMsg.content.trim()) pendingQuery = lastUserMsg.content.trim();
        } catch (_) {}
        const returnMsg = await generateReturnMessage(pendingQuery, username, reason);
        if (!returnMsg) { setAvailable(); return; }
        const returnResolved = resolveMentionsInText(returnMsg, message.guild || null);
        if (isDM) {
          await simulateDmTyping(message.channel, returnResolved.length);
        } else {
          await simulateTyping(message.channel, 1000 + Math.random() * 2000);
        }
        await message.reply(returnResolved);
        shared.lastAnyBotPostTime = Date.now();
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
