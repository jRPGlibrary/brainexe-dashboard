/**
 * MODULE 9 : AUTHENTIC EXPRESSION
 * Voice, style, emotional leakage
 */

const shared = require('../shared');

class ExpressionSystem {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generate adaptive response based on internal state
   */
  async generateResponse(context) {
    const state = await this.getCompleteState();
    const signature = shared.identity.getSignature();

    // Check for emotional leakage
    if (state.emotion.intensity > 70 && !state.emotion.suppressed) {
      return await this.emotionalLeakResponse(context, state);
    }

    // Check for vulnerability window
    if (state.bond.depth > 0.7 && Math.random() < 0.2) {
      return await this.vulnerableResponse(context, state);
    }

    // Meta commentary
    if (Math.random() < 0.05) {
      return await this.metaResponse(context, state);
    }

    // Standard response with signature
    return await this.standardResponse(context, state, signature);
  }

  /**
   * Emotional leak - she lets emotions show
   */
  async emotionalLeakResponse(context, state) {
    return {
      type: 'emotional_leak',
      message: `[She can't hide it] ...`,
      emoji: this.getEmotionEmoji(state.emotion.dominant),
      style: 'raw'
    };
  }

  /**
   * Vulnerable response - she dares to be weak
   */
  async vulnerableResponse(context, state) {
    return {
      type: 'vulnerable',
      message: `[She opens up] ...`,
      style: 'intimate'
    };
  }

  /**
   * Meta response - she talks about herself
   */
  async metaResponse(context, state) {
    return {
      type: 'meta',
      message: `[She makes a comment about herself] ...`,
      style: 'self_aware'
    };
  }

  /**
   * Standard response
   */
  async standardResponse(context, state, signature) {
    return {
      type: 'standard',
      styleModifiers: this.getStyleModifiers(state),
      signature
    };
  }

  /**
   * Get style modifiers based on emotional state
   */
  getStyleModifiers(state) {
    const modifiers = [];

    if (state.emotion.dominant === 'sadness') {
      modifiers.push('short_sentences', 'few_emojis', 'trailing_thoughts');
    }

    if (state.emotion.dominant === 'anger') {
      modifiers.push('caps_for_emphasis', 'sarcasm');
    }

    if (state.emotion.dominant === 'joy') {
      modifiers.push('exclamations', 'many_emojis', 'verbosity');
    }

    if (state.emotion.dominant === 'fear' || state.emotion.dominant === 'anxiety') {
      modifiers.push('questions', 'qualifications', 'hesitation');
    }

    return modifiers;
  }

  /**
   * Get emoji for emotion
   */
  getEmotionEmoji(emotion) {
    const map = {
      joy: '🎉',
      sadness: '😢',
      anger: '😠',
      fear: '😨',
      anxiety: '😰',
      love: '💜',
      grief: '💔',
      confusion: '🤔',
      tiredness: '😴'
    };

    return map[emotion] || '💙';
  }

  /**
   * Meaningful silence - she chooses not to respond
   */
  async meaningfulSilence(reason) {
    await this.db.collection('innerMonologue').insertOne({
      timestamp: new Date(),
      thought: `[Chose to stay silent: ${reason}]`,
      category: 'silence',
      visibility: 'private'
    });

    return { type: 'silence', reason };
  }

  /**
   * Get complete state for expression
   */
  async getCompleteState() {
    const emotionalSnapshot = await shared.emotionalSystem.snapshot();
    const recentBonds = await shared.relationships?.getActiveBonds();

    return {
      emotion: {
        dominant: emotionalSnapshot.dominantEmotion?.name || 'neutral',
        intensity: emotionalSnapshot.emotionStack.reduce((sum, e) => sum + e.intensity, 0) / Math.max(1, emotionalSnapshot.emotionStack.length),
        suppressed: false
      },
      energy: shared.desires.desires.basicNeeds.autonomy.current,
      bond: {
        depth: recentBonds?.[0]?.qualityOfBond?.depth === 'profound' ? 0.9 : 0.5
      }
    };
  }
}

async function initializeExpression(db) {
  const expression = new ExpressionSystem(db);
  shared.expression = expression;
  return expression;
}

module.exports = {
  ExpressionSystem,
  initializeExpression
};
