const DOMAIN_ICONS = {
  light: '💡', switch: '🔌', climate: '🌡', media_player: '🎵',
  cover: '🪟', fan: '🌀', vacuum: '🤖', input_boolean: '🔘',
  sensor: '📊', binary_sensor: '🔵', default: '⚙️',
};

const DOMAIN_LABELS = {
  light: 'Lumières', switch: 'Switches', climate: 'Climat',
  media_player: 'Multimédia', cover: 'Volets', fan: 'Ventilateurs',
  vacuum: 'Aspirateurs', input_boolean: 'Booléens', sensor: 'Capteurs',
  binary_sensor: 'Capteurs binaires',
};

const TOGGLEABLE = ['light', 'switch', 'input_boolean', 'fan', 'cover', 'media_player', 'vacuum'];

let allDevices = [];
let currentDomain = '';
let chatHistory = [];
let ws = null;

// --- WebSocket ---

function initWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => setWsDot(true);
  ws.onclose = () => { setWsDot(false); setTimeout(initWS, 3000); };
  ws.onerror = () => setWsDot(false);

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'reply') appendMessage('assistant', data.content);
    else if (data.type === 'error') appendMessage('assistant', `❌ ${data.content}`);
    removeThinking();
    setInputEnabled(true);
  };
}

function setWsDot(ok) {
  const dot = document.getElementById('ws-dot');
  dot.className = 'status-dot ' + (ok ? 'connected' : 'error');
}

// --- Status ---

async function loadStatus() {
  try {
    const r = await fetch('/api/status');
    const data = await r.json();
    const el = document.getElementById('ha-status');
    el.className = 'ha-status ' + (data.ha ? 'connected' : 'error');
    el.title = data.ha ? `HA connecté (${data.haUrl})` : 'HA non joignable';
    const badge = document.getElementById('model-badge');
    if (data.model.includes('haiku')) badge.textContent = 'haiku';
    else if (data.model.includes('sonnet')) badge.textContent = 'sonnet';
    else badge.textContent = data.model.split('-')[1] || data.model;
  } catch { /* silently fail */ }
}

// --- Devices ---

async function loadDevices() {
  try {
    const url = currentDomain ? `/api/devices?domain=${currentDomain}` : '/api/devices';
    const r = await fetch(url);
    allDevices = await r.json();
    renderDevices(allDevices);
  } catch (err) {
    document.getElementById('devices-grid').innerHTML =
      `<div class="error-state">❌ Impossible de joindre Home Assistant<br><small>${err.message}</small></div>`;
  }
}

function renderDevices(devices) {
  const grid = document.getElementById('devices-grid');
  if (!devices.length) {
    grid.innerHTML = '<div class="loading-state"><p>Aucun appareil trouvé</p></div>';
    return;
  }

  const grouped = {};
  for (const d of devices) {
    const dom = d.entity_id.split('.')[0];
    if (!grouped[dom]) grouped[dom] = [];
    grouped[dom].push(d);
  }

  let html = '';
  for (const [domain, items] of Object.entries(grouped)) {
    html += `<div class="domain-header">${DOMAIN_LABELS[domain] || domain}</div>`;
    for (const item of items) {
      const isOn = item.state === 'on' || item.state === 'playing' || item.state === 'open';
      const icon = DOMAIN_ICONS[domain] || DOMAIN_ICONS.default;
      const name = item.attributes?.friendly_name || item.entity_id;
      const stateLabel = formatState(item);
      const toggleable = TOGGLEABLE.includes(domain);
      const isSensor = domain === 'sensor' || domain === 'binary_sensor';

      html += `
        <div class="device-card ${isOn ? 'on' : ''} ${isSensor ? 'sensor-card' : ''}"
             data-entity="${item.entity_id}"
             data-toggleable="${toggleable}"
             data-on="${isOn}"
             title="${item.entity_id}">
          <span class="device-icon">${icon}</span>
          <div class="device-name">${name}</div>
          <div class="device-state ${isOn ? 'on-state' : 'off-state'}">${stateLabel}</div>
        </div>`;
    }
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.device-card[data-toggleable="true"]').forEach(card => {
    card.addEventListener('click', () => toggleDevice(card));
  });
}

function formatState(item) {
  const s = item.state;
  const attrs = item.attributes || {};
  const domain = item.entity_id.split('.')[0];

  if (domain === 'climate') {
    const cur = attrs.current_temperature;
    const target = attrs.temperature;
    return cur ? `${cur}°C${target ? ` → ${target}°C` : ''}` : s;
  }
  if (domain === 'sensor') return `${s}${attrs.unit_of_measurement || ''}`;
  if (s === 'on') return 'Allumé';
  if (s === 'off') return 'Éteint';
  if (s === 'playing') return '▶ En lecture';
  if (s === 'paused') return '⏸ En pause';
  if (s === 'idle') return 'Inactif';
  if (s === 'open') return 'Ouvert';
  if (s === 'closed') return 'Fermé';
  if (s === 'unavailable') return '— indisponible';
  return s;
}

async function toggleDevice(card) {
  const entityId = card.dataset.entity;
  const isOn = card.dataset.on === 'true';
  const action = isOn ? 'off' : 'on';

  card.style.opacity = '0.5';
  try {
    await fetch(`/api/devices/${encodeURIComponent(entityId)}/${action}`, { method: 'POST' });
    setTimeout(() => { card.style.opacity = ''; loadDevices(); }, 500);
  } catch {
    card.style.opacity = '';
  }
}

// --- Chat ---

function appendMessage(role, content) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `<div class="bubble">${escapeHtml(content)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;

  if (role === 'user') chatHistory.push({ role: 'user', content });
  else chatHistory.push({ role: 'assistant', content });

  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
}

function showThinking() {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message assistant thinking';
  div.id = 'thinking-bubble';
  div.innerHTML = '<div class="bubble">…</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeThinking() {
  document.getElementById('thinking-bubble')?.remove();
}

function setInputEnabled(enabled) {
  document.getElementById('input').disabled = !enabled;
  document.getElementById('send-btn').disabled = !enabled;
}

async function sendMessage() {
  const input = document.getElementById('input');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendMessage('user', msg);
  setInputEnabled(false);
  showThinking();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'chat', message: msg, history: chatHistory.slice(0, -1) }));
  } else {
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: chatHistory.slice(0, -1) }),
      });
      const data = await r.json();
      removeThinking();
      appendMessage('assistant', data.reply || data.error);
    } catch (err) {
      removeThinking();
      appendMessage('assistant', `❌ Erreur: ${err.message}`);
    } finally {
      setInputEnabled(true);
      setTimeout(loadDevices, 1000);
    }
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

// --- Events ---

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

document.getElementById('refresh-btn').addEventListener('click', loadDevices);

document.getElementById('clear-btn').addEventListener('click', () => {
  chatHistory = [];
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '<div class="message assistant"><div class="bubble">Chat effacé. Je t\'écoute.</div></div>';
});

document.getElementById('domain-filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentDomain = btn.dataset.domain;
  loadDevices();
});

// --- Init ---

initWS();
loadStatus();
loadDevices();
setInterval(loadDevices, 30000);
