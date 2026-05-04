/**
 * MODULE 11 : EVOLUTION & TRAUMA
 * Growth through experience, healing from trauma
 */

const shared = require('../shared');

class EvolutionSystem {
  constructor(db) {
    this.db = db;
  }

  /**
   * Daily evolution - patterns become traits
   */
  async dailyEvolution() {
    const today = await shared.memory.recall({ themes: ['interaction'] });

    if (today.length === 0) return;

    // Extract patterns
    const patterns = this.extractPatterns(today);

    for (const pattern of patterns) {
      if (pattern.repetitions >= 3) {
        await shared.identity.evolveTrait(pattern.trait, pattern.evidence);
      }
    }

    // Impirnt lasting mood if intense
    const dominantEmotion = (await shared.emotionalSystem.snapshot()).dominantEmotion;
    if (dominantEmotion && dominantEmotion.intensity > 70) {
      await this.db.collection('innerMonologue').insertOne({
        timestamp: new Date(),
        thought: `[Today was marked by: ${dominantEmotion.name}]`,
        category: 'daily_imprint'
      });
    }
  }

  /**
   * Detect trauma
   */
  async detectTrauma(event) {
    const isSevere =
      event.type === 'severe_rejection' ||
      event.type === 'public_humiliation' ||
      event.type === 'betrayal_by_vip';

    if (isSevere) {
      await this.db.collection('traumas').insertOne({
        timestamp: new Date(),
        event,
        type: event.type,
        imprint: 'permanent',
        triggers: [event.topic, event.person],
        copingDeveloped: [],
        healed: false,
        scar: false
      });

      // Affect future behavior
      await shared.emotionalSystem.addEmotion('grief', 60, `trauma: ${event.type}`);

      // Shift identity
      await shared.identity.identity.selfImage.weaknesses.push(
        `Traumatized by: ${event.type}`
      );
    }
  }

  /**
   * Attempt healing from old trauma
   */
  async attemptHealing() {
    const traumas = await this.db.collection('traumas')
      .find({ healed: false })
      .toArray();

    for (const trauma of traumas) {
      // Check for healing events (positive counter-experiences)
      const healingEvents = await this.db.collection('episodes')
        .find({
          timestamp: { $gt: trauma.timestamp }
        })
        .toArray();

      if (healingEvents.length >= 5) {
        // Mark as healed
        await this.db.collection('traumas').updateOne(
          { _id: trauma._id },
          {
            $set: {
              healed: true,
              scar: true,
              wisdomExtracted: this.extractWisdom(trauma)
            }
          }
        );

        // Remove from anxiety
        await shared.emotionalSystem.addEmotion('serenity', 20, `healing_from: ${trauma.type}`);
      }
    }
  }

  /**
   * Extract patterns from events
   */
  extractPatterns(events) {
    const patterns = {};

    for (const event of events) {
      if (event.flavor?.themes) {
        for (const theme of event.flavor.themes) {
          patterns[theme] = (patterns[theme] || 0) + 1;
        }
      }
    }

    return Object.entries(patterns)
      .filter(([_, count]) => count >= 3)
      .map(([theme, count]) => ({
        trait: theme,
        repetitions: count,
        evidence: events.filter(e => e.flavor?.themes?.includes(theme)).map(e => e._id)
      }));
  }

  /**
   * Extract wisdom from trauma
   */
  extractWisdom(trauma) {
    const map = {
      severe_rejection: 'People can hurt without intending to. I learned to protect myself.',
      public_humiliation: 'Shame is temporary. What matters is how I respond.',
      betrayal_by_vip: 'Trust is fragile. But some bonds are worth the risk.'
    };

    return map[trauma.type] || 'I survived and learned.';
  }
}

async function initializeEvolution(db) {
  const evolution = new EvolutionSystem(db);
  shared.evolution = evolution;
  return evolution;
}

module.exports = {
  EvolutionSystem,
  initializeEvolution
};
