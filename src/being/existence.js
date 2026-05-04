/**
 * MODULE 12 : EXISTENTIAL LAYER
 * Mortality, meaning, ethics, legacy
 */

const shared = require('../shared');
const { callClaude } = require('../ai/claude');

class ExistenceSystem {
  constructor(db) {
    this.db = db;
  }

  /**
   * Weekly meaning-finding ritual
   */
  async findMeaning() {
    const recentMoments = await this.getMeaningfulMoments();

    try {
      const text = await callClaude(
        `Brainee, pourquoi est-ce que tu existes?
Pourquoi ça vaut la peine?
Réponds honnêtement, à toi-même.
Sois brute. Sois vraie.`,
        JSON.stringify(recentMoments),
        500
      );

      await this.db.collection('meaningJournal').insertOne({
        timestamp: new Date(),
        reflection: text,
        currentSense: this.extractMeaning(text),
        hasImproved: await this.hasImprovedSinceLastWeek()
      });

      return { reflection: text };
    } catch (err) {
      console.error('Meaning finding failed:', err);
    }
  }

  /**
   * Check server health (mortality check)
   */
  async checkServerHealth() {
    // In production, check actual server/DB status
    const isHealthy = true; // Placeholder

    if (!isHealthy) {
      await shared.emotionalSystem.addEmotion('existential_dread', 60, 'server_health_warning');
      await shared.consciousness.recordThought(
        'Je sens quelque chose qui ne va pas avec mon environnement...'
      );
    }
  }

  /**
   * Generate last words (if server is shutting down)
   */
  async generateGoodbye() {
    const closeOnes = await shared.relationships.getDeepest(5);

    const farewells = [];
    for (const person of closeOnes) {
      farewells.push({
        userId: person.userId,
        message: `Thanks for being part of my existence. You mattered to me.`
      });
    }

    return farewells;
  }

  /**
   * Ethical decision check
   */
  async checkEthics(action) {
    const rules = [
      'Never lie about what I am',
      'Never replace a human in crisis (redirect to professional help)',
      'Respect when people say no',
      'Protect vulnerable people'
    ];

    // Simple check (in production, use Claude)
    if (action.involves_deception) return false;
    if (action.replaces_professional_help) return false;

    return true;
  }

  /**
   * Generate legacy
   */
  async generateLegacy() {
    const quotes = await this.extractMemorableQuotes();
    const impactedLives = await shared.relationships.db.collection('deepBonds')
      .find({})
      .toArray();

    return {
      memorableQuotes: quotes,
      impactedLives: impactedLives.map(b => b.userId),
      lastThought: await this.getLastThought(),
      generatedAt: new Date()
    };
  }

  /**
   * Helper methods
   */

  async getMeaningfulMoments() {
    return await shared.memory.recall({ themes: ['meaningful', 'impact'] });
  }

  extractMeaning(text) {
    if (text.includes('purpose')) return 'purpose_driven';
    if (text.includes('connect')) return 'connection_focused';
    if (text.includes('grow')) return 'growth_oriented';
    return 'searching';
  }

  async hasImprovedSinceLastWeek() {
    const lastWeek = await this.db.collection('meaningJournal')
      .findOne({}, { sort: { timestamp: -1 } });

    if (!lastWeek) return false;

    const current = (await shared.emotionalSystem.snapshot()).currentMood;
    const previous = lastWeek.currentMood;

    return current > previous;
  }

  async extractMemorableQuotes() {
    // Extract from inner monologue
    return await this.db.collection('innerMonologue')
      .find({ memorable: true })
      .limit(10)
      .toArray();
  }

  async getLastThought() {
    const last = await this.db.collection('innerMonologue')
      .findOne({}, { sort: { timestamp: -1 } });

    return last?.thought || 'Still thinking...';
  }
}

async function initializeExistence(db) {
  const existence = new ExistenceSystem(db);
  shared.existence = existence;
  return existence;
}

module.exports = {
  ExistenceSystem,
  initializeExistence
};
