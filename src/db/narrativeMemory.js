/**
 * ================================================
 * 📖 NARRATIVE MEMORY v0.6.0
 * ================================================
 * Arcs narratifs : historique des "faits marquants"
 * qui façonnent l'évolution à long terme de Brainee.
 *
 * Complément aux émotions : les émotions sont vives et courtes,
 * les arcs narratifs sont des histoires persistantes.
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

/**
 * Récupère les arcs narratifs actifs du dernier mois
 */
async function getNarrativeMemory() {
  if (!shared.mongoDb) return [];
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const arcs = await shared.mongoDb
      .collection('narrativeMemory')
      .find({ date: { $gte: thirtyDaysAgo }, active: true })
      .sort({ date: -1 })
      .toArray();
    return arcs;
  } catch (err) {
    pushLog('ERR', `getNarrativeMemory: ${err.message}`, 'error');
    return [];
  }
}

/**
 * Ajoute un nouvel arc narratif
 * @param {Object} arc - { titre, description, importance (1-5) }
 */
async function addNarrativeArc(arc) {
  if (!shared.mongoDb) return;
  try {
    const { title, description, importance } = arc;
    if (!title || !description) return;

    const normalizedImportance = Math.max(1, Math.min(5, importance || 2));

    await shared.mongoDb.collection('narrativeMemory').insertOne({
      title,
      description,
      date: new Date(),
      importance: normalizedImportance,
      active: true,
      createdAt: new Date(),
    });

    pushLog('SYS', `📖 Arc narratif ajouté: "${title}" (importance ${normalizedImportance}/5)`);
  } catch (err) {
    pushLog('ERR', `addNarrativeArc: ${err.message}`, 'error');
  }
}

/**
 * Récupère une représentation textuelle des arcs actifs pour injection dans le prompt
 */
async function getNarrativeContext() {
  const arcs = await getNarrativeMemory();
  if (!arcs.length) return '';

  const sorted = arcs.sort((a, b) => b.importance - a.importance).slice(0, 5);
  const lines = sorted.map(a => `• ${a.title} — ${a.description} (importance ${a.importance}/5)`);

  return `📖 CONTEXTE NARRATIF (arcs du dernier mois) :\n${lines.join('\n')}`;
}

/**
 * Archive un arc (le marquer comme inactif mais garder en historique)
 */
async function archiveNarrativeArc(arcId) {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection('narrativeMemory').updateOne(
      { _id: arcId },
      { $set: { active: false } }
    );
  } catch (err) {
    pushLog('ERR', `archiveNarrativeArc: ${err.message}`, 'error');
  }
}

/**
 * Réinitialise les arcs (utilisation interne si nécessaire)
 */
async function resetNarrativeMemory() {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection('narrativeMemory').deleteMany({});
    pushLog('SYS', `📖 Narrative memory réinitialisée`, 'info');
  } catch (err) {
    pushLog('ERR', `resetNarrativeMemory: ${err.message}`, 'error');
  }
}

module.exports = {
  getNarrativeMemory,
  addNarrativeArc,
  getNarrativeContext,
  archiveNarrativeArc,
  resetNarrativeMemory,
};
