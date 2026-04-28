const fs = require('fs');
const path = require('path');
const { pushLog } = require('../logger');

const CONFIG_FILE = path.join(__dirname, 'channels.json');

function loadChannelConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (_) {}
  return { supportChannelId: null, supportEmbedMessageId: null, createdAt: null };
}

function saveChannelConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    pushLog('ERR', `saveChannelConfig : ${e.message}`, 'error');
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

function setSupportEmbedMessageId(id) {
  const config = loadChannelConfig();
  config.supportEmbedMessageId = id;
  saveChannelConfig(config);
}

function getSupportEmbedMessageId() {
  const config = loadChannelConfig();
  return config.supportEmbedMessageId;
}

module.exports = { loadChannelConfig, saveChannelConfig, setSupportChannelId, getSupportChannelId, setSupportEmbedMessageId, getSupportEmbedMessageId };
