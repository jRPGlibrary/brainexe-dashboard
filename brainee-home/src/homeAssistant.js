const HA_URL = () => (process.env.HA_URL || 'http://homeassistant.local:8123').replace(/\/$/, '');
const HA_TOKEN = () => process.env.HA_TOKEN;

function headers() {
  return {
    Authorization: `Bearer ${HA_TOKEN()}`,
    'Content-Type': 'application/json',
  };
}

async function haFetch(path, options = {}) {
  const res = await fetch(`${HA_URL()}${path}`, { ...options, headers: headers() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HA ${options.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function getStates(domain = null) {
  const states = await haFetch('/api/states');
  if (!domain) return states;
  return states.filter(s => s.entity_id.startsWith(`${domain}.`));
}

async function getState(entity_id) {
  return haFetch(`/api/states/${entity_id}`);
}

async function callService(domain, service, data = {}) {
  return haFetch(`/api/services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function turnOn(entity_id, extra = {}) {
  const domain = entity_id.split('.')[0];
  return callService(domain, 'turn_on', { entity_id, ...extra });
}

async function turnOff(entity_id) {
  const domain = entity_id.split('.')[0];
  return callService(domain, 'turn_off', { entity_id });
}

async function ping() {
  try {
    await haFetch('/api/');
    return true;
  } catch {
    return false;
  }
}

module.exports = { getStates, getState, callService, turnOn, turnOff, ping };
