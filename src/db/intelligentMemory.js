const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { sanitizeForJson } = require('../utils');

// Système de mémoire intelligent qui compacte et oublie les infos non utilisées

async function getSmartMemory(entityId, entityType = 'user') {
  if (!shared.mongoDb) return null;
  try {
    return await shared.mongoDb.collection('smartMemory').findOne({
      entityId,
      entityType,
    });
  } catch {
    return null;
  }
}

async function setSmartMemory(entityId, entityType, patch) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection('smartMemory').updateOne(
      { entityId, entityType },
      {
        $set: {
          ...patch,
          entityId,
          entityType,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    pushLog('ERR', `setSmartMemory échoué: ${err.message}`, 'error');
  }
}

// Compacter la mémoire: garder essentiel, enlever redondance, oublier ce qui ne revient pas
async function compactMemory(entityId, entityType, recentEvents, existingMemory) {
  const { ANTHROPIC_API_KEY } = require('../config');
  if (!ANTHROPIC_API_KEY || !shared.mongoDb) return existingMemory;

  try {
    const existingStr = existingMemory
      ? JSON.stringify({
          coreTraits: existingMemory.coreTraits,
          importantTopics: existingMemory.importantTopics,
          relatedPeople: existingMemory.relatedPeople,
          style: existingMemory.style,
          lastUsedTopics: existingMemory.lastUsedTopics,
        })
      : 'Pas de mémoire';

    const recentEventsStr = Array.isArray(recentEvents)
      ? recentEvents.slice(0, 8).map(e => `${e.date}: ${e.summary}`).join('\n')
      : 'Pas d\'événements récents';

    // Prompt ultra-court pour compacter (max 200 tokens)
    const analysis = await callClaude(
      'Tu analyses la mémoire d\'une personne et compactes les infos essentielles.',
      `Entité: ${sanitizeForJson(entityId)} (type: ${entityType})\n\nMémoire existante:\n${existingStr}\n\nÉvénements récents:\n${recentEventsStr}\n\nRetourne JSON STRICT:\n{\n  "coreTraits": ["trait1", "trait2"],\n  "importantTopics": ["sujet1", "sujet2"],\n  "relatedPeople": {"personne": "relation"},\n  "style": "description ultra-courte du style",\n  "lastUsedTopics": ["recent1", "recent2"],\n  "topicsToForget": ["oubli1"]\n}`,
      200
    );

    let parsed;
    try {
      const clean = analysis.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      pushLog('ERR', `compactMemory JSON parse échoué pour ${entityId}`, 'error');
      return existingMemory;
    }

    // Appliquer la compaction
    const compacted = {
      coreTraits: parsed.coreTraits || [],
      importantTopics: parsed.importantTopics || [],
      relatedPeople: parsed.relatedPeople || {},
      style: parsed.style || '',
      lastUsedTopics: parsed.lastUsedTopics || [],
      lastCompactedAt: new Date(),
      forgetList: parsed.topicsToForget || [],
    };

    await setSmartMemory(entityId, entityType, compacted);
    pushLog('SYS', `🧠 Mémoire compactée: ${entityId}`, 'success');
    return compacted;
  } catch (err) {
    pushLog('ERR', `compactMemory échoué: ${err.message}`, 'error');
    return existingMemory;
  }
}

// Formater la mémoire pour injection dans les prompts (ultra-compacte)
function formatSmartMemory(memory) {
  if (!memory) return '';

  const parts = [];
  if (memory.coreTraits?.length) {
    parts.push(`Traits: ${memory.coreTraits.join(', ')}`);
  }
  if (memory.importantTopics?.length) {
    parts.push(`Sujets: ${memory.importantTopics.slice(0, 3).join(', ')}`);
  }
  if (memory.style) {
    parts.push(`Style: ${memory.style}`);
  }
  if (memory.relatedPeople && Object.keys(memory.relatedPeople).length) {
    const people = Object.entries(memory.relatedPeople)
      .slice(0, 2)
      .map(([name, rel]) => `${name} (${rel})`)
      .join(', ');
    parts.push(`Personnes: ${people}`);
  }

  if (!parts.length) return '';
  return `\nMémoire: ${parts.join(' | ')}`;
}

module.exports = {
  getSmartMemory,
  setSmartMemory,
  compactMemory,
  formatSmartMemory,
};
