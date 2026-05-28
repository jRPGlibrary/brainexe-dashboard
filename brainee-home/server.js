require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { processMessage } = require('./src/claude');
const { getStates, turnOn, turnOff, ping } = require('./src/homeAssistant');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- REST API ---

app.get('/api/status', async (req, res) => {
  const ha = await ping();
  res.json({
    ha: ha,
    model: process.env.MODEL || 'claude-haiku-4-5-20251001',
    haUrl: process.env.HA_URL || 'http://homeassistant.local:8123',
  });
});

app.get('/api/devices', async (req, res) => {
  try {
    const domain = req.query.domain || null;
    const states = await getStates(domain);
    const filtered = states.filter(s => {
      const d = s.entity_id.split('.')[0];
      return ['light', 'switch', 'climate', 'media_player', 'cover', 'fan', 'vacuum', 'input_boolean', 'sensor', 'binary_sensor'].includes(d);
    });
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/:entity_id/on', async (req, res) => {
  try {
    await turnOn(req.params.entity_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/:entity_id/off', async (req, res) => {
  try {
    await turnOff(req.params.entity_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'message requis' });
    const reply = await processMessage(message, history || []);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WebSocket ---

wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    if (data.type === 'chat') {
      try {
        const reply = await processMessage(data.message, data.history || []);
        ws.send(JSON.stringify({ type: 'reply', content: reply }));
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', content: err.message }));
      }
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`\n🏠 Brainee Home → http://localhost:${PORT}`);
  console.log(`   HA: ${process.env.HA_URL || 'http://homeassistant.local:8123'}`);
  console.log(`   Model: ${process.env.MODEL || 'claude-haiku-4-5-20251001'}\n`);
});
