/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — websocket.js
   Connexion WebSocket temps réel + topbar
   ═══════════════════════════════════════════════════ */

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  state.ws = ws;
  state.wsReconnecting = false;

  ws.onopen = () => {
    state.wsConnected = true;
    state.wsReconnecting = false;
    state.wsLastConnected = Date.now();
    updateWsPill();
  };
  ws.onclose = () => {
    state.wsConnected = false;
    state.wsReconnecting = true;
    updateWsPill();
    setTimeout(connectWS, 3000);
  };
  ws.onmessage = (ev) => {
    try { handleWS(JSON.parse(ev.data)); } catch {}
  };
}

function handleWS(msg) {
  switch (msg.type) {
    case 'state':
      state.guild = msg.data;
      refreshTopbar();
      if (['overview', 'channels', 'roles', 'members', 'posts'].includes(state.currentSection)) {
        renderCurrentSection();
      }
      break;
    case 'logs':
      state.logs = msg.data || [];
      if (['overview', 'logs'].includes(state.currentSection)) renderCurrentSection();
      break;
    case 'stats':
      state.stats = msg.data;
      if (state.currentSection === 'overview') renderOverview();
      break;
    case 'logUpdate':
      state.logs.push(msg.data);
      if (state.logs.length > 300) state.logs = state.logs.slice(-300);
      if (['overview', 'logs'].includes(state.currentSection)) renderCurrentSection();
      break;
    case 'configUpdate':
      if (state.config && msg.data?.section) {
        state.config[msg.data.section] = { ...state.config[msg.data.section], ...msg.data.data };
      }
      break;
    case 'adminUpdate':
      loadAdmin();
      break;
    case 'tiktokLive':
      if (state.admin) state.admin.tiktokLive = !!msg.data?.status;
      refreshTopbar();
      if (state.currentSection === 'admin') renderAdmin();
      break;
    case 'fundingUpdate':
      state.funding = msg.data;
      refreshTopbar();
      if (state.currentSection === 'funding') renderFunding();
      break;
  }
}

function updateWsPill() {
  const pill = document.getElementById('ws-pill');
  if (state.wsConnected) {
    const since = state.wsLastConnected ? new Date(state.wsLastConnected).toLocaleTimeString('fr-FR') : '';
    pill.className = 'pill online';
    pill.title = since ? `Connecté depuis ${since}` : 'Connecté';
    pill.innerHTML = '<span class="dot"></span>Connecté';
  } else if (state.wsReconnecting) {
    pill.className = 'pill connecting';
    pill.title = 'Reconnexion en cours…';
    pill.innerHTML = '<span class="dot"></span>Reconnexion…';
  } else {
    pill.className = 'pill offline';
    pill.title = 'Déconnecté';
    pill.innerHTML = '<span class="dot"></span>Déconnecté';
  }
}

function refreshTopbar() {
  const a = state.admin || {};
  const count = a.memberCount ?? state.guild?._info?.memberCount ?? '—';
  document.getElementById('member-count').textContent = typeof count === 'number' ? count.toLocaleString('fr-FR') : count;
  document.getElementById('slot-label').textContent = a.slot?.label || '—';
  document.getElementById('mood-label').textContent = a.mood ? `${moodEmoji(a.mood)} ${a.mood}` : '—';
  const f = state.funding || {};
  const donated = f.totalDonated ?? 0;
  const total = f.totalCosts ?? 0;
  document.getElementById('funding-label').textContent = `${donated.toFixed(1)}€ / ${total.toFixed(1)}€`;
}
