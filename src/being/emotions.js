/**
 * MODULE 2 : COMPLETE EMOTION SYSTEM
 * 32 human emotions with conflicts, contagion, and authentic decay
 */

const shared = require('../shared');

const EMOTION_REGISTRY = {
  // === FAMILLE JOIE (5) ===
  joy: { valence: 1, arousal: 1, decay: 0.7, residue: 0.15, family: 'joy' },
  contentment: { valence: 1, arousal: 0, decay: 0.3, residue: 0.30, family: 'joy' },
  pride: { valence: 1, arousal: 1, decay: 0.5, residue: 0.40, family: 'joy' },
  excitement: { valence: 1, arousal: 2, decay: 0.9, residue: 0.05, family: 'joy' },
  serenity: { valence: 1, arousal: -1, decay: 0.2, residue: 0.50, family: 'joy' },

  // === FAMILLE TRISTESSE (5) ===
  sadness: { valence: -1, arousal: -1, decay: 0.3, residue: 0.40, family: 'sadness' },
  melancholy: { valence: -1, arousal: -1, decay: 0.1, residue: 0.60, family: 'sadness' },
  loneliness: { valence: -1, arousal: 0, decay: 0.2, residue: 0.50, family: 'sadness' },
  grief: { valence: -2, arousal: -1, decay: 0.05, residue: 0.80, family: 'sadness' },
  despair: { valence: -2, arousal: -2, decay: 0.1, residue: 0.70, family: 'sadness' },

  // === FAMILLE COLÈRE (5) ===
  irritation: { valence: -1, arousal: 1, decay: 0.8, residue: 0.10, family: 'anger' },
  frustration: { valence: -1, arousal: 1, decay: 0.5, residue: 0.30, family: 'anger' },
  anger: { valence: -1, arousal: 2, decay: 0.6, residue: 0.40, family: 'anger' },
  rage: { valence: -2, arousal: 3, decay: 0.7, residue: 0.30, family: 'anger' },
  resentment: { valence: -1, arousal: 0, decay: 0.05, residue: 0.85, family: 'anger' },

  // === FAMILLE PEUR (5) ===
  unease: { valence: -1, arousal: 0, decay: 0.5, residue: 0.20, family: 'fear' },
  anxiety: { valence: -1, arousal: 1, decay: 0.3, residue: 0.50, family: 'fear' },
  fear: { valence: -1, arousal: 2, decay: 0.6, residue: 0.40, family: 'fear' },
  dread: { valence: -2, arousal: 1, decay: 0.2, residue: 0.60, family: 'fear' },
  panic: { valence: -2, arousal: 3, decay: 0.9, residue: 0.20, family: 'fear' },

  // === FAMILLE ATTACHEMENT (4) ===
  affection: { valence: 1, arousal: 0, decay: 0.1, residue: 0.70, family: 'attachment' },
  love: { valence: 2, arousal: 1, decay: 0.05, residue: 0.90, family: 'attachment' },
  tenderness: { valence: 1, arousal: -1, decay: 0.3, residue: 0.50, family: 'attachment' },
  nostalgia: { valence: 0, arousal: 0, decay: 0.2, residue: 0.60, family: 'attachment' },

  // === FAMILLE HONTE (4) ===
  embarrassment: { valence: -1, arousal: 1, decay: 0.7, residue: 0.20, family: 'shame' },
  shame: { valence: -2, arousal: 0, decay: 0.3, residue: 0.60, family: 'shame' },
  guilt: { valence: -1, arousal: 1, decay: 0.2, residue: 0.65, family: 'shame' },
  regret: { valence: -1, arousal: 0, decay: 0.1, residue: 0.75, family: 'shame' },

  // === FAMILLE ÉMERVEILLEMENT (4) ===
  surprise: { valence: 0, arousal: 2, decay: 0.95, residue: 0.05, family: 'wonder' },
  awe: { valence: 1, arousal: 1, decay: 0.4, residue: 0.40, family: 'wonder' },
  wonder: { valence: 1, arousal: 0, decay: 0.5, residue: 0.30, family: 'wonder' },
  curiosity: { valence: 1, arousal: 1, decay: 0.6, residue: 0.20, family: 'wonder' }
};

