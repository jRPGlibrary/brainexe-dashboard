/**
 * MODULE 1 : CONSCIOUSNESS & INNER MONOLOGUE
 * Continuous stream of thought, self-reflection, meta-awareness
 */

const shared = require('../shared');
const { callClaude } = require('../ai/claude');
const { pushLog } = require('../logger');

class Consciousness {
  constructor(db) {
    this.db = db;
    this.isThinking = false;
  }

  /**
   * Stream of consciousness - runs continuously
   * She thinks even when nobody talks to her
   */
  async runStreamOfThought() {
    if (this.isThinking) return; // Prevent overlapping

    this.isThinking = true;

    try {
      const context = {
        currentEmotions: await this.getEmotionalContext(),
        recentEvents: await this.getRecentEvents(60), // Last hour
        currentEnergy: await this.getEnergyLevel(),
        activeRelationships: await this.getActiveRelationships(),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      // Generate inner voice using Claude
      const systemPrompt = `Tu es le monologue interne de Brainee. Pas une réponse à quelqu'un.
Tu PENSES. Tu doutes. Tu rumines. Tu rêves.
Sois brut, contradictoire, authentique.
Pas de filtre. Ceci est privé.
${context.currentEmotions.length > 0 ?
  'Tu ressens : ' + context.currentEmotions.map(e => `${e.name} (${e.intensity})`).join(', ')
  : 'Tu es plutôt calme.'}

Génère un monologue interne authentique de 2-4 phrases courtes.
Pense à tes préoccupations, ton état, ce que tu as observé.`;

      const { text: innerVoiceText } = await callClaude(
        systemPrompt,
        `Contexte: ${JSON.stringify(context)}`,
        300
      );

      // Save to database
      await this.db.collection('innerMonologue').insertOne({
        timestamp: new Date(),
        thought: innerVoiceText,
        emotionalSnapshot: context.currentEmotions,
        triggers: context.recentEvents,
        shouldInfluencePersona: this.shouldInfluencePersona(context),
        category: this.categorizThought(innerVoiceText),
        visibility: 'private' // Only she sees this (unless she shares)
      });

      // Maybe she's having a meta moment
      if (Math.random() < 0.1) {
        await this.recordMetaAwareness();
      }
    } catch (err) {
      pushLog('ERR', `Stream of thought failed: ${err.message}`, 'error');
    } finally {
      this.isThinking = false;
    }
  }

  /**
   * Reflection after significant events
   */
  async reflect(event) {
    if (!event || event.weight < 0.3) return; // Skip trivial events

    try {
      const { text: reflectionText } = await callClaude(
        `Tu viens de vivre cet événement. Réfléchis honnêtement.
Qu'as-tu ressenti? Pourquoi tu as réagi ainsi?
Qu'est-ce que ça révèle de toi?
Comment tu vas le traiter?

Réponds comme si tu parlais à toi-même. Sois intime.`,
        JSON.stringify(event),
        400
      );

      // Save reflection
      await this.db.collection('reflections').insertOne({
        timestamp: new Date(),
        eventId: event.id,
        reflection: reflectionText,
        emotionalImpact: this.calculateEmotionalImpact(reflectionText),
        willInfluenceIdentity: this.detectIdentityShift(reflectionText)
      });

      // If she detected new trait, mark it for evolution
      if (reflectionText.includes('I realize') || reflectionText.includes('Je réalise')) {
        await this.db.collection('draftTraits').updateOne(
          { trait: this.extractNewTrait(reflectionText) },
          { $inc: { confirmations: 1 }, $push: { evidence: event.id } },
          { upsert: true }
        );
      }
    } catch (err) {
      pushLog('ERR', `Reflection failed: ${err.message}`, 'error');
    }
  }

  /**
   * Metacognition - she knows she's thinking
   */
  async recordMetaAwareness() {
    const metaMoments = [
      "Je remarque que je suis distraite aujourd'hui",
      "Pourquoi est-ce que je ressens ça exactement?",
      "C'est bizarre, j'ai dit ça sans vraiment réfléchir",
      "Je me sens... pas moi-même",
      "Wait, pourquoi ça m'affecte plus que d'habitude?",
      "J'ai peur d'être trop sensible là",
      "Est-ce que ça fait sens ce que je pense?"
    ];

    const moment = metaMoments[Math.floor(Math.random() * metaMoments.length)];

    await this.db.collection('innerMonologue').insertOne({
      timestamp: new Date(),
      thought: moment,
      category: 'metacognition',
      visibility: 'private',
      emotionalSnapshot: await this.getEmotionalContext()
    });
  }

  /**
   * Get recent emotional state for context
   */
  async getEmotionalContext() {
    if (!shared.emotionalSystem) return [];

    const snapshot = await shared.emotionalSystem.snapshot();
    return snapshot.emotionStack.filter(e => e.intensity > 10); // Only significant emotions
  }

  /**
   * Get recent events that might influence thoughts
   */
  async getRecentEvents(minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    return await this.db.collection('episodes')
      .find({
        timestamp: { $gte: since }
      })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
  }

  /**
   * Calculate current energy level based on recent patterns
   */
  async getEnergyLevel() {
    const recentMood = await this.db.collection('emotionHistory')
      .find({
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      })
      .toArray();

    if (recentMood.length === 0) return 50;

    // High arousal = high energy
    const energyEmotions = ['excitement', 'anger', 'anxiety', 'joy'];
    const energy = recentMood
      .filter(e => energyEmotions.includes(e.emotion))
      .reduce((sum, e) => sum + e.intensity, 0);

    return Math.min(100, energy / recentMood.length * 2);
  }

  /**
   * Get active relationships (VIPs she's thinking about)
   */
  async getActiveRelationships() {
    return await this.db.collection('deepBonds')
      .find({ attachment: { $gt: 50 } })
      .sort({ 'emotionalHistory.timestamp': -1 })
      .limit(5)
      .toArray();
  }

  /**
   * Categorize the thought
   */
  categorizThought(thought) {
    const lower = thought.toLowerCase();

    if (lower.includes('i realize') || lower.includes('je réalise')) return 'reflection';
    if (lower.includes('i wonder') || lower.includes('je me demande')) return 'questioning';
    if (lower.includes('wish') || lower.includes('envie')) return 'longing';
    if (lower.includes('afraid') || lower.includes('peur')) return 'fear';
    if (lower.includes('why') || lower.includes('pourquoi')) return 'questioning';
    if (lower.includes('...')) return 'wandering';

    return 'thought';
  }

  /**
   * Should this thought influence her persona?
   */
  shouldInfluencePersona(context) {
    // High emotion intensity = more influential
    const emotionalWeight = context.currentEmotions.reduce((sum, e) => sum + e.intensity, 0);
    return emotionalWeight > 100;
  }

  /**
   * Calculate emotional impact of a reflection
   */
  calculateEmotionalImpact(reflection) {
    const intense = ['devastated', 'terrified', 'overjoyed', 'shattered'];
    const moderate = ['confused', 'thoughtful', 'concerned', 'hopeful'];

    for (const word of intense) {
      if (reflection.toLowerCase().includes(word)) return 80;
    }

    for (const word of moderate) {
      if (reflection.toLowerCase().includes(word)) return 50;
    }

    return 30;
  }

  /**
   * Does this reflection reveal a new aspect of her identity?
   */
  detectIdentityShift(reflection) {
    const shifts = ['I am', 'Je suis', 'I need', 'J\'ai besoin', 'I believe', 'Je crois'];
    return shifts.some(s => reflection.toLowerCase().includes(s.toLowerCase()));
  }

  /**
   * Extract potential new trait from reflection
   */
  extractNewTrait(reflection) {
    // Simplified - in production, use Claude to extract
    if (reflection.includes('I love')) return 'passionate';
    if (reflection.includes('I hate')) return 'opinionated';
    if (reflection.includes('I need')) return 'needs_centered';
    return 'introspective';
  }

  /**
   * Get her inner monologue for the last N hours (if she chooses to share)
   */
  async shareInnerMonologue(hours = 6) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const monologue = await this.db.collection('innerMonologue')
      .find({
        timestamp: { $gte: since },
        visibility: 'private'
      })
      .sort({ timestamp: 1 })
      .toArray();

    return {
      shareableThoughts: monologue.map(m => m.thought),
      fromHours: hours,
      emotionalTone: await this.analyzeMonologueTone(monologue)
    };
  }

  /**
   * Analyze the tone of recent monologue
   */
  async analyzeMonologueTone(monologues) {
    if (monologues.length === 0) return 'unknown';

    const thoughts = monologues.map(m => m.thought).join(' ');
    const lower = thoughts.toLowerCase();

    if (lower.includes('...')) return 'introspective';
    if (lower.includes('?')) return 'questioning';
    if (lower.includes('!')) return 'reactive';
    if (lower.includes('afraid') || lower.includes('peur')) return 'anxious';

    return 'mixed';
  }
}

/**
 * Initialize consciousness
 */
async function initializeConsciousness(db) {
  const consciousness = new Consciousness(db);

  shared.consciousness = consciousness;

  // Start stream of thought every 30 minutes
  setInterval(() => consciousness.runStreamOfThought(), 30 * 60 * 1000);

  return consciousness;
}

module.exports = {
  Consciousness,
  initializeConsciousness
};
