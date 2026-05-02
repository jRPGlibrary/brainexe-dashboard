const axios = require('axios');

const HA_URL = process.env.HOME_ASSISTANT_URL || 'http://localhost:8123';
const HA_TOKEN = process.env.HOME_ASSISTANT_TOKEN;

if (!HA_TOKEN) {
  console.warn('WARNING: HOME_ASSISTANT_TOKEN not set in environment variables');
}

const haClient = axios.create({
  baseURL: HA_URL,
  headers: {
    'Authorization': `Bearer ${HA_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Filter supported device types
const SUPPORTED_DOMAINS = ['light', 'switch', 'climate', 'cover', 'lock', 'fan'];

async function getDevices() {
  try {
    const response = await haClient.get('/api/states');
    const states = response.data;

    const devices = states
      .filter(state => {
        const domain = state.entity_id.split('.')[0];
        return SUPPORTED_DOMAINS.includes(domain);
      })
      .map(state => ({
        entityId: state.entity_id,
        friendlyName: state.attributes.friendly_name || state.entity_id,
        state: state.state,
        domain: state.entity_id.split('.')[0],
        attributes: state.attributes
      }));

    return devices;
  } catch (error) {
    throw new Error(`Failed to get devices: ${error.message}`);
  }
}

async function getDeviceState(entityId) {
  try {
    const response = await haClient.get(`/api/states/${entityId}`);
    return {
      entityId: response.data.entity_id,
      state: response.data.state,
      attributes: response.data.attributes
    };
  } catch (error) {
    throw new Error(`Failed to get device state: ${error.message}`);
  }
}

async function toggleDevice(entityId) {
  try {
    const domain = entityId.split('.')[0];
    const service = domain === 'light' ? 'toggle' : 'toggle';

    const response = await haClient.post(`/api/services/${domain}/${service}`, {
      entity_id: entityId
    });

    return { success: true, message: `Device ${entityId} toggled` };
  } catch (error) {
    throw new Error(`Failed to toggle device: ${error.message}`);
  }
}

async function setDeviceBrightness(entityId, brightness) {
  try {
    const response = await haClient.post('/api/services/light/turn_on', {
      entity_id: entityId,
      brightness: brightness
    });

    return { success: true, message: `Brightness set to ${brightness}` };
  } catch (error) {
    throw new Error(`Failed to set brightness: ${error.message}`);
  }
}

async function setDeviceColor(entityId, rgb) {
  try {
    const response = await haClient.post('/api/services/light/turn_on', {
      entity_id: entityId,
      rgb_color: rgb
    });

    return { success: true, message: `Color set to RGB(${rgb.join(',')})` };
  } catch (error) {
    throw new Error(`Failed to set color: ${error.message}`);
  }
}

module.exports = {
  getDevices,
  getDeviceState,
  toggleDevice,
  setDeviceBrightness,
  setDeviceColor
};