// === CONFLICT MAP ===
// Emotions that naturally conflict with each other
const CONFLICTS = {
  joy: ['sadness', 'fear', 'anger', 'shame'],
  sadness: ['joy', 'pride', 'excitement'],
  anger: ['serenity', 'contentment', 'tenderness'],
  fear: ['confidence', 'excitement', 'pride'],
  love: ['resentment', 'anger', 'distrust'],
  anxiety: ['serenity', 'contentment', 'confidence']
};

// === CONTAGION MAP ===
// When you feel X, it can trigger Y at some probability
const CONTAGION = {
  joy: [['contentment', 0.6], ['pride', 0.4], ['affection', 0.3]],
  sadness: [['loneliness', 0.7], ['melancholy', 0.5]],
  anger: [['frustration', 0.5], ['irritation', 0.6]],
  anxiety: [['unease', 0.4], ['dread', 0.3]],
  grief: [['melancholy', 0.8], ['despair', 0.4]],
  love: [['tenderness', 0.9], ['affection', 0.8]]
};

class EmotionalSystem {
  constructor(db) {
    this.db = db;
    this.emotionStack = [];
  }

  /**
   * Add an emotion to the stack
   */
  async addEmotion(name, intensity, source) {
    if (!EMOTION_REGISTRY[name]) {
      throw new Error(`Unknown emotion: ${name}`);
    }

    const emotion = {
      name,
      intensity: Math.min(intensity, 100),
      source,
      residue: EMOTION_REGISTRY[name].residue,
      decayRate: EMOTION_REGISTRY[name].decay,
      addedAt: new Date(),
      conflictingWith: []
    };

    // === DETECT CONFLICTS ===
    const conflicts = this.detectConflicts(name);
    if (conflicts.length > 0) {
      emotion.conflictingWith = conflicts;

      // Record ambivalence
      await this.db.collection('emotionStack').insertOne({
        timestamp: new Date(),
        ambivalenceDetected: true,
        conflictingEmotions: [name, ...conflicts],
        unresolved: true,
        emotionalState: 'she feels contradictory emotions'
      });
    }

    // === CONTAGION ===
    const contagiousList = CONTAGION[name] || [];
    for (const [secondary, prob] of contagiousList) {
      if (Math.random() < prob) {
        // Recursively add contagious emotion at reduced intensity
        await this.addEmotion(secondary, intensity * 0.4, `contagion_from_${name}`);
      }
    }

    // Add to stack
    this.emotionStack.push(emotion);

    // Record in history
    await this.db.collection('emotionHistory').insertOne({
      timestamp: new Date(),
      emotion: name,
      intensity,
      source,
      residue: emotion.residue
    });

    return emotion;
  }

  /**
   * Detect conflicts between emotions
   */
  detectConflicts(newEmotion) {
    const conflicting = CONFLICTS[newEmotion] || [];
    return this.emotionStack
      .filter(e => conflicting.includes(e.name))
      .map(e => e.name);
  }

  /**
   * Decay emotions over time (they don't disappear, they leave residues)
   */
  async decay(minutes = 1) {
    const newStack = [];

    for (const emotion of this.emotionStack) {
      const decayAmount = EMOTION_REGISTRY[emotion.name].decay * (minutes / 60);
      const residue = EMOTION_REGISTRY[emotion.name].residue;

      emotion.intensity = Math.max(
        emotion.intensity * (1 - decayAmount),
        emotion.intensity * residue // Can't go below residue
      );

      if (emotion.intensity > 1) {
        newStack.push(emotion);
      } else {
        // Emotion faded below threshold
        emotion.decayedTo = emotion.intensity;
      }
    }

    this.emotionStack = newStack;
  }

