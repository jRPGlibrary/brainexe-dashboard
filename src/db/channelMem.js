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
    const existingStr = existing
      ? `ton:${existing.toneProfile?.slice(0, 30)},themes:${existing.frequentThemes?.slice(0, 2)?.join(',')}`
      : 'new';

    const { text: analysis } = await callClaude(
      'Analyse mémoire salon Discord.',
      `Ch:${sanitizeForJson(channelName)}\nExist:${existingStr}\nRecent:${sanitizeForJson(recentContext.slice(0, 400))}\n\nRetourne JSON compact (valeurs TRÈS courtes):\n{"toneProfile":"3-5 mots max","frequentThemes":["t1","t2"],"heatLevel":5}`,
      300
    );

    let parsed;
    try {
      const clean = extractJson(analysis);
      if (!clean) {
        pushLog('ERR', `enrichChannelMemory: pas de JSON pour ${channelName}`, 'error');
        return;
      }
      parsed = JSON.parse(clean);
    } catch (err) {
      pushLog('ERR', `enrichChannelMemory: parse échoué ${channelName}`, 'error');
      return;
    }

    await setChannelMemory(channelId, {
      channelName,
      channelTopic,
      toneProfile: parsed.toneProfile || existing?.toneProfile || '',
      frequentThemes: parsed.frequentThemes || existing?.frequentThemes || [],
      insideJokes: existing?.insideJokes || [],
      heatLevel: parsed.heatLevel || existing?.heatLevel || 5,
      offTopicTolerance: existing?.offTopicTolerance || 5,
      lastSummary: existing?.lastSummary || '',
      lastEnrichedAt: new Date(),
    });
    pushLog('SYS', `🧠 Mémoire #${channelName} compactée`, 'success');
  } catch (err) {
    pushLog('ERR', `enrichChannelMemory: ${err.message}`, 'error');
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
