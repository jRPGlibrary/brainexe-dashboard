const { ANTHROPIC_API_KEY } = require('../config');

async function callClaude(systemPrompt, userPrompt, maxTokens = 400) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!response.ok) {
    const e = await response.text();
    throw new Error(`Anthropic ${response.status}: ${e}`);
  }
  return (await response.json()).content[0].text.trim();
}

module.exports = { callClaude };
