const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { sanitizeForJson, extractJson } = require('../utils');

const ENRICH_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h max entre deux enrichissements

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

    // Cooldown 2h intégré — guard universel quel que soit l'appelant
    const lastEnrichedAt = existing?.lastEnrichedAt ? new Date(existing.lastEnrichedAt).getTime() : 0;
    if (Date.now() - lastEnrichedAt < ENRICH_COOLDOWN_MS) return;

    // Reset highlights si nouveau jour (minuit Paris)
    const toParisDate = d => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
    const isNewDay = !existing?.lastEnrichedAt || toParisDate(existing.lastEnrichedAt) !== toParisDate(new Date());
    const oldHighlights = isNewDay ? [] : (existing?.todayHighlights || []);

    const existingCtx = [
      existing?.frequentThemes?.slice(0, 3).join(', '),
      oldHighlights.join(' | '),
    ].filter(Boolean).join('\n');

    const { text: analysis } = await callClaude(
      'Tu notes les moments importants d\'un salon Discord gaming. Très concis.',
      `Salon: #${sanitizeForJson(channelName)}\nDéjà noté: ${sanitizeForJson(existingCtx.slice(0, 200))}\n\nMessages récents:\n${sanitizeForJson(recentContext.slice(0, 600))}\n\nRetourne JSON strict:\n{"toneProfile":"3-5 mots","frequentThemes":["t1","t2","t3"],"todayHighlights":["Prenom+fait en 8 mots max","..."],"activeUsers":["pseudo1","pseudo2"],"heatLevel":7,"summary":"1 phrase résumé du jour"}`,
      220,
      null,
      'claude-haiku-4-5-20251001'
    );

    let parsed;
    try {
      const clean = extractJson(analysis);
      if (!clean) return;
      parsed = JSON.parse(clean);
    } catch { return; }

    // Fusionne anciens + nouveaux moments, déduplique, garde les 5 derniers
    const merged = [...new Set([...oldHighlights, ...(parsed.todayHighlights || [])])].slice(-5);

    await setChannelMemory(channelId, {
      channelName,
      channelTopic,
      toneProfile: parsed.toneProfile || existing?.toneProfile || '',
      frequentThemes: parsed.frequentThemes || existing?.frequentThemes || [],
      todayHighlights: merged,
      activeUsersToday: parsed.activeUsers || [],
      insideJokes: existing?.insideJokes || [],
      heatLevel: parsed.heatLevel ?? existing?.heatLevel ?? 5,
      offTopicTolerance: existing?.offTopicTolerance || 5,
      lastSummary: parsed.summary || existing?.lastSummary || '',
      lastEnrichedAt: new Date(),
    });
    pushLog('SYS', `🧠 Mémoire #${channelName} enrichie (${merged.length} moments clés)`, 'success');
  } catch (err) {
    pushLog('ERR', `enrichChannelMemory: ${err.message}`, 'error');
  }
}

function formatChannelMemoryBlock(memory) {
  if (!memory) return '';
  const parts = [];
  if (memory.toneProfile) parts.push(`Ton : ${memory.toneProfile}`);
  if (memory.activeUsersToday?.length) parts.push(`Actifs aujourd'hui : ${memory.activeUsersToday.slice(0, 4).join(', ')}`);
  if (memory.todayHighlights?.length) parts.push(`Moments clés : ${memory.todayHighlights.join(' | ')}`);
  else if (memory.lastSummary) parts.push(`Résumé : ${memory.lastSummary}`);
  if (memory.frequentThemes?.length) parts.push(`Thèmes habituels : ${memory.frequentThemes.join(', ')}`);
  if (memory.insideJokes?.length) parts.push(`Refs internes : ${memory.insideJokes.join(', ')}`);
  if (!parts.length) return '';
  return `\nMémoire du salon :\n${parts.join('\n')}`;
}

module.exports = { getChannelMemory, setChannelMemory, enrichChannelMemory, formatChannelMemoryBlock };
