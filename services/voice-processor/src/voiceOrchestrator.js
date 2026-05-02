const speechService = require('./speechService');
const nlmService = require('./nlmService');
const axios = require('axios');

class VoiceOrchestrator {
  constructor(config = {}) {
    this.haUrl = config.homeAssistantUrl || process.env.HOME_ASSISTANT_URL;
    this.haToken = config.homeAssistantToken || process.env.HOME_ASSISTANT_TOKEN;
    this.brainexeUrl = config.brainexeUrl || process.env.BRAINEXE_URL;
    this.discordUrl = config.discordUrl || process.env.DISCORD_URL;
  }

  /**
   * Main orchestration flow: Audio → Text → Command → Action
   * @param {Buffer} audioBuffer - Raw audio data
   * @param {Object} options - { language, devices, debug }
   * @returns {Promise<Object>} { success, action, result, feedback }
   */
  async processVoiceCommand(audioBuffer, options = {}) {
    const { language = 'fr', devices = [], debug = false } = options;

    try {
      // STEP 1: Convert speech to text
      if (debug) console.log('🎤 [STEP 1] Converting speech to text...');
      const transcribedText = await speechService.transcribeAudio(audioBuffer, language);
      if (debug) console.log(`   → Transcribed: "${transcribedText}"`);

      // STEP 2: Parse with NLM (Claude)
      if (debug) console.log('🧠 [STEP 2] Parsing with NLM...');
      const parsedCommand = await nlmService.parseVoiceCommand(transcribedText, devices);
      if (debug) console.log(`   → Parsed:`, JSON.stringify(parsedCommand, null, 2));

      // STEP 3: Route to appropriate service
      if (debug) console.log('🚀 [STEP 3] Routing command...');
      const routedCommand = await nlmService.routeCommand(parsedCommand, {
        homeAssistant: !!this.haUrl,
        brainexe: !!this.brainexeUrl,
        discord: !!this.discordUrl
      });
      if (debug) console.log(`   → Routed to: ${routedCommand.service}`);

      // STEP 4: Execute command
      if (debug) console.log('⚡ [STEP 4] Executing command...');
      const result = await this._executeCommand(routedCommand, parsedCommand);
      if (debug) console.log(`   → Result:`, result);

      // STEP 5: Generate user feedback
      if (debug) console.log('💬 [STEP 5] Generating feedback...');
      const feedback = this._generateFeedback(parsedCommand, result);

      return {
        success: true,
        transcribed: transcribedText,
        parsed: parsedCommand,
        routed: routedCommand,
        executed: result,
        feedback: feedback
      };
    } catch (error) {
      console.error('❌ Voice processing error:', error.message);
      return {
        success: false,
        error: error.message,
        feedback: 'Désolé, je n\'ai pas compris la commande. Pouvez-vous répéter ?'
      };
    }
  }

  /**
   * Execute the routed command on the target service
   */
  async _executeCommand(routedCommand, parsedCommand) {
    const { service, endpoint, payload } = routedCommand;

    try {
      if (service === 'home_assistant') {
        return await this._executeHomeAssistantCommand(parsedCommand);
      } else if (service === 'brainexe') {
        return await this._executeBrainexeCommand(parsedCommand);
      } else if (service === 'discord') {
        return await this._executeDiscordCommand(parsedCommand);
      }
      return { error: 'Unknown service' };
    } catch (error) {
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }

  async _executeHomeAssistantCommand(command) {
    try {
      const { action, target } = command;

      // Map action to HA service call
      const actionMap = {
        'turn_on': { service: 'light', action: 'turn_on' },
        'turn_off': { service: 'light', action: 'turn_off' },
        'toggle': { service: 'light', action: 'toggle' },
        'set_brightness': { service: 'light', action: 'turn_on' },
        'set_color': { service: 'light', action: 'turn_on' }
      };

      const mapped = actionMap[action] || { service: 'homeassistant', action: 'turn_toggle' };
      const domain = target?.split('.')[0] || 'light';

      const response = await axios.post(`${this.haUrl}/api/services/${domain}/${mapped.action}`,
        { entity_id: target },
        { headers: { 'Authorization': `Bearer ${this.haToken}` } }
      );

      return {
        service: 'home_assistant',
        status: 'success',
        action: action,
        target: target
      };
    } catch (error) {
      throw new Error(`Home Assistant execution failed: ${error.message}`);
    }
  }

  async _executeBrainexeCommand(command) {
    try {
      const response = await axios.post(`${this.brainexeUrl}/api/command`, {
        type: command.action,
        data: command
      });
      return { service: 'brainexe', status: 'success' };
    } catch (error) {
      throw new Error(`Brainexe execution failed: ${error.message}`);
    }
  }

  async _executeDiscordCommand(command) {
    try {
      const response = await axios.post(`${this.discordUrl}/api/command`, {
        type: command.action,
        data: command
      });
      return { service: 'discord', status: 'success' };
    } catch (error) {
      throw new Error(`Discord execution failed: ${error.message}`);
    }
  }

  /**
   * Generate human-friendly feedback for user
   */
  _generateFeedback(parsedCommand, result) {
    const { targetFriendlyName, action, confidence } = parsedCommand;

    if (confidence < 0.7) {
      return `Je ne suis pas très sûr, pouvez-vous répéter ?`;
    }

    const actionText = {
      'turn_on': 'allumé',
      'turn_off': 'éteint',
      'toggle': 'basculé',
      'set_brightness': 'ajusté',
      'set_color': 'changé de couleur'
    }[action] || 'modifié';

    return `${targetFriendlyName} a été ${actionText}.`;
  }
}

module.exports = VoiceOrchestrator;
