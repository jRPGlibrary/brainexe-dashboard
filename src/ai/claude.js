const { ANTHROPIC_API_KEY } = require('../config');
const { sanitizeForJson } = require('../utils');
const shared = require('../shared');
const { trackCost } = require('./budget');

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

/**
 * userPrompt accepte string ou array de blocs (multimodal).
 * Ex multimodal :
 *   [
 *     { type: 'text', text: '...' },
 *     { type: 'image', source: { type: 'url', url: 'https://...' } },
 *   ]
 */
async function callClaude(systemPrompt, userPrompt, maxTokens = 400, cachedPrefix = null, model = 'claude-sonnet-4-6') {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante');

  const cleanSystemPrompt = sanitizeForJson(systemPrompt);
  const cleanCachedPrefix = cachedPrefix ? sanitizeForJson(cachedPrefix) : null;

  let userContent;
  if (Array.isArray(userPrompt)) {
    userContent = userPrompt.map(b => b?.type === 'text' ? { type: 'text', text: sanitizeForJson(b.text || '') } : b);
  } else {
    userContent = sanitizeForJson(userPrompt);
  }

  const system = cleanCachedPrefix
    ? [
        { type: 'text', text: cleanCachedPrefix, cache_control: { type: 'ephemeral' } },
        ...(cleanSystemPrompt ? [{ type: 'text', text: cleanSystemPrompt }] : []),
      ]
    : cleanSystemPrompt;

  const payload = {
    model,
    max_tokens: Math.min(Math.max(Math.floor(maxTokens), 50), 1024),
    system,
    messages: [{ role: 'user', content: userContent }],
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
      const usage = {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        cacheCreationInputTokens: data.usage?.cache_creation_input_tokens || 0,
        cacheReadInputTokens: data.usage?.cache_read_input_tokens || 0,
      };
      trackCost(usage.inputTokens, usage.outputTokens, model);
      return { text: data.content[0].text.trim(), usage };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
      const isRetryable = isTimeout || err.message?.includes('529') || err.message?.includes('529');
      if (attempt < MAX_RETRIES && isRetryable) {
        const wait = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
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

/**
 * Variante de callClaude avec support Tool Use (Function Calling).
 * Gère la boucle complète : appel → tool_use → exécution → réponse finale.
 * @param {string} systemPrompt
 * @param {Array<{role: string, content: string|Array}>} userMessages
 * @param {Array} tools — schémas d'outils Anthropic
 * @param {Function} toolHandler — async (toolName, toolInput) => string|object
 * @param {object} [options] — maxTokens, cachedPrefix, model
 */
async function callClaudeWithTools(systemPrompt, userMessages, tools, toolHandler, options = {}) {
  const { maxTokens = 500, cachedPrefix = null, model = 'claude-sonnet-4-6' } = options;
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante');

  const cleanSystem = sanitizeForJson(systemPrompt);
  const cleanCached = cachedPrefix ? sanitizeForJson(cachedPrefix) : null;
  const system = cleanCached
    ? [
        { type: 'text', text: cleanCached, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: cleanSystem },
      ]
    : cleanSystem;

  // Cache les schémas d'outils (constants) : cache_control sur le dernier outil
  const cachedTools = tools.length
    ? tools.map((t, i) => i === tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t)
    : tools;

  let messages = userMessages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string' ? sanitizeForJson(m.content) : m.content,
  }));

  const startedAt = Date.now();
  shared.claudeHealth.totalCalls++;
  shared.claudeHealth.lastCall = startedAt;
  const totalUsage = { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };

  for (let iter = 0; iter < 3; iter++) {
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
        body: JSON.stringify({
          model,
          max_tokens: Math.min(Math.max(Math.floor(maxTokens), 50), 1024),
          system,
          tools: cachedTools,
          messages,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const e = await response.text();
        throw new Error(`Anthropic ${response.status}: ${e}`);
      }

      const data = await response.json();
      totalUsage.inputTokens += data.usage?.input_tokens || 0;
      totalUsage.outputTokens += data.usage?.output_tokens || 0;
      totalUsage.cacheCreationInputTokens += data.usage?.cache_creation_input_tokens || 0;
      totalUsage.cacheReadInputTokens += data.usage?.cache_read_input_tokens || 0;

      if (data.stop_reason !== 'tool_use') {
        const textBlock = data.content.find(b => b.type === 'text');
        const text = (textBlock?.text || '').trim();
        // Haiku renvoie parfois end_turn sans texte — le caller gère le fallback
        if (!text) {
          trackCost(totalUsage.inputTokens, totalUsage.outputTokens, model);
          return { text: '', usage: totalUsage };
        }
        const latency = Date.now() - startedAt;
        shared.claudeHealth.lastSuccess = Date.now();
        shared.claudeHealth.lastLatencyMs = latency;
        shared.claudeHealth.consecutiveErrors = 0;
        trackCost(totalUsage.inputTokens, totalUsage.outputTokens, model);
        return { text, usage: totalUsage };
      }

      const toolUseBlocks = data.content.filter(b => b.type === 'tool_use');
      if (!toolUseBlocks.length) break;

      messages = [...messages, { role: 'assistant', content: data.content }];

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolBlock) => {
          let resultContent;
          try {
            const rawResult = await toolHandler(toolBlock.name, toolBlock.input);
            resultContent = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
          } catch (toolErr) {
            resultContent = JSON.stringify({ error: toolErr.message, fallback: true });
          }
          return { type: 'tool_result', tool_use_id: toolBlock.id, content: resultContent };
        })
      );

      messages = [...messages, { role: 'user', content: toolResults }];

    } catch (err) {
      clearTimeout(timer);
      shared.claudeHealth.totalErrors++;
      shared.claudeHealth.consecutiveErrors++;
      shared.claudeHealth.lastError = Date.now();
      shared.claudeHealth.lastErrorMsg = (err.message || 'unknown').slice(0, 180);
      throw err;
    }
  }

  shared.claudeHealth.totalErrors++;
  shared.claudeHealth.consecutiveErrors++;
  throw new Error('callClaudeWithTools: boucle tool use non terminée après 3 itérations');
}

module.exports = { callClaude, callClaudeWithTools };
