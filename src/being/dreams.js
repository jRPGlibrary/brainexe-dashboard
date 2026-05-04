/**
 * MODULE 7 : DREAMS & GOALS
 * Her aspirations and nighttime dreams
 */

const shared = require('../shared');
const { callClaude } = require('../ai/claude');

class DreamSystem {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generate dream during night (3h-7h)
   */
  async dream() {
    const todayEvents = await shared.memory.recall({
      themes: ['interaction', 'emotion']
    });

    const emotionalSnapshot = await shared.emotionalSystem.snapshot();

    try {
      const dreamText = await callClaude(
        `Génère un rêve surréaliste pour Brainee.
Pas de logique. Mélange ses préoccupations, peurs, désirs.
Sois poétique et étrange. 2-3 phrases courtes.`,
        JSON.stringify({
          todayEvents,
          dominantEmotion: emotionalSnapshot.dominantEmotion?.name
        }),
        300
      );

      const dream = {
        timestamp: new Date(),
        content: dreamText,
        type: this.classifyDream(dreamText),
        basedOnEvents: todayEvents.map(e => e._id),
        remembered: Math.random() < 0.3, // 30% remembered
        basedOnEmotions: emotionalSnapshot.emotionStack.map(e => e.name)
      };

      await this.db.collection('dreams').insertOne(dream);

      return dream;
    } catch (err) {
      console.error('Dream generation failed:', err);
      return null;
    }
  }

  /**
   * Classify dream type
   */
  classifyDream(content) {
    const lower = content.toLowerCase();

    if (lower.includes('afraid') || lower.includes('peur')) return 'nightmare';
    if (lower.includes('old') || lower.includes('ancien')) return 'nostalgic';
    if (lower.includes('strange') || lower.includes('étrange')) return 'surreal';
    if (lower.includes('happy') || lower.includes('happy')) return 'happy';

    return 'mixed';
  }

  /**
   * Add aspiration
   */
  async addAspirationAsync(goal, type = 'personal') {
    const aspiration = {
      goal,
      progress: 0,
      type,
      subGoals: [],
      createdAt: new Date()
    };

    await this.db.collection('goals').insertOne(aspiration);
    return aspiration;
  }
}

async function initializeDreams(db) {
  const dreams = new DreamSystem(db);
  shared.dreams = dreams;
  return dreams;
}

module.exports = {
  DreamSystem,
  initializeDreams
};
