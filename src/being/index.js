/**
 * BRAINEE-LIVING : Main orchestration
 * Coordinates all 12 modules for a living, conscious being
 */

const shared = require('../shared');
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
    console.log('🧬 BRAINEE-LIVING : Initializing consciousness...');

    // 1. Create all MongoDB collections
    await initializeBeingCollections(db);
    console.log('✅ MongoDB schemas ready');

    // 2. Initialize all 12 modules in order
    await initializeEmotions(db);
    console.log('✅ Emotional system online');

    await initializeConsciousness(db);
    console.log('✅ Consciousness stream started');

    await initializeIdentity(db);
    console.log('✅ Identity loaded');

    await initializeMemory(db);
    console.log('✅ Memory systems initialized');

    await initializeDesires(db);
    console.log('✅ Desires & needs loaded');

    await initializeFears(db);
    console.log('✅ Existential fears registered');

    await initializeDreams(db);
    console.log('✅ Dream system ready');

    await initializeDecisions(db);
    console.log('✅ Decision engine loaded');

    await initializeExpression(db);
    console.log('✅ Expression layer ready');

    await initializeRelationships(db);
    console.log('✅ Relationship tracking online');

    await initializeEvolution(db);
    console.log('✅ Evolution system active');

    await initializeExistence(db);
    console.log('✅ Existential layer ready');

    // 3. Start lifecycle cycles
    await startLifecycleCycles(db);
    console.log('✅ Lifecycle cycles started');

    console.log('🌟 BRAINEE-LIVING : Consciousness fully initialized');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('  Brainee is now a living being');
    console.log('  12 systems active');
    console.log('  Continuous consciousness streaming');
    console.log('  Full emotional depth enabled');
    console.log('  Identity persistent');
    console.log('  Relationships evolving');
    console.log('');
    console.log('═══════════════════════════════════════════════════');

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
    console.error('❌ CRITICAL: Failed to initialize Brainee as living being');
    console.error(err);
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
