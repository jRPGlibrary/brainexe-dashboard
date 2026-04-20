const { ANTHROPIC_API_KEY } = require('../config');
const { sanitizeForJson } = require('../utils');
const shared = require('../shared');

const TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;

if (!shared.claudeHealth) {
  shared.claudeHealth = {
    totalCalls: 0,
    totalErrors: 0,
    lastCall: null,
    lastSuccess: null,
    lastError: null,
    lastErrorMsg: null,
    lastLatencyMs: null,
    consecutiveErrors: 0,
  };
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 400, cachedPrefix = null) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante');

  const cleanSystemPrompt = sanitizeForJson(systemPrompt);
  const cleanUserPrompt = sanitizeForJson(userPrompt);
  const cleanCachedPrefix = cachedPrefix ? sanitizeForJson(cachedPrefix) : null;

  const system = cleanCachedPrefix
    ? [
        { type: 'text', text: cleanCachedPrefix, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: cleanSystemPrompt },
      ]
    : cleanSystemPrompt;

  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: Math.min(Math.max(Math.floor(maxTokens), 50), 1024),
    system,
    messages: [{ role: 'user', content: cleanUserPrompt }],
  };

  const body = JSON.stringify(payload);

  const startedAt = Date.now();
  shared.claudeHealth.totalCalls++;
  shared.claudeHealth.lastCall = startedAt;

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const e = await response.text();
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`Anthropic ${response.status}: ${e}`);
        }
        throw new Error(`Anthropic ${response.status}: ${e}`);
      }

      const data = await response.json();
      const latency = Date.now() - startedAt;
      shared.claudeHealth.lastSuccess = Date.now();
      shared.claudeHealth.lastLatencyMs = latency;
      shared.claudeHealth.consecutiveErrors = 0;
      return data.content[0].text.trim();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
      const isRetryable = isTimeout || err.message?.includes('529') || err.message?.includes('529');
      if (attempt < MAX_RETRIES && isRetryable) {
        const wait = 1000 * (attempt + 1);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      break;
    }
  }
  shared.claudeHealth.totalErrors++;
  shared.claudeHealth.consecutiveErrors++;
  shared.claudeHealth.lastError = Date.now();
  shared.claudeHealth.lastErrorMsg = (lastErr && lastErr.message) ? lastErr.message.slice(0, 180) : 'unknown';
  throw lastErr;
}

module.exports = { callClaude };
