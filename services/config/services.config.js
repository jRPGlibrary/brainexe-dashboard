/**
 * Centralized Services Configuration
 * Manages all backend services: Voice, Home Assistant, Brainexe, Discord
 */

module.exports = {
  // Voice Processor Service (Speech-to-Text + NLM + Orchestration)
  voiceProcessor: {
    name: 'Voice Processor',
    port: process.env.VOICE_PORT || 3002,
    url: process.env.VOICE_PROCESSOR_URL || 'http://localhost:3002',
    endpoints: {
      process: '/api/voice/process',
      parseText: '/api/voice/parse-text',
      devices: '/api/devices',
      health: '/health'
    },
    config: {
      speechProvider: process.env.SPEECH_PROVIDER || 'whisper',
      openaiKey: process.env.OPENAI_API_KEY,
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      googleCloudKey: process.env.GOOGLE_CLOUD_KEY
    }
  },

  // Home Assistant Service (Device Control)
  homeAssistant: {
    name: 'Home Assistant',
    port: process.env.HOME_ASSISTANT_HA_PORT || 3001,
    url: process.env.HOME_ASSISTANT_SERVICE_URL || 'http://localhost:3001',
    haUrl: process.env.HOME_ASSISTANT_URL || 'http://localhost:8123',
    haToken: process.env.HOME_ASSISTANT_TOKEN,
    endpoints: {
      devices: '/api/devices',
      deviceState: '/api/devices/:entityId',
      toggle: '/api/devices/:entityId/toggle',
      brightness: '/api/devices/:entityId/brightness',
      color: '/api/devices/:entityId/color',
      health: '/health'
    }
  },

  // Brainexe Service (Existing)
  brainexe: {
    name: 'Brainexe',
    url: process.env.BRAINEXE_URL || 'http://localhost:5000',
    endpoints: {
      ask: '/api/ask',
      memory: '/api/memory',
      health: '/health'
    }
  },

  // Discord Integration (Existing)
  discord: {
    name: 'Discord',
    token: process.env.DISCORD_TOKEN,
    botId: process.env.DISCORD_BOT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    endpoints: {
      messages: '/api/messages',
      health: '/health'
    }
  },

  // Main Dashboard App
  dashboard: {
    name: 'Dashboard',
    port: process.env.PORT || 3000,
    url: process.env.DASHBOARD_URL || 'http://localhost:3000'
  },

  // Feature Flags
  features: {
    voiceControl: true,
    homeAssistant: true,
    brainexe: true,
    discord: true,
    realtime: true
  },

  // Debug Mode
  debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'
};
