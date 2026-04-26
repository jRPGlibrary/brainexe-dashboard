const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'channels.json');

function loadChannelConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (_) {}
  return { supportChannelId: null, createdAt: null };
}

function saveChannelConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Erreur sauvegarde config channels:', e.message);
  }
}

function setSupportChannelId(id) {
  const config = loadChannelConfig();
  config.supportChannelId = id;
  config.createdAt = new Date().toISOString();
  saveChannelConfig(config);
}

function getSupportChannelId() {
  const config = loadChannelConfig();
  return config.supportChannelId;
}

module.exports = { loadChannelConfig, saveChannelConfig, setSupportChannelId, getSupportChannelId };
