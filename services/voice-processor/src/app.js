require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const VoiceOrchestrator = require('./voiceOrchestrator');

const app = express();
const PORT = process.env.VOICE_PORT || 3002;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Initialize Voice Orchestrator
const voiceOrchestrator = new VoiceOrchestrator({
  homeAssistantUrl: process.env.HOME_ASSISTANT_URL,
  homeAssistantToken: process.env.HOME_ASSISTANT_TOKEN,
  brainexeUrl: process.env.BRAINEXE_URL,
  discordUrl: process.env.DISCORD_URL
});

// ========== ENDPOINTS ==========

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'voice-processor',
    dependencies: {
      homeAssistant: !!process.env.HOME_ASSISTANT_URL,
      brainexe: !!process.env.BRAINEXE_URL,
      discord: !!process.env.DISCORD_URL,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    }
  });
});

/**
 * Main voice processing endpoint
 * POST /api/voice/process
 * Body: { audio_buffer (base64), language?, debug? }
 */
app.post('/api/voice/process', upload.single('audio'), async (req, res) => {
  try {
    const { language = 'fr', debug = false } = req.body;
    let audioBuffer;

    if (req.file) {
      // File upload via multipart
      audioBuffer = req.file.buffer;
    } else if (req.body.audio) {
      // Base64 string
      audioBuffer = Buffer.from(req.body.audio, 'base64');
    } else {
      return res.status(400).json({
        success: false,
        error: 'No audio provided (use multipart form or base64)'
      });
    }

    // Get available devices from Home Assistant
    const devices = await _getAvailableDevices();

    // Process voice command
    const result = await voiceOrchestrator.processVoiceCommand(audioBuffer, {
      language,
      devices,
      debug: debug === 'true' || debug === true
    });

    res.json(result);
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      feedback: 'Erreur lors du traitement vocal'
    });
  }
});

/**
 * Get available devices from Home Assistant
 * GET /api/devices
 */
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await _getAvailableDevices();
    res.json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Execute command directly (for testing)
 * POST /api/command/execute
 * Body: { action, target, service }
 */
app.post('/api/command/execute', async (req, res) => {
  try {
    const { action, target, service = 'home_assistant' } = req.body;

    if (!action || !target) {
      return res.status(400).json({
        success: false,
        error: 'Missing action or target'
      });
    }

    const result = await voiceOrchestrator._executeCommand(
      { service, action, target },
      { action, target, targetFriendlyName: target }
    );

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Text-to-command (skip speech recognition)
 * POST /api/voice/parse-text
 * Body: { text, language?, debug? }
 */
app.post('/api/voice/parse-text', async (req, res) => {
  try {
    const { text, language = 'fr', debug = false } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const nlmService = require('./nlmService');
    const devices = await _getAvailableDevices();

    const parsed = await nlmService.parseVoiceCommand(text, devices);
    const routed = await nlmService.routeCommand(parsed, {
      homeAssistant: !!process.env.HOME_ASSISTANT_URL,
      brainexe: !!process.env.BRAINEXE_URL,
      discord: !!process.env.DISCORD_URL
    });

    res.json({
      success: true,
      text: text,
      parsed,
      routed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== HELPERS ==========

async function _getAvailableDevices() {
  try {
    const haUrl = process.env.HOME_ASSISTANT_URL;
    const haToken = process.env.HOME_ASSISTANT_TOKEN;

    if (!haUrl || !haToken) {
      return [];
    }

    const response = await axios.get(`${haUrl}/api/states`, {
      headers: { 'Authorization': `Bearer ${haToken}` }
    });

    const SUPPORTED_DOMAINS = ['light', 'switch', 'climate', 'cover', 'lock', 'fan'];

    return response.data
      .filter(state => SUPPORTED_DOMAINS.includes(state.entity_id.split('.')[0]))
      .map(state => ({
        entityId: state.entity_id,
        friendlyName: state.attributes.friendly_name || state.entity_id,
        state: state.state,
        domain: state.entity_id.split('.')[0],
        attributes: state.attributes
      }));
  } catch (error) {
    console.warn('Failed to fetch HA devices:', error.message);
    return [];
  }
}

app.listen(PORT, () => {
  console.log(`🎤 Voice Processor running on port ${PORT}`);
  console.log(`   POST /api/voice/process - Process audio`);
  console.log(`   POST /api/voice/parse-text - Parse text command`);
  console.log(`   GET /api/devices - List available devices`);
});