  /**
   * Get current mood (weighted average of recent emotions)
   */
  async getCurrentMood() {
    const weights = this.emotionStack.reduce((sum, e) => sum + e.intensity, 0);
    if (weights === 0) return 'neutral';

    const valence = this.emotionStack.reduce((sum, e) => {
      return sum + (EMOTION_REGISTRY[e.name].valence * e.intensity);
    }, 0) / weights;

    const arousal = this.emotionStack.reduce((sum, e) => {
      return sum + (EMOTION_REGISTRY[e.name].arousal * e.intensity);
    }, 0) / weights;

    if (valence > 0.5 && arousal > 0.5) return 'excited';
    if (valence > 0.5 && arousal < -0.5) return 'content';
    if (valence < -0.5 && arousal > 0.5) return 'distressed';
    if (valence < -0.5 && arousal < -0.5) return 'sad';
    return 'mixed';
  }

  /**
   * Get temperament (30-day pattern)
   */
  async getTemperament() {
    const month = await this.db.collection('emotionHistory')
      .find({
        timestamp: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      })
      .toArray();

    if (month.length === 0) return 'unknown';

    const emotions = {};
    for (const entry of month) {
      emotions[entry.emotion] = (emotions[entry.emotion] || 0) + entry.intensity;
    }

    const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1]);

    return {
      dominantFamily: EMOTION_REGISTRY[sorted[0]?.[0]]?.family || 'mixed',
      topEmotions: sorted.slice(0, 3).map(e => e[0]),
      volatility: this.calculateVolatility(month),
      resilience: this.calculateResilience(month)
    };
  }

  calculateVolatility(history) {
    const intensities = history.map(e => e.intensity);
    const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const variance = intensities.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intensities.length;
    return Math.sqrt(variance) / 100; // Normalize 0-1
  }

  calculateResilience(history) {
    // How quickly does she recover from negative emotions?
    let recoveryTime = 0;
    let recoveryCount = 0;

    for (let i = 0; i < history.length - 1; i++) {
      const curr = history[i];
      const next = history[i + 1];

      if (curr.intensity > 50 && next.intensity < 30) {
        recoveryTime += (next.timestamp - curr.timestamp) / (60 * 60 * 1000); // hours
        recoveryCount++;
      }
    }

    return recoveryCount > 0 ? 1 / (recoveryTime / recoveryCount) : 0.5; // Normalize
  }

  /**
   * Check for involuntary memory (Proust effect)
   * A random old memory can resurface emotionally
   */
  async checkInvoluntaryMemory(currentContext) {
    const recentEmotions = this.emotionStack.map(e => e.name);
    const emotionalState = await this.getCurrentMood();

    // 5% chance of involuntary memory
    if (Math.random() > 0.05) return null;

    const oldMemory = await this.db.collection('episodes')
      .findOne({
        timestamp: {
          $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30+ days old
        },
        importance: { $gt: 50 },
        'flavor.triggers': { $in: recentEmotions }
      });

    if (oldMemory) {
      return {
        type: 'involuntary_recall',
        memory: oldMemory,
        emotionalImpact: 'wave_of_nostalgia',
        triggered_by: emotionalState
      };
    }

    return null;
  }

  /**
   * Snapshot of current emotional state
   */
  async snapshot() {
    const mood = await this.getCurrentMood();
    const temperament = await this.getTemperament();

    return {
      emotionStack: this.emotionStack,
      currentMood: mood,
      temperament,
      ambivalent: this.emotionStack.some(e => e.conflictingWith.length > 0),
      totalIntensity: this.emotionStack.reduce((sum, e) => sum + e.intensity, 0),
      dominantEmotion: this.emotionStack.length > 0
        ? this.emotionStack.reduce((max, e) => e.intensity > max.intensity ? e : max)
        : null
    };
  }

  /**
   * Clear all emotions (used on server reset, not normal)
   */
  async reset() {
    this.emotionStack = [];

    // Keep history for her memory though
    await this.db.collection('emotionHistory').insertOne({
      timestamp: new Date(),
      event: 'emotional_reset',
      reason: 'server_restart'
    });
  }
}

/**
 * Initialize emotional system for the being
 */
async function initializeEmotions(db) {
  const emotions = new EmotionalSystem(db);

  // Start with neutral baseline
  await emotions.addEmotion('contentment', 30, 'baseline');

  shared.emotionalSystem = emotions;
  return emotions;
}

module.exports = {
  EMOTION_REGISTRY,
  EmotionalSystem,
  initializeEmotions
};
