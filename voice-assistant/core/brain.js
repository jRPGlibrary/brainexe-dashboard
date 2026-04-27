'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt, buildGreetPrompt, getToneInjection, NEX_CORE } = require('./persona');

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 300;
const TIMEOUT_MS = 20000;

class Brain {
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.health = { totalCalls: 0, totalErrors: 0, lastLatency: 0, consecutiveErrors: 0 };
  }

  async think(userInput, { context = [], emotionContext = '', bondContext = '' } = {}) {
    const systemPrompt = buildSystemPrompt(emotionContext, bondContext);
    const bondLevel = this._parseBondLevel(bondContext);
    const toneInject = getToneInjection(bondLevel);
    const messages = [
      ...context,
      { role: 'user', content: userInput }
    ];

    const start = Date.now();
    this.health.totalCalls++;

    try {
      const response = await Promise.race([
        this.client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            {
              type: 'text',
              text: NEX_CORE,
              cache_control: { type: 'ephemeral' }
            },
            {
              type: 'text',
              text: `${toneInject}\n\n${systemPrompt}`
            }
          ],
          messages
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout Claude')), TIMEOUT_MS)
        )
      ]);

      this.health.lastLatency = Date.now() - start;
      this.health.consecutiveErrors = 0;

      return this._extractText(response);
    } catch (err) {
      this.health.totalErrors++;
      this.health.consecutiveErrors++;
      throw err;
    }
  }

  async greet(bondContext = '', emotionContext = '') {
    const hour = new Date().getHours();
    const timeHint = hour < 12 ? 'C\'est le matin.' : hour < 18 ? 'C\'est l\'après-midi.' : hour < 22 ? 'C\'est le soir.' : 'Il est tard la nuit.';
    const prompt = buildGreetPrompt(bondContext, emotionContext);

    this.health.totalCalls++;
    const start = Date.now();

    try {
      const response = await Promise.race([
        this.client.messages.create({
          model: MODEL,
          max_tokens: 120,
          system: [
            { type: 'text', text: NEX_CORE, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: prompt }
          ],
          messages: [{ role: 'user', content: `${timeHint} Salue l'utilisateur.` }]
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
      ]);

      this.health.lastLatency = Date.now() - start;
      this.health.consecutiveErrors = 0;
      return { greeting: this._extractText(response) };
    } catch {
      this.health.totalErrors++;
      const fallbacks = [
        'Ouais, je suis là.',
        'Yep, actif.',
        hour < 12 ? 'Matin. Prêt.' : hour < 18 ? 'Là. Qu\'est-ce qu\'il y a ?' : 'Soir. Go.'
      ];
      return { greeting: fallbacks[Math.floor(Math.random() * fallbacks.length)] };
    }
  }

  _extractText(response) {
    const block = response.content?.find(b => b.type === 'text');
    return block?.text?.trim() || '...';
  }

  _parseBondLevel(bondContext) {
    const match = bondContext.match(/niveau\s*[:\s]+(\d+)/i);
    return match ? parseInt(match[1]) : 0;
  }

  getHealth() {
    return { ...this.health, model: MODEL };
  }
}

module.exports = Brain;
