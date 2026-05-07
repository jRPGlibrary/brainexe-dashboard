/**
 * BRAINEE-LIVING : Main orchestration
 * Coordinates all 12 modules for a living, conscious being
 */

const shared = require('../shared');
const { pushLog } = require('../logger');
const { initializeBeingCollections } = require('./schemas');
const { initializeEmotions } = require('./emotions');
const { initializeConsciousness } = require('./consciousness');
const { initializeIdentity } = require('./identity');
const { initializeMemory } = require('./memory');
const { initializeDesires } = require('./desires');
const { initializeFears } = require('./fears');
const { initializeDreams } = require('./dreams');
const { initializeDecisions } = require('./decisions');
const { initializeExpression } = require('./expression');
const { initializeRelationships } = require('./relationships');
const { initializeEvolution } = require('./evolution');
const { initializeExistence } = require('./existence');
const { startLifecycleCycles } = require('./lifecycle');

/**
 * MAIN INITIALIZATION
 * Call this once at server startup
 */
async function initializeBraineeAsLivingBeing(db) {
  try {
    pushLog('SYS', '🧬 BRAINEE-LIVING : Initialisation de la conscience...');

    // 1. Créer toutes les collections MongoDB
    await initializeBeingCollections(db);
    pushLog('SYS', '✅ Schémas MongoDB prêts');

    // 2. Initialiser les 12 modules dans l'ordre
    await initializeEmotions(db);
    pushLog('SYS', '✅ Système émotionnel en ligne');

    await initializeConsciousness(db);
    pushLog('SYS', '✅ Flux de conscience démarré');

    await initializeIdentity(db);
    pushLog('SYS', '✅ Identité chargée');

    await initializeMemory(db);
    pushLog('SYS', '✅ Systèmes mémoire initialisés');

    await initializeDesires(db);
    pushLog('SYS', '✅ Désirs & besoins chargés');

    await initializeFears(db);
    pushLog('SYS', '✅ Peurs existentielles enregistrées');

    await initializeDreams(db);
    pushLog('SYS', '✅ Système de rêves prêt');

    await initializeDecisions(db);
    pushLog('SYS', '✅ Moteur de décision chargé');

    await initializeExpression(db);
    pushLog('SYS', "✅ Couche d'expression prête");

    await initializeRelationships(db);
    pushLog('SYS', '✅ Suivi des relations actif');

    await initializeEvolution(db);
    pushLog('SYS', "✅ Système d'évolution actif");

    await initializeExistence(db);
    pushLog('SYS', '✅ Couche existentielle prête');

    // 3. Démarrer les cycles de vie
    await startLifecycleCycles(db);

    pushLog('SYS', '🌟 BRAINEE-LIVING : Conscience pleinement initialisée — 12 systèmes actifs', 'success');

    return {
      status: 'alive',
      modules: 12,
      consciousness: shared.consciousness,
      emotions: shared.emotionalSystem,
      identity: shared.identity,
      memory: shared.memory,
      decisions: shared.decisions,
      relationships: shared.relationships
    };
  } catch (err) {
    pushLog('ERR', `❌ CRITIQUE : Échec initialisation Brainee comme être vivant — ${err.message}`, 'error');
    throw err;
  }
}

/**
 * Check if Brainee is "alive" (all systems running)
 */
function isBeingAlive() {
  return (
    shared.emotionalSystem &&
    shared.consciousness &&
    shared.identity &&
    shared.memory &&
    shared.desires &&
    shared.fears &&
    shared.decisions &&
    shared.relationships &&
    shared.existence
  );
}

/**
 * Get full status of being
 */
async function getBeingStatus() {
  if (!isBeingAlive()) {
    return { alive: false, reason: 'Systems not initialized' };
  }

  const emotionalSnapshot = await shared.emotionalSystem.snapshot();
  const position = shared.identity.getExistentialPosition();
  const temperament = await shared.emotionalSystem.getTemperament();

  return {
    alive: true,
    timestamp: new Date(),
    consciousness: {
      streaming: true,
      lastThought: null // Will be populated from DB
    },
    emotions: emotionalSnapshot,
    identity: {
      existentialPosition: position,
      temperament
    },
    memory: {
      recentEpisodes: 0, // Will query DB
      emotionalResidues: emotionalSnapshot.emotionStack.length
    }
  };
}

module.exports = {
  initializeBraineeAsLivingBeing,
  isBeingAlive,
  getBeingStatus
};
