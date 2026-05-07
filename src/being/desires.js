/**
 * MODULE 5 : DESIRES & CRAVINGS
 * What she wants, needs, aspires to
 */

const shared = require('../shared');

class DesireSystem {
  constructor(db) {
    this.db = db;
    this.desires = {
      basicNeeds: {
        social_contact: { current: 40, target: 60, urgency: 'medium' },
        intellectual_stimulation: { current: 50, target: 70, urgency: 'high' },
        emotional_safety: { current: 65, target: 80, urgency: 'high' },
        recognition: { current: 45, target: 60, urgency: 'medium' },
        autonomy: { current: 70, target: 90, urgency: 'medium' }
      },
      cravings: [],
      aspirations: [],
      aversions: ['crypto_spam', 'dismissal', 'being_ignored']
    };
  }

  /**
   * Add a craving
   */
  async addCraving(object, intensity, reason) {
    this.desires.cravings.push({
      object,
      intensity,
      since: new Date(),
      reason
    });

    // Remove craving after 24 hours or fulfilled
    setTimeout(() => {
      this.desires.cravings = this.desires.cravings.filter(c => c.object !== object);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Resolve conflicting desires
   */
  async resolveConflict() {
    const conflicts = this.detectConflicts();
    if (conflicts.length === 0) return null;

    return {
      state: 'conflicted',
      causes: conflicts,
      message: "Je veux deux choses contradictoires en même temps..."
    };
  }

  /**
   * Helper: detect conflicting desires
   */
  detectConflicts() {
    const conflicts = [];

    // Example: if she wants social contact but also alone time
    if (this.desires.basicNeeds.social_contact.current > 70 &&
        this.desires.basicNeeds.autonomy.current > 70) {
      conflicts.push({ type: 'social_vs_autonomy' });
    }

    return conflicts;
  }

  /**
   * Update needs based on recent interactions (v0.12.0 : safe si memory non dispo)
   */
  async updateNeeds() {
    try {
      let hasRecentInteraction = false;
      if (shared.memory) {
        const recentEvents = await shared.memory.recall({ themes: ['interaction'] });
        hasRecentInteraction = recentEvents.length > 0;
      }
      // Si pas d'interaction récente, le besoin social monte
      if (!hasRecentInteraction) {
        this.desires.basicNeeds.social_contact.current = Math.min(
          100,
          this.desires.basicNeeds.social_contact.current + 3
        );
      } else {
        // Interaction récente : légère baisse du besoin social
        this.desires.basicNeeds.social_contact.current = Math.max(
          0,
          this.desires.basicNeeds.social_contact.current - 2
        );
      }
    } catch (_) {
      // Silent fail — ne pas bloquer le cron
    }
  }
}

async function initializeDesires(db) {
  const desires = new DesireSystem(db);
  shared.desires = desires;
  return desires;
}

module.exports = {
  DesireSystem,
  initializeDesires
};
