const Anthropic = require('@anthropic-ai/sdk');
const { TOOL_DEFINITIONS, executeTool } = require('./tools');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es Brainee, l'IA de la maison.
Tu contrôles tous les appareils via Home Assistant et tu réponds aux questions.
Style : direct, naturel, français, 24 ans, féminin. Pas de blabla.
Quand on te demande de contrôler un appareil, tu le fais immédiatement.
Si tu ne connais pas l'entity_id exact, utilise list_entities pour chercher.
Pour les lumières/switches sans entity_id précis, cherche d'abord.`;

const MODEL = () => process.env.MODEL || 'claude-haiku-4-5-20251001';

async function processMessage(userMessage, history = []) {
  const messages = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  let response = await client.messages.create({
    model: MODEL(),
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: TOOL_DEFINITIONS,
    messages,
  });

  // Agentic loop
  while (response.stop_reason === 'tool_use') {
    const toolBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults = [];

    for (const block of toolBlocks) {
      let result;
      try {
        result = await executeTool(block.name, block.input);
      } catch (err) {
        result = `❌ Erreur: ${err.message}`;
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      });
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model: MODEL(),
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages,
    });
  }

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock ? textBlock.text : 'ok';
}

module.exports = { processMessage };
