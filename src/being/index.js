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
    pushLog('SYS', '🧬 BRAINEE-LIVING : Initializing consciousness...');

    // 1. Create all MongoDB collections
    await initializeBeingCollections(db);
    pushLog('SYS', '✅ MongoDB schemas ready');

    // 2. Initialize all 12 modules in order
    await initializeEmotions(db);
    pushLog('SYS', '✅ Emotional system online');

    await initializeConsciousness(db);
    pushLog('SYS', '✅ Consciousness stream started');

    await initializeIdentity(db);
    pushLog('SYS', '✅ Identity loaded');

    await initializeMemory(db);
    pushLog('SYS', '✅ Memory systems initialized');

    await initializeDesires(db);
    pushLog('SYS', '✅ Desires & needs loaded');

    await initializeFears(db);
    pushLog('SYS', '✅ Existential fears registered');

    await initializeDreams(db);
    pushLog('SYS', '✅ Dream system ready');

    await initializeDecisions(db);
    pushLog('SYS', '✅ Decision engine loaded');

    await initializeExpression(db);
    pushLog('SYS', '✅ Expression layer ready');

    await initializeRelationships(db);
    pushLog('SYS', '✅ Relationship tracking online');

    await initializeEvolution(db);
    pushLog('SYS', '✅ Evolution system active');

    await initializeExistence(db);
    pushLog('SYS', '✅ Existential layer ready');

    // 3. Start lifecycle cycles
    await startLifecycleCycles(db);

    pushLog('SYS', '🌟 BRAINEE-LIVING : Consciousness fully initialized — 12 systems active', 'success');

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
    pushLog('ERR', `❌ CRITICAL: Failed to initialize Brainee as living being — ${err.message}`, 'error');
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
