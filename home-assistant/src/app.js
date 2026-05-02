require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDevices, getDeviceState, toggleDevice, setDeviceBrightness, setDeviceColor } = require('./homeAssistant');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'home-assistant-api' });
});

// Get all devices
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await getDevices();
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific device state
app.get('/api/devices/:entityId', async (req, res) => {
  try {
    const state = await getDeviceState(req.params.entityId);
    res.json({ success: true, data: state });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle device (on/off)
app.post('/api/devices/:entityId/toggle', async (req, res) => {
  try {
    const result = await toggleDevice(req.params.entityId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set brightness for lights
app.post('/api/devices/:entityId/brightness', async (req, res) => {
  try {
    const { brightness } = req.body;
    if (brightness === undefined || brightness < 0 || brightness > 255) {
      return res.status(400).json({ success: false, error: 'Invalid brightness value (0-255)' });
    }
    const result = await setDeviceBrightness(req.params.entityId, brightness);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set color for lights
app.post('/api/devices/:entityId/color', async (req, res) => {
  try {
    const { rgb } = req.body;
    if (!rgb || !Array.isArray(rgb) || rgb.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid color format (needs rgb array)' });
    }
    const result = await setDeviceColor(req.params.entityId, rgb);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Home Assistant API service running on port ${PORT}`);
});
