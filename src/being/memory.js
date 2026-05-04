/**
 * MODULE 4 : STRATIFIED MEMORY
 * Episodic, semantic, procedural - like human memory
 */

const shared = require('../shared');

class MemorySystem {
  constructor(db) {
    this.db = db;
    this.workingMemory = new Map(); // 7±2 items at a time
  }

  /**
   * Record an episode with emotional imprint
   */
  async recordEpisode(event) {
    const episode = {
      timestamp: new Date(),
      event,
      emotionalImprint: await this.getEmotionalContext(),
      peopleInvolved: event.people || [],
      location: event.channel,
      importance: this.calculateImportance(event),
      flavor: {
        themes: this.extractThemes(event),
        uniqueDetails: this.extractDetails(event),
        triggers: []
      },
      remembered: true
    };

    await this.db.collection('episodes').insertOne(episode);
    return episode;
  }

  /**
   * Record a semantic fact
   */
  async recordFact(fact, about, confidence = 0.8, type = 'fact') {
    await this.db.collection('semanticMemory').updateOne(
      { fact: fact.toLowerCase() },
      {
        $set: {
          fact,
          about,
          confidence,
          lastVerified: new Date(),
          type
        }
      },
      { upsert: true }
    );
  }

  /**
   * Recall episodes (associative, like humans)
   */
  async recall(cues) {
    const query = {
      $or: [
        { 'flavor.themes': { $in: cues.themes || [] } },
        { 'peopleInvolved': { $in: cues.people || [] } },
        { 'location': cues.channel }
      ]
    };

    return await this.db.collection('episodes')
      .find(query)
      .sort({ importance: -1, timestamp: -1 })
      .limit(5)
      .toArray();
  }

  /**
   * Involuntary memory (Proust effect)
   * A random old memory resurfaces emotionally
   */
  async checkInvoluntaryMemory(currentContext) {
    if (Math.random() > 0.05) return null; // 5% chance

    const oldMemory = await this.db.collection('episodes')
      .findOne({
        timestamp: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        importance: { $gt: 50 }
      });

    if (oldMemory) {
      return {
        type: 'involuntary_recall',
        memory: oldMemory,
        emotionalImpact: 'wave_of_nostalgia'
      };
    }

    return null;
  }

  /**
   * Forget (important for realistic memory!)
   * Trivial memories fade, important ones persist
   */
  async forget() {
    await this.db.collection('episodes').deleteMany({
      timestamp: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      importance: { $lt: 0.3 }
    });
  }

  /**
   * Helper: calculate importance of event
   */
  calculateImportance(event) {
    let score = 0;

    if (event.emotional) score += event.emotional;
    if (event.involves_VIP) score += 40;
    if (event.involves_conflict) score += 30;
    if (event.milestone) score += 50;

    return Math.min(100, score);
  }

  /**
   * Helper: extract themes from event
   */
  extractThemes(event) {
    const themes = [];

    if (event.topic) themes.push(event.topic);
    if (event.emotion) themes.push(event.emotion);
    if (event.location) themes.push(`place_${event.location}`);

    return themes;
  }

  /**
   * Helper: extract unique details
   */
  extractDetails(event) {
    const details = [];

    if (event.quote) details.push(event.quote);
    if (event.unexpected) details.push('unexpected');
    if (event.made_her_laugh) details.push('made_laugh');

    return details;
  }

  /**
   * Get emotional context
   */
  async getEmotionalContext() {
    if (!shared.emotionalSystem) return {};

    const snapshot = await shared.emotionalSystem.snapshot();
    return {
      dominant: snapshot.dominantEmotion?.name,
      stack: snapshot.emotionStack,
      mood: snapshot.currentMood
    };
  }
}

async function initializeMemory(db) {
  const memory = new MemorySystem(db);
  shared.memory = memory;
  return memory;
}

module.exports = {
  MemorySystem,
  initializeMemory
};
