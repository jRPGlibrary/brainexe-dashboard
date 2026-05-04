/**
 * LIFECYCLE CYCLES
 * Orchestrates all 12 systems across different time scales
 */

const shared = require('../shared');

let cycles = [];

/**
 * Start all lifecycle cycles
 */
async function startLifecycleCycles(db) {
  console.log('🔄 Starting Brainee lifecycle cycles...');

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

  console.log(`✅ ${cycles.length} lifecycle cycles started`);
}

/**
 * Stop all cycles (on shutdown)
 */
function stopLifecycleCycles() {
  console.log('⏹️ Stopping lifecycle cycles...');
  for (const cycle of cycles) {
    clearInterval(cycle);
  }
  cycles = [];
  console.log('✅ All cycles stopped');
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

module.exports = {
  startLifecycleCycles,
  stopLifecycleCycles,
  lifeExpectancy
};
