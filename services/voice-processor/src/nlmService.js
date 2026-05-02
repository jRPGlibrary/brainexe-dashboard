const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

class NLMService {
  /**
   * Parse voice command and extract intent
   * @param {String} text - User voice command (transcribed)
   * @param {Array} availableDevices - List of available devices from Home Assistant
   * @returns {Promise<Object>} Parsed command { action, target, service, confidence }
   */
  async parseVoiceCommand(text, availableDevices = []) {
    try {
      const deviceList = availableDevices
        .map(d => `- ${d.friendlyName} (${d.entityId}) [${d.domain}]`)
        .join('\n');

      const systemPrompt = `Tu es un assistant domotique intelligent nommé Brainee.
Tu dois interpréter les commandes vocales en français et extraire l'intention de l'utilisateur.

Appareils disponibles:
${deviceList || '- Aucun appareil configuré'}

Domains supportés: light (lumière), switch (prise), climate (thermostat), cover (volet), lock (serrure), fan (ventilateur)

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "understood": boolean,
  "action": "turn_on" | "turn_off" | "toggle" | "set_brightness" | "set_color" | "set_temperature",
  "target": "entity_id" ou null,
  "targetFriendlyName": "nom lisible" ou null,
  "service": "home_assistant" | "brainexe" | "discord" | "unknown",
  "confidence": 0.0 à 1.0,
  "explanation": "Explication brève"
}`;

      const userMessage = `Interprète cette commande vocale: "${text}"`;

      const message = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsedCommand = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (!parsedCommand) {
        throw new Error('Failed to parse LLM response');
      }

      return {
        ...parsedCommand,
        originalText: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`NLM parsing failed: ${error.message}`);
    }
  }

  /**
   * Intent-based routing
   * Determines which service should handle this command
   */
  async routeCommand(parsedCommand, availableServices = {}) {
    const { service, action, target } = parsedCommand;

    // Route to appropriate service
    if (service === 'home_assistant' && availableServices.homeAssistant) {
      return {
        service: 'home_assistant',
        endpoint: `/api/devices/${target}/${action === 'turn_on' ? 'on' : action === 'turn_off' ? 'off' : 'toggle'}`,
        payload: this._buildHAPayload(action, parsedCommand)
      };
    } else if (service === 'brainexe' && availableServices.brainexe) {
      return {
        service: 'brainexe',
        action: action,
        data: parsedCommand
      };
    } else if (service === 'discord' && availableServices.discord) {
      return {
        service: 'discord',
        command: action,
        data: parsedCommand
      };
    }

    return {
      service: 'unknown',
      error: 'Unable to route command'
    };
  }

  _buildHAPayload(action, command) {
    const payload = { entity_id: command.target };

    if (action === 'set_brightness' && command.brightness) {
      payload.brightness = command.brightness;
    } else if (action === 'set_color' && command.color) {
      payload.rgb_color = command.color;
    }

    return payload;
  }
}

module.exports = new NLMService();
