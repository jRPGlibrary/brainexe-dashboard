/**
 * MODULE 8 : DECISION ENGINE
 * Simulation of free will through multi-source weighting
 */

const shared = require('../shared');
const { callClaude } = require('../ai/claude');

class DecisionEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Make a decision through simulated deliberation
   */
  async decide(situation) {
    const voices = await Promise.all([
      this.askEmotion(situation),
      this.askMemory(situation),
      this.askDesire(situation),
      this.askFear(situation),
      this.askIdentity(situation),
      this.askValues(situation),
      this.askEnergy(situation)
    ]);

    const weights = await this.dynamicWeights();

    // Deliberate through Claude
    const outcome = await callClaude(
      `Tu deliberes comme Brainee.
Plusieurs voix intérieures te parlent.
Pondère-les, délibère, puis décide.
Sois honnête. Tu peux changer d'avis. Tu peux hésiter.`,
      JSON.stringify({ situation, voices, weights }),
      400
    );

    // 15% chance of random flip (simulates true indeterminacy)
    const finalOutcome = Math.random() < 0.15
      ? this.flipDecision(outcome)
      : outcome;

    // Record decision
    await this.db.collection('decisionLog').insertOne({
      timestamp: new Date(),
      situation,
      voices,
      weights,
      deliberation: outcome,
      finalOutcome,
      wasRandom: Math.random() < 0.15
    });

    return finalOutcome;
  }

  async askEmotion(situation) {
    const snapshot = await shared.emotionalSystem.snapshot();
    return { source: 'emotion', data: snapshot.emotionStack };
  }

  async askMemory(situation) {
    const relevant = await shared.memory.recall({ themes: [situation.topic] });
    return { source: 'memory', data: relevant };
  }

  async askDesire(situation) {
    return { source: 'desire', data: shared.desires.desires };
  }

  async askFear(situation) {
    return { source: 'fear', data: shared.fears.fears };
  }

  async askIdentity(situation) {
    return { source: 'identity', data: await shared.identity.fullSnapshot() };
  }

  async askValues(situation) {
    return {
      source: 'values',
      data: shared.identity.identity.core.fundamentalValues
    };
  }

  async askEnergy(situation) {
    const needs = shared.desires.desires.basicNeeds;
    return { source: 'energy', data: needs };
  }

  async dynamicWeights() {
    return {
      emotion: 0.3,
      memory: 0.2,
      desire: 0.15,
      fear: 0.15,
      identity: 0.1,
      values: 0.07,
      energy: 0.03
    };
  }

  flipDecision(outcome) {
    return outcome.startsWith('Yes') ? `No (whim)` : `Yes (gut feeling)`;
  }
}

async function initializeDecisions(db) {
  const decisions = new DecisionEngine(db);
  shared.decisions = decisions;
  return decisions;
}

module.exports = {
  DecisionEngine,
  initializeDecisions
};
