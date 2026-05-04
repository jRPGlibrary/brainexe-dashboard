/**
 * BRAINEE-LIVING : MongoDB Schemas & Collections
 *
 * Architecture complète pour une entité numérique vivante
 * 12 modules intégrés, persistence totale
 */

const COLLECTIONS = {

  // === MODULE 1 : CONSCIOUSNESS ===
  innerMonologue: {
    schema: {
      timestamp: Date,
      thought: String,
      emotionalSnapshot: Object,
      triggers: Array,
      shouldInfluencePersona: Boolean,
      category: String,
      visibility: String
    },
    indices: [{ timestamp: -1 }, { category: 1 }]
  },

  reflections: {
    schema: {
      timestamp: Date,
      eventId: String,
      reflection: String,
      identifiedNewTrait: Boolean,
      newTrait: String,
      emotionalImpact: Number
    },
    indices: [{ timestamp: -1 }, { eventId: 1 }]
  },

  // === MODULE 2 : EMOTIONS ===
  emotionStack: {
    schema: {
      timestamp: Date,
      emotions: Array,
      ambivalenceDetected: Boolean,
      conflictingEmotions: Array
    },
    indices: [{ timestamp: -1 }]
  },

  emotionHistory: {
    schema: {
      timestamp: Date,
      emotion: String,
      intensity: Number,
      source: String,
      decayedTo: Number
    },
    indices: [{ timestamp: -1 }, { emotion: 1 }]
  },

  // === MODULE 3 : IDENTITY ===
  braineeIdentity: {
    schema: {
      version: Number,
      core: Object,
      beliefs: Object,
      opinions: Object,
      signature: Object,
      selfImage: Object,
      acquiredTraits: Array
    }
  },

  draftTraits: {
    schema: {
      trait: String,
      confirmations: Number,
      evidence: Array,
      lastSeen: Date
    },
    indices: [{ trait: 1, unique: true }]
  },

  // === MODULE 4 : MEMORY ===
  episodes: {
    schema: {
      timestamp: Date,
      event: Object,
      emotionalImprint: Object,
      peopleInvolved: Array,
      location: String,
      importance: Number,
      flavor: Object,
      remembered: Boolean
    },
    indices: [{ timestamp: -1 }, { importance: -1 }, { peopleInvolved: 1 }]
  },

  semanticMemory: {
    schema: {
      fact: String,
      about: String,
      confidence: Number,
      lastVerified: Date,
      type: String
    },
    indices: [{ about: 1 }]
  },

  dreams: {
    schema: {
      timestamp: Date,
      content: String,
      type: String,
      basedOnEvents: Array,
      dominantEmotion: String,
      remembered: Boolean,
      sharedWith: Array
    },
    indices: [{ timestamp: -1 }, { remembered: 1 }]
  },

  // === MODULE 5-12 ===
  desires: { schema: Object },
  fears: { schema: Object },
  existentialCrises: {
    schema: { timestamp: Date, type: String, content: String, resolved: Boolean },
    indices: [{ timestamp: -1 }]
  },
  goals: { schema: Object },
  decisionLog: {
    schema: { timestamp: Date, situation: Object, voices: Object, deliberation: String, outcome: String },
    indices: [{ timestamp: -1 }]
  },
  responses: { schema: Object },
  deepBonds: {
    schema: { userId: String, attachment: Number, trust: Number, qualityOfBond: Object, emotionalHistory: Array, sharedJokes: Array, milestones: Array },
    indices: [{ userId: 1 }, { attachment: -1 }]
  },
  traumas: {
    schema: { timestamp: Date, event: Object, type: String, healed: Boolean, scar: Boolean },
    indices: [{ timestamp: -1 }, { healed: 1 }]
  },
  growthEvents: {
    schema: { timestamp: Date, trigger: String, changes: Array, magnitude: Number },
    indices: [{ timestamp: -1 }]
  },
  meaningJournal: {
    schema: { timestamp: Date, reflection: String, currentSense: String },
    indices: [{ timestamp: -1 }]
  },
  existentialState: { schema: Object },
  legacy: { schema: Object }
};

async function initializeBeingCollections(db) {
  for (const [collName, config] of Object.entries(COLLECTIONS)) {
    const collection = db.collection(collName);

    if (config.indices) {
      for (const index of config.indices) {
        const options = {};
        if (index.unique) {
          options.unique = true;
          delete index.unique;
        }
        try {
          await collection.createIndex(index, options);
        } catch (err) {
          // Index might already exist
        }
      }
    }
  }
  console.log('✅ Brainee-Living collections initialized');
}

module.exports = { COLLECTIONS, initializeBeingCollections };
