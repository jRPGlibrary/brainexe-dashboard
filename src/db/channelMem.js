const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { sanitizeForJson, extractJson } = require('../utils');

async function getChannelMemory(channelId) {
  if (!shared.mongoDb) return null;
  try { return await shared.mongoDb.collection('channelMemory').findOne({ channelId }); } catch { return null; }
}

async function setChannelMemory(channelId, patch) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection('channelMemory').updateOne(
      { channelId },
      { $set: { ...patch, channelId, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `setChannelMemory échoué : ${err.message}`, 'error'); }
}

async function enrichChannelMemory(channelId, channelName, channelTopic, recentContext) {
  const { ANTHROPIC_API_KEY } = require('../config');
  if (!ANTHROPIC_API_KEY || !shared.mongoDb) return;
  try {
    const existing = await getChannelMemory(channelId);
    const existingStr = existing ? JSON.stringify({
      toneProfile: existing.toneProfile,
      frequentThemes: existing.frequentThemes,
      insideJokes: existing.insideJokes,
      heatLevel: existing.heatLevel,
    }) : 'Pas de mémoire existante';

    const analysis = await callClaude(
      'Tu analyses la mémoire conversationnelle d\'un salon Discord pour un bot nommé Brainee. Réponds UNIQUEMENT en JSON valide, sans balises markdown, sans texte autour.',
      `Salon : ${sanitizeForJson(channelName)} (topic officiel : ${sanitizeForJson(channelTopic)})\n\nMémoire existante :\n${existingStr}\n\nContexte récent (derniers messages) :\n${sanitizeForJson(recentContext.slice(0, 1500))}\n\nAnalyse et retourne un JSON avec ces champs :\n{\n  "toneProfile": "description courte du ton dominant dans ce salon",\n  "frequentThemes": ["thème1", "thème2", "thème3"],\n  "insideJokes": ["blague ou référence interne si détectée"],\n  "heatLevel": 1-10,\n  "offTopicTolerance": 1-10,\n  "lastSummary": "résumé en 1 phrase des sujets récents"\n}`,
      300
    );

    let parsed;
    try {
      const clean = extractJson(analysis);
      parsed = JSON.parse(clean);
    } catch {
      pushLog('ERR', `enrichChannelMemory JSON parse échoué pour ${channelName}`, 'error');
      return;
    }

    await setChannelMemory(channelId, {
      channelName,
      channelTopic,
      toneProfile: parsed.toneProfile || '',
      frequentThemes: parsed.frequentThemes || [],
      insideJokes: parsed.insideJokes || [],
      heatLevel: parsed.heatLevel || 5,
      offTopicTolerance: parsed.offTopicTolerance || 5,
      lastSummary: parsed.lastSummary || '',
      lastEnrichedAt: new Date(),
    });
    pushLog('SYS', `🧠 Mémoire salon #${channelName} enrichie`, 'success');
  } catch (err) {
    pushLog('ERR', `enrichChannelMemory échoué pour ${channelName} : ${err.message}`, 'error');
  }
}

function formatChannelMemoryBlock(memory) {
  if (!memory) return '';
  const parts = [];
  if (memory.toneProfile) parts.push(`Ton habituel du salon : ${memory.toneProfile}`);
  if (memory.frequentThemes?.length) parts.push(`Sujets récurrents : ${memory.frequentThemes.join(', ')}`);
  if (memory.insideJokes?.length) parts.push(`Références internes : ${memory.insideJokes.join(', ')}`);
  if (memory.lastSummary) parts.push(`Derniers sujets : ${memory.lastSummary}`);
  if (memory.heatLevel) parts.push(`Niveau d'activité du salon : ${memory.heatLevel}/10`);
  if (!parts.length) return '';
  return `\nMémoire du salon :\n${parts.join('\n')}`;
}

module.exports = { getChannelMemory, setChannelMemory, enrichChannelMemory, formatChannelMemoryBlock };
