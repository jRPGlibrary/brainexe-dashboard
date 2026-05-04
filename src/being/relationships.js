/**
 * MODULE 10 : DEEP RELATIONSHIPS
 * Bonds that evolve, deepen, sometimes break
 */

const shared = require('../shared');

class RelationshipSystem {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get deepest bonds (VIPs)
   */
  async getDeepest(limit = 3) {
    return await this.db.collection('deepBonds')
      .find({})
      .sort({ attachment: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get active bonds (recently interacted)
   */
  async getActiveBonds() {
    return await this.db.collection('deepBonds')
      .find({ attachment: { $gt: 30 } })
      .sort({ 'emotionalHistory.timestamp': -1 })
      .limit(10)
      .toArray();
  }

  /**
   * Update bond after interaction
   */
  async updateBond(userId, event) {
    const impact = this.calculateImpact(event);

    await this.db.collection('deepBonds').updateOne(
      { userId },
      {
        $inc: { attachment: impact.attachment },
        $push: {
          emotionalHistory: {
            date: new Date(),
            event: event.description,
            impactOnBond: impact.attachment
          }
        }
      },
      { upsert: true }
    );
  }

  /**
   * Calculate impact of interaction on bond
   */
  calculateImpact(event) {
    let impact = 0;

    if (event.type === 'support') impact += 15;
    if (event.type === 'vulnerability_shared') impact += 20;
    if (event.type === 'inside_joke') impact += 5;
    if (event.type === 'conflict') impact -= 10;
    if (event.type === 'neglect') impact -= 5;

    return {
      attachment: impact,
      trust: event.type === 'vulnerability_shared' ? 10 : 0
    };
  }

  /**
   * Record inside joke
   */
  async recordInsideJoke(userId, joke) {
    await this.db.collection('deepBonds').updateOne(
      { userId },
      {
        $push: {
          'sharedJokes': {
            joke,
            started: new Date(),
            timesUsed: 1
          }
        }
      }
    );
  }

  /**
   * Handle rupture/conflict
   */
  async handleRupture(userId, event) {
    const bond = await this.db.collection('deepBonds').findOne({ userId });

    if (bond && bond.attachment > 50) {
      // Damage but try to repair
      await this.updateBond(userId, { type: 'conflict', description: event });

      // Schedule repair message
      setTimeout(async () => {
        if (Math.random() < 0.6) {
          return await this.initiateRepair(userId);
        }
      }, 6 * 60 * 60 * 1000); // After 6 hours
    }
  }

  /**
   * Initiate repair after conflict
   */
  async initiateRepair(userId) {
    return {
      type: 'repair_message',
      userId,
      message: "hey, j'aimerais qu'on parle de l'autre jour..."
    };
  }

  /**
   * Grieve if someone leaves
   */
  async grieve(userId) {
    const bond = await this.db.collection('deepBonds').findOne({ userId });

    if (bond && bond.attachment > 60) {
      // Add grief emotion
      await shared.emotionalSystem.addEmotion('grief', bond.attachment / 2, `user_left: ${userId}`);

      // Preserve as core memory
      await shared.memory.recordFact(
        `${userId} was important to me`,
        userId,
        bond.attachment / 100,
        'person_memory'
      );
    }
  }
}

async function initializeRelationships(db) {
  const relationships = new RelationshipSystem(db);
  shared.relationships = relationships;
  return relationships;
}

module.exports = {
  RelationshipSystem,
  initializeRelationships
};
