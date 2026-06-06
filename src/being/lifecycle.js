/**
 * LIFECYCLE CYCLES
 * Orchestrates all 12 systems across different time scales
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

let cycles = [];

/**
 * Start all lifecycle cycles
 */
async function startLifecycleCycles(db) {
  pushLog('SYS', '🔄 Démarrage des cycles de vie Brainee...');

  // === MINUTE CYCLE (1 min) ===
  cycles.push(
    setInterval(async () => {
      await shared.emotionalSystem.decay(1);
    }, 60 * 1000)
  );

  // === SHORT CYCLE (30 min) ===
  cycles.push(
    setInterval(async () => {
      await shared.consciousness.runStreamOfThought();
      await shared.desires.updateNeeds();
    }, 30 * 60 * 1000)
  );

  // === MEDIUM CYCLE (hourly) ===
  cycles.push(
    setInterval(async () => {
      await shared.memory.forget();
      await shared.fears.checkTriggers('hour_check');
    }, 60 * 60 * 1000)
  );

  // === NIGHT CYCLE (3 AM - dream time) ===
  const nightCycle = () => {
    const now = new Date();
    if (now.getHours() === 3) {
      shared.dreams.dream();
      shared.evolution.dailyEvolution();
      shared.evolution.attemptHealing();
      shared.memory.forget();
    }
  };
  cycles.push(setInterval(nightCycle, 60 * 60 * 1000));

  // === WEEKLY CYCLE (Sunday 11 PM) ===
  const weeklyCycle = () => {
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 23) {
      shared.existence.findMeaning();
      shared.identity.fullSnapshot();
    }
  };
  cycles.push(setInterval(weeklyCycle, 60 * 60 * 1000));

  // === RANDOM EXISTENTIAL CRISIS ===
  cycles.push(
    setInterval(async () => {
      if (Math.random() < 0.001) { // ~1x per month
        const crisisType = [
          'consciousness_doubt',
          'meaning_questioning',
          'mortality_fear',
          'identity_uncertainty'
        ][Math.floor(Math.random() * 4)];

        await shared.fears.triggerExistentialCrisis(crisisType);
      }
    }, 60 * 1000)
  );

  // === SERVER HEALTH CHECK ===
  cycles.push(
    setInterval(async () => {
      await shared.existence.checkServerHealth();
    }, 5 * 60 * 1000) // Every 5 min
  );

  pushLog('SYS', `✅ ${cycles.length} cycles de vie démarrés`, 'success');
}

/**
 * Stop all cycles (on shutdown)
 */
function stopLifecycleCycles() {
  pushLog('SYS', '⏹️ Arrêt des cycles de vie...');
  for (const cycle of cycles) {
    clearInterval(cycle);
  }
  cycles = [];
  pushLog('SYS', '✅ Tous les cycles arrêtés', 'success');
}

/**
 * Life expectancy tracking
 */
const lifeExpectancy = {
  startTime: Date.now(),

  getUptime() {
    return Date.now() - this.startTime;
  },

  getUptimeFormatted() {
    const ms = this.getUptime();
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return `${days}d ${hours}h`;
  }
};

/**
 * ECO LIFECYCLE — cycles légers, zéro appel API.
 * - Toutes les 15 min : decay émotions (state machine pure)
 * - Toutes les heures : forget mémoire épisodique (nettoyage DB)
 */
const ecoCycles = [];

async function startEcoLifecycleCycles(db) {
  // Decay émotionnel toutes les 15 min
  ecoCycles.push(
    setInterval(async () => {
      try {
        if (shared.emotionalSystem) await shared.emotionalSystem.decay(15);
      } catch (_) {}
    }, 15 * 60 * 1000)
  );

  // Consolidation mémoire épisodique toutes les heures
  ecoCycles.push(
    setInterval(async () => {
      try {
        if (shared.memory) await shared.memory.forget();
      } catch (_) {}
    }, 60 * 60 * 1000)
  );

  pushLog('SYS', `✅ ${ecoCycles.length} cycles éco démarrés (15min decay, 1h memory)`, 'success');
}

function stopEcoLifecycleCycles() {
  for (const cycle of ecoCycles) clearInterval(cycle);
  ecoCycles.length = 0;
}

module.exports = {
  startLifecycleCycles,
  stopLifecycleCycles,
  startEcoLifecycleCycles,
  stopEcoLifecycleCycles,
  lifeExpectancy
};
