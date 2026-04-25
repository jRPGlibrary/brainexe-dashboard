/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD v2.2.2 — Full Dashboard Refresh
   Toute modification → appliquée instantanément
   ═══════════════════════════════════════════════════ */

const state = {
  guild: null,
  logs: [],
  stats: null,
  config: null,
  admin: null,
  autoRole: '',
  funding: null,
  ws: null,
  wsConnected: false,
  currentSection: 'overview',
};

// ───────── THEME ─────────
const theme = {
  init() {
    const saved = localStorage.getItem('theme') || 'dark';
    this.apply(saved);
  },
  apply(name) {
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('theme', name);
    document.querySelectorAll('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === name);
    });
  },
};

// ───────── TOAST ─────────
function toast(msg, type = 'info') {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, 2500);
}

// ───────── API ─────────
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Live-save wrapper: shows ✓ indicator on success
async function liveSave(path, body, indicatorId) {
  try {
    const data = await api(path, { method: 'POST', body });
    showSaveIndicator(indicatorId);
    return data;
  } catch (err) {
    toast(err.message || 'Erreur', 'error');
    throw err;
  }
}

function showSaveIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1200);
}

// ───────── UTILS ─────────
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function fmtNumber(n) {
  return typeof n === 'number' ? n.toLocaleString('fr-FR') : '—';
}

function moodEmoji(m) {
  return ({ energique: '⚡', chill: '😌', hyperfocus: '🎯', zombie: '🥴' }[m] || '🎲');
}

function slotEmoji(s) {
  return ({
    sleep: '💤', wakeup: '☕', active: '🧠', lunch: '🍕',
    productive: '⚡', transition: '🚶', gaming: '🎮', latenight: '🌙'
  }[s] || '🌀');
}

// ───────── WEBSOCKET ─────────
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
      // Cross-client sync: refetch admin snapshot
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

// ───────── MOBILE SIDEBAR ─────────
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('active');
  const t = document.getElementById('menu-toggle');
  if (t) t.setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('active');
  const t = document.getElementById('menu-toggle');
  if (t) t.setAttribute('aria-expanded', 'false');
}

// ───────── NAVIGATION ─────────
function navigate(section) {
  closeSidebar();
  state.currentSection = section;
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.section === section);
  });
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === `section-${section}`);
  });
  const titles = {
    overview: ['Vue d\'ensemble', 'Dashboard temps réel · toute modification est appliquée instantanément'],
    admin:    ['🎛️ Admin live', 'Contrôle chaque paramètre du bot en direct — aucune sauvegarde requise'],
    logs:     ['📜 Logs', 'Stream temps réel des événements'],
    channels: ['💬 Salons', 'Arborescence & gestion des salons'],
    roles:    ['🎭 Rôles', 'Gestion des rôles du serveur'],
    members:  ['👥 Membres', 'Liste des membres du serveur'],
    automations: ['⚡ Automatisations', 'Features activables et tests manuels'],
    posts:    ['📝 Posts manuels', 'Envoyer un message dans un salon'],
    backups:  ['💾 Backups', 'Snapshots de configuration'],
    settings: ['⚙️ Paramètres', 'Configuration générale'],
    funding:   ['💰 Soutien Projet', 'Chaque contribution aide Brainee à grandir'],
    health:    ['❤️ Santé système', 'Discord · MongoDB · Claude · Mémoire'],
    emotions:  ['💗 Émotions', 'État émotionnel live de Brainee'],
    bonds:     ['💞 Relations', 'Liens affectifs avec les membres'],
    schedule:  ['🗓️ Planning', 'Grille horaire hebdomadaire du bot'],
    audit:     ['📖 Historique', 'Actions admin effectuées depuis le dashboard'],
  };
  const [title, sub] = titles[section] || [section, ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = sub;
  renderCurrentSection();
}

function renderCurrentSection() {
  const map = {
    overview: renderOverview, admin: renderAdmin,
    logs: renderLogs, channels: renderChannels, roles: renderRoles,
    members: renderMembers, automations: renderAutomations,
    posts: renderPosts, backups: renderBackups, settings: renderSettings,
    funding: renderFunding, health: renderHealth, emotions: renderEmotions,
    bonds: renderBonds, schedule: renderSchedule, audit: renderAudit,
  };
  const fn = map[state.currentSection];
  if (fn) fn();
}

// ───────── OVERVIEW ─────────
function renderOverview() {
  const sec = document.getElementById('section-overview');
  const a = state.admin || {};
  const g = state.guild || {};
  const stats = state.stats || {};
  const channelCount = (g.structure || []).reduce((n, c) => n + (c.channels?.length || 0), 0);
  const catCount = (g.structure || []).length;
  const internal = a.internalState || {};

  sec.innerHTML = `
    <div class="stats-grid mb-3">
      <div class="stat">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Membres</div>
        <div class="stat-value">${fmtNumber(a.memberCount)}</div>
        <div class="stat-meta">${escapeHtml(a.guildName || '')}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">🧠</div>
        <div class="stat-label">Slot actuel</div>
        <div class="stat-value" style="font-size:20px">${escapeHtml(a.slot?.label || '—')}</div>
        <div class="stat-meta">${a.slot?.forced ? '🔒 Forcé' : 'Automatique'}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">${moodEmoji(a.mood)}</div>
        <div class="stat-label">Humeur</div>
        <div class="stat-value" style="font-size:20px">${escapeHtml(a.mood || '—')}</div>
        <div class="stat-meta">Humeur du jour</div>
      </div>
      <div class="stat">
        <div class="stat-icon">📱</div>
        <div class="stat-label">TikTok</div>
        <div class="stat-value" style="font-size:20px">${a.tiktokLive ? '🔴 LIVE' : '⚫ Offline'}</div>
        <div class="stat-meta">${a.tiktokLive ? 'En direct' : 'Hors ligne'}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">💬</div>
        <div class="stat-label">Salons</div>
        <div class="stat-value">${channelCount}</div>
        <div class="stat-meta">${catCount} catégories</div>
      </div>
      <div class="stat">
        <div class="stat-icon">🎭</div>
        <div class="stat-label">Rôles</div>
        <div class="stat-value">${(g.roles || []).length}</div>
        <div class="stat-meta">&nbsp;</div>
      </div>
      <div class="stat">
        <div class="stat-icon">⚡</div>
        <div class="stat-label">Énergie</div>
        <div class="stat-value stat-accent">${internal.energy ?? '—'}</div>
        <div class="stat-meta">Charge ${internal.mentalLoad ?? '—'}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">🔄</div>
        <div class="stat-label">Syncs</div>
        <div class="stat-value">${(stats.d2f || 0) + (stats.f2d || 0)}</div>
        <div class="stat-meta">D→F ${stats.d2f || 0} · F→D ${stats.f2d || 0}</div>
      </div>
    </div>

    <div class="grid-2 mb-3">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">📊 Sidebar Discord (live)</div>
            <div class="card-subtitle">Ce que les membres voient dans le serveur</div>
          </div>
          <button class="btn btn-sm" onclick="refreshSidebarNow()">↻ Refresh</button>
        </div>
        ${renderDiscordPreview(a)}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">⚡ Actions rapides</div>
            <div class="card-subtitle">Tester les features</div>
          </div>
        </div>
        <div class="grid-2 gap-2">
          <button class="btn" onclick="action('anecdote')">📚 Anecdote</button>
          <button class="btn" onclick="action('actus')">📰 Actus</button>
          <button class="btn" onclick="action('conversation')">💬 Conversation</button>
          <button class="btn" onclick="action('morning')">☀️ Morning</button>
          <button class="btn" onclick="action('goodnight')">🌙 Goodnight</button>
          <button class="btn" onclick="action('nightwakeup')">🦉 Night wake</button>
          <button class="btn" onclick="action('tiktok/test')">📱 TikTok</button>
          <button class="btn" onclick="action('drift/check')">🔍 Drift</button>
        </div>
        <div class="divider"></div>
        <button class="btn btn-primary btn-block" onclick="navigate('admin')">🎛️ Ouvrir l'admin live →</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Activité récente</div>
          <div class="card-subtitle">${state.logs.length} événements</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="navigate('logs')">Voir tout →</button>
      </div>
      <div class="log-stream" style="max-height:280px">
        ${renderLogEntries([...state.logs].slice(-10).reverse())}
      </div>
    </div>
  `;
}

function renderDiscordPreview(a) {
  const count = a.memberCount ?? '—';
  const slotLabel = a.slot?.label || '—';
  const mood = a.mood ? `${moodEmoji(a.mood)} ${a.mood}` : '—';
  const internal = a.internalState || {};
  const activity = (internal.energy ?? 50) > 70 ? '🔥 Énergique' : (internal.energy ?? 50) > 40 ? '💭 Normale' : '😴 Calme';
  const tiktok = a.tiktokLive ? '🔴 LIVE' : '⚫ Offline';
  return `
    <div class="discord-preview">
      <div class="discord-preview-cat">▾ 📊 SYSTÈME BRAINEXE</div>
      <div class="discord-preview-ch"><span class="icon">🔊</span>👥┃Membres : ${count}</div>
      <div class="discord-preview-ch"><span class="icon">🔊</span>🧠┃État : ${escapeHtml(slotLabel)}</div>
      <div class="discord-preview-ch"><span class="icon">🔊</span>⚡┃Humeur : ${escapeHtml(mood)}</div>
      <div class="discord-preview-ch"><span class="icon">🔊</span>🔥┃Activité : ${activity}</div>
      <div class="discord-preview-ch"><span class="icon">🔊</span>📱┃TikTok : ${tiktok}</div>
    </div>
  `;
}

function renderLogEntries(logs, filter = '', typeFilter = '') {
  if (!logs.length) return '<div class="empty">Aucun événement</div>';
  const filterLow = filter.toLowerCase();
  const filtered = logs.filter(l => {
    if (typeFilter && (l.dir || l.type) !== typeFilter) return false;
    if (filterLow && !String(l.msg || '').toLowerCase().includes(filterLow)) return false;
    return true;
  });
  if (!filtered.length) return '<div class="log-empty-filtered">Aucun résultat pour ce filtre</div>';
  return filtered.map(l => {
    const t = l.ts ? new Date(l.ts).toLocaleTimeString('fr-FR') : (l.time ? l.time.slice(11, 19) : '--:--:--');
    const dirClass = l.dir || l.type || '';
    return `<div class="log-entry">
      <span class="log-time">${t}</span>
      <span class="log-type ${dirClass}">${dirClass || '—'}</span>
      <span class="log-msg">${escapeHtml(l.msg || '')}</span>
    </div>`;
  }).join('');
}

// ───────── ADMIN LIVE PANEL ─────────
function renderAdmin() {
  const sec = document.getElementById('section-admin');
  const a = state.admin || {};
  const moods = a.moods || ['energique', 'chill', 'hyperfocus', 'zombie'];
  const slots = a.slots || [];
  const internal = a.internalState || {};
  const currentMood = a.mood || 'chill';
  const currentSlotStatus = a.slot?.forced || a.slot?.status || 'active';
  const stateKeys = [
    { k: 'energy',          label: '⚡ Énergie',           hint: 'Dynamisme et élan' },
    { k: 'socialNeed',      label: '🗨️ Besoin social',     hint: 'Envie d\'interagir' },
    { k: 'calmNeed',        label: '🌿 Besoin de calme',   hint: 'Envie de tranquillité' },
    { k: 'stimulation',     label: '🎯 Stimulation',       hint: 'Intérêt / curiosité' },
    { k: 'mentalLoad',      label: '🧠 Charge mentale',    hint: 'Fatigue cognitive' },
    { k: 'recognitionNeed', label: '💖 Besoin reconnaissance', hint: 'Envie d\'être vue' },
  ];

  sec.innerHTML = `
    <div class="stats-grid mb-3">
      <div class="stat">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Membres</div>
        <div class="stat-value">${fmtNumber(a.memberCount)}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">🧠</div>
        <div class="stat-label">Slot</div>
        <div class="stat-value" style="font-size:18px">${escapeHtml(a.slot?.label || '—')}</div>
        <div class="stat-meta">${a.slot?.forced ? '🔒 Forcé' : 'Auto'}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">${moodEmoji(a.mood)}</div>
        <div class="stat-label">Humeur</div>
        <div class="stat-value" style="font-size:20px">${escapeHtml(a.mood || '—')}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">📱</div>
        <div class="stat-label">TikTok</div>
        <div class="stat-value" style="font-size:20px">${a.tiktokLive ? '🔴 LIVE' : '⚫ Off'}</div>
      </div>
    </div>

    <div class="grid-2 mb-3">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🎭 Humeur du jour</div>
            <div class="card-subtitle">Appliqué instantanément · seed l'état interne</div>
          </div>
          <span class="save-indicator" id="save-mood">sauvé</span>
        </div>
        <div class="chip-group mb-2">
          ${moods.map(m => `
            <button class="chip ${m === currentMood ? 'active' : ''}" data-mood="${m}" onclick="setMood('${m}')">
              ${moodEmoji(m)} ${m}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-sm btn-block" onclick="rerollMood()">🎲 Nouvelle humeur aléatoire</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🧠 Slot forcé</div>
            <div class="card-subtitle">Force l'état du bot (sinon auto selon l'heure Paris)</div>
          </div>
          <span class="save-indicator" id="save-slot">sauvé</span>
        </div>
        <select class="select mb-2" onchange="setSlot(this.value)">
          <option value="">🕒 Automatique (selon l'heure)</option>
          ${slots.map(s => `
            <option value="${s.status}" ${s.status === a.slot?.forced ? 'selected' : ''}>
              ${escapeHtml(s.label)} (${s.status})
            </option>
          `).join('')}
        </select>
        ${a.slot?.forced ? `<button class="btn btn-sm btn-block" onclick="setSlot('')">🔓 Revenir à l'automatique</button>` : `<div class="text-sm text-muted text-right">Actuellement en mode automatique</div>`}
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div>
          <div class="card-title">📱 TikTok Live</div>
          <div class="card-subtitle">Override manuel du statut live</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="save-indicator" id="save-tiktok">sauvé</span>
          <label class="toggle">
            <input type="checkbox" ${a.tiktokLive ? 'checked' : ''} onchange="setTiktok(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="text-sm text-muted">
        ${a.tiktokLive ? '🔴 Le bot considère le live comme actif' : '⚫ Le bot considère le live comme hors ligne'}
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div>
          <div class="card-title">💫 État interne (live)</div>
          <div class="card-subtitle">Chaque slider → appliqué immédiatement au bot</div>
        </div>
        <span class="save-indicator" id="save-state">sauvé</span>
      </div>
      ${stateKeys.map(({ k, label, hint }) => `
        <div class="field">
          <div class="field-label">
            <span>${label}</span>
            <span class="field-hint">${hint}</span>
          </div>
          <div class="slider-wrap">
            <input type="range" class="slider" min="0" max="100" value="${internal[k] ?? 50}"
              oninput="document.getElementById('v-${k}').textContent = this.value"
              onchange="setStateValue('${k}', this.value)">
            <span class="slider-value" id="v-${k}">${internal[k] ?? 50}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">📊 Aperçu Discord live</div>
          <div class="card-subtitle">Reflet de la sidebar en temps réel</div>
        </div>
        <button class="btn btn-sm" onclick="refreshSidebarNow()">↻ Force refresh</button>
      </div>
      ${renderDiscordPreview(a)}
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div>
          <div class="card-title">💰 Enregistrer une contribution</div>
          <div class="card-subtitle">Ajouter une donation au total du mois</div>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Montant (€)</label>
        <input type="number" id="donation-amount" class="input" placeholder="10.00" min="0.01" step="0.01">
      </div>
      <button class="btn btn-block" onclick="addDonation()">✓ Enregistrer</button>
    </div>
  `;
}

// Admin live-save handlers
async function setMood(mood) {
  try {
    await liveSave('/api/admin/mood', { mood }, 'save-mood');
    await loadAdmin();
  } catch {}
}
async function rerollMood() {
  try {
    await liveSave('/api/admin/mood/reroll', {}, 'save-mood');
    await loadAdmin();
    toast(`Nouvelle humeur : ${state.admin?.mood}`, 'success');
  } catch {}
}
async function setSlot(status) {
  try {
    await liveSave('/api/admin/slot', { status: status || null }, 'save-slot');
    await loadAdmin();
  } catch {}
}
async function setTiktok(live) {
  try {
    await liveSave('/api/admin/tiktok', { live }, 'save-tiktok');
    await loadAdmin();
  } catch {}
}
async function setStateValue(key, value) {
  try {
    await liveSave('/api/admin/state', { key, value: parseInt(value, 10) }, 'save-state');
    if (state.admin) {
      state.admin.internalState = { ...(state.admin.internalState || {}), [key]: parseInt(value, 10) };
      refreshTopbar();
    }
  } catch {}
}
async function refreshSidebarNow() {
  try {
    await api('/api/admin/sidebar/refresh', { method: 'POST' });
    toast('Sidebar Discord rafraîchie', 'success');
  } catch {}
}
async function addDonation() {
  const input = document.getElementById('donation-amount');
  const amount = parseFloat(input?.value || '0');
  if (!amount || amount <= 0) {
    toast('Montant invalide', 'error');
    return;
  }
  try {
    await api('/api/project/donation', { method: 'POST', body: { amount } });
    toast(`${amount}€ enregistrés ✓`, 'success');
    input.value = '';
    await loadFunding();
    renderAdmin();
  } catch (e) {
    toast(e.message || 'Erreur', 'error');
  }
}

async function loadAdmin() {
  try {
    const res = await api('/api/admin/status');
    state.admin = res;
    refreshTopbar();
    if (state.currentSection === 'admin' || state.currentSection === 'overview') {
      renderCurrentSection();
    }
  } catch (err) { /* handled */ }
}

// ───────── LOGS ─────────
const LOG_TYPES = ['SYS', 'ERR', 'D2F', 'F2D', 'API', 'JOIN'];
let _logFilter = '';
let _logTypeFilter = '';

function renderLogs() {
  const sec = document.getElementById('section-logs');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Logs en direct</div>
          <div class="card-subtitle" id="logs-count">${state.logs.length} événements</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="state.logs = []; renderLogsStream()">🗑 Vider (local)</button>
      </div>
      <div class="filter-bar">
        <input class="input search" placeholder="Rechercher…" value="${escapeHtml(_logFilter)}"
          oninput="_logFilter=this.value; renderLogsStream()">
        <select class="select" onchange="_logTypeFilter=this.value; renderLogsStream()">
          <option value="">Tous les types</option>
          ${LOG_TYPES.map(t => `<option value="${t}" ${_logTypeFilter === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="log-stream" id="logs-stream">
        ${renderLogEntries([...state.logs].reverse(), _logFilter, _logTypeFilter)}
      </div>
    </div>
  `;
}

function renderLogsStream() {
  const el = document.getElementById('logs-stream');
  if (el) el.innerHTML = renderLogEntries([...state.logs].reverse(), _logFilter, _logTypeFilter);
  const count = document.getElementById('logs-count');
  if (count) count.textContent = `${state.logs.length} événements`;
}

// ───────── CHANNELS ─────────
function renderChannels() {
  const sec = document.getElementById('section-channels');
  const g = state.guild || {};
  const tree = (g.structure || []).map(cat => `
    <div class="channel-category">
      <div class="channel-category-head">
        <span>📁 ${escapeHtml(cat.category)}</span>
        <button class="btn btn-sm" onclick="openCreateChannel('${escapeHtml(cat.category)}')">+ Salon</button>
      </div>
      ${(cat.channels || []).map(ch => `
        <div class="channel-item">
          <div class="channel-item-name">
            <span>${ch.type === 'voice' ? '🔊' : '#'}</span>
            <span>${escapeHtml(ch.name)}</span>
          </div>
          <div class="channel-actions">
            <button class="btn btn-sm btn-ghost" onclick="deleteChannel('${ch.id}', '${escapeHtml(ch.name)}')">🗑</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Arborescence des salons</div>
          <div class="card-subtitle">${(g.structure || []).length} catégories</div>
        </div>
        <div class="flex gap-1">
          <button class="btn btn-sm" onclick="openCreateCategory()">+ Catégorie</button>
          <button class="btn btn-primary btn-sm" onclick="openCreateChannel()">+ Salon</button>
        </div>
      </div>
      <div class="channel-tree">${tree || '<div class="empty">Aucune catégorie</div>'}</div>
    </div>
  `;
}

// ───────── ROLES ─────────
function renderRoles() {
  const sec = document.getElementById('section-roles');
  const roles = (state.guild?.roles || []).sort((a, b) => (b.position || 0) - (a.position || 0));
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Rôles du serveur</div>
          <div class="card-subtitle">${roles.length} rôles</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openCreateRole()">+ Nouveau</button>
      </div>
      <table class="table">
        <thead><tr><th>Nom</th><th>Couleur</th><th>Position</th><th>Affichage</th><th></th></tr></thead>
        <tbody>
          ${roles.map(r => `
            <tr>
              <td><span class="color-dot" style="background:${r.color || '#99aab5'}"></span> ${escapeHtml(r.name)}</td>
              <td class="text-muted text-sm">${r.color || '—'}</td>
              <td>${r.position || 0}</td>
              <td>${r.hoist ? '<span class="badge badge-success">Séparé</span>' : '<span class="badge">Normal</span>'}</td>
              <td class="text-right"><button class="btn btn-sm btn-ghost" onclick="deleteRole('${r.id}', '${escapeHtml(r.name)}')">🗑</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ───────── MEMBERS ─────────
let _membersData = [];
let _memberSearch = '';
let _memberSort = 'name';

function renderMembers() {
  const sec = document.getElementById('section-members');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Membres du serveur</div>
          <div class="card-subtitle" id="members-count">Chargement…</div>
        </div>
      </div>
      <div class="filter-bar">
        <input class="input search" placeholder="Rechercher un membre…" value="${escapeHtml(_memberSearch)}"
          oninput="_memberSearch=this.value; renderMembersList()">
        <select class="select" onchange="_memberSort=this.value; renderMembersList()">
          <option value="name" ${_memberSort==='name'?'selected':''}>Nom A→Z</option>
          <option value="join_asc" ${_memberSort==='join_asc'?'selected':''}>Rejoint (ancien)</option>
          <option value="join_desc" ${_memberSort==='join_desc'?'selected':''}>Rejoint (récent)</option>
          <option value="bots_last" ${_memberSort==='bots_last'?'selected':''}>Bots en dernier</option>
        </select>
      </div>
      <div id="members-list" class="empty">Chargement…</div>
    </div>
  `;
  loadMembers();
}

function renderMembersList() {
  const el = document.getElementById('members-list');
  if (!el || !_membersData.length) return;
  const searchLow = _memberSearch.toLowerCase();
  let list = _membersData.filter(m =>
    !searchLow || (m.displayName || m.username || '').toLowerCase().includes(searchLow)
  );
  list = list.slice().sort((a, b) => {
    if (_memberSort === 'name') return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
    if (_memberSort === 'join_asc') return (a.joinedAt || 0) > (b.joinedAt || 0) ? 1 : -1;
    if (_memberSort === 'join_desc') return (a.joinedAt || 0) < (b.joinedAt || 0) ? 1 : -1;
    if (_memberSort === 'bots_last') return (a.bot ? 1 : 0) - (b.bot ? 1 : 0);
    return 0;
  });
  if (!list.length) { el.innerHTML = '<div class="empty">Aucun résultat</div>'; return; }
  const shown = list.slice(0, 100);
  el.innerHTML = `
    <table class="table">
      <thead><tr><th>Utilisateur</th><th>Rôles</th><th>Affinité</th><th>Tendance</th><th>Rejoint</th></tr></thead>
      <tbody>
        ${shown.map(m => {
          const bond = m.bond;
          const affinity = bond?.baseAttachment || 0;
          const trend = getTrendIndicator(bond?.emotionalTrajectory);
          const rolesBadges = (m.roles || []).slice(0, 3).map(r => `<span class="badge">${escapeHtml(r.name || r)}</span>`).join(' ');
          const joinedDate = m.joinedAt ? (typeof m.joinedAt === 'string' ? m.joinedAt : new Date(m.joinedAt).toLocaleDateString('fr-FR')) : '—';
          return `
            <tr>
              <td class="member-cell">
                <img src="${escapeHtml(m.avatar || '')}" alt="" class="avatar-mini" onerror="this.style.display='none'">
                <span>${m.bot ? '🤖 ' : ''}${escapeHtml(m.displayName || m.username || m.id)}</span>
              </td>
              <td class="text-sm">${rolesBadges || '—'}</td>
              <td class="text-center"><div class="affinity-bar" style="width:100px; background:linear-gradient(90deg, #e74c3c ${Math.max(33, affinity * 0.33)}%, #f39c12 ${Math.max(33, Math.min(66, affinity * 0.66))}%, #27ae60 ${Math.min(100, affinity)}%)" title="${affinity}/100"></div></td>
              <td class="text-center text-sm">${trend}</td>
              <td class="text-muted text-sm">${joinedDate}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    ${list.length > 100 ? `<div class="empty">… et ${list.length - 100} autres membres</div>` : ''}
  `;
  const count = document.getElementById('members-count');
  if (count) count.textContent = `${list.length} / ${_membersData.length} membres`;
}

function getTrendIndicator(trajectory) {
  if (!Array.isArray(trajectory) || trajectory.length < 2) return '—';
  const last = trajectory[trajectory.length - 1].avgAttachment || 0;
  const prev = trajectory[Math.max(0, trajectory.length - 4)].avgAttachment || 0;
  const diff = last - prev;
  if (Math.abs(diff) < 2) return '→ stable';
  return (diff > 0 ? '↗ monte' : '↘ baisse');
}

async function loadMembers() {
  try {
    const res = await api('/api/members');
    _membersData = res.members || [];
    renderMembersList();
  } catch {}
}

// ───────── AUTOMATIONS (live toggles + tests) ─────────
function renderAutomations() {
  const sec = document.getElementById('section-automations');
  const cfg = state.config || {};
  const items = [
    { key: 'anecdote',      title: 'Anecdotes',       icon: '📚', action: 'anecdote' },
    { key: 'actus',         title: 'Actus gaming',    icon: '📰', action: 'actus' },
    { key: 'conversations', title: 'Conversations',   icon: '💬', action: 'conversation' },
    { key: 'greetings',     title: 'Greetings',       icon: '☀️', action: 'morning' },
    { key: 'tiktokLive',    title: 'TikTok Live',     icon: '📱', action: 'tiktok/test' },
    { key: 'welcome',       title: 'Welcome message', icon: '👋', action: 'welcome/test' },
  ];
  sec.innerHTML = `
    <div class="grid-auto">
      ${items.map(it => automationCard(it, cfg[it.key])).join('')}
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🔍 Drift check</div>
            <div class="card-subtitle">Détection de conversations mortes</div>
          </div>
        </div>
        <button class="btn btn-sm btn-block" onclick="action('drift/check')">▶ Lancer un drift check</button>
      </div>
    </div>
  `;
}

function automationCard(it, c) {
  c = c || {};
  const enabled = !!c.enabled;
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">${it.icon} ${it.title}</div>
          <div class="card-subtitle">${enabled ? 'Actif' : 'Inactif'}</div>
        </div>
        <label class="toggle">
          <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleFeature('${it.key}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <button class="btn btn-sm btn-block" onclick="action('${it.action}')">▶ Tester maintenant</button>
    </div>
  `;
}

async function toggleFeature(key, enabled) {
  try {
    await api('/api/config', { method: 'POST', body: { section: key, data: { enabled } } });
    if (!state.config) state.config = {};
    state.config[key] = { ...(state.config[key] || {}), enabled };
    toast(`${key} : ${enabled ? 'activé' : 'désactivé'}`, 'success');
  } catch {}
}

// ───────── POSTS ─────────
function renderPosts() {
  const sec = document.getElementById('section-posts');
  const g = state.guild || {};
  const options = [];
  (g.structure || []).forEach(cat => {
    (cat.channels || []).forEach(ch => {
      if (ch.type !== 'voice') options.push(`<option value="${ch.id}">#${escapeHtml(ch.name)} — ${escapeHtml(cat.category)}</option>`);
    });
  });
  sec.innerHTML = `
    <div class="grid-2" style="max-width:960px">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">📝 Poster un message</div>
            <div class="card-subtitle">Texte simple ou embed</div>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Salon cible</div>
          <select class="select" id="post-channel">${options.join('')}</select>
        </div>
        <div class="field">
          <div class="field-label">Format</div>
          <div class="chip-group" id="post-format">
            <button class="chip active" data-fmt="text" onclick="switchPostFormat('text')">Texte</button>
            <button class="chip" data-fmt="embed" onclick="switchPostFormat('embed')">Embed</button>
          </div>
        </div>
        <div class="field hidden" id="post-title-field">
          <div class="field-label">Titre (embed)</div>
          <input class="input" id="post-title" placeholder="Titre de l'embed" oninput="updatePostPreview()">
        </div>
        <div class="field">
          <div class="field-label">Contenu</div>
          <textarea class="textarea" id="post-content" placeholder="Ton message…" oninput="updatePostPreview()"></textarea>
        </div>
        <button class="btn btn-primary btn-block" onclick="sendPost()">📤 Envoyer</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">👁️ Aperçu</div>
            <div class="card-subtitle">Rendu Discord</div>
          </div>
        </div>
        <div id="post-preview"><div class="empty text-sm">Tape un message pour voir l'aperçu</div></div>
      </div>
    </div>
  `;
}

function switchPostFormat(fmt) {
  document.querySelectorAll('#post-format .chip').forEach(c => c.classList.toggle('active', c.dataset.fmt === fmt));
  document.getElementById('post-title-field').classList.toggle('hidden', fmt !== 'embed');
  updatePostPreview();
}

function updatePostPreview() {
  const preview = document.getElementById('post-preview');
  if (!preview) return;
  const content = document.getElementById('post-content')?.value || '';
  const fmt = document.querySelector('#post-format .chip.active')?.dataset.fmt;
  const title = document.getElementById('post-title')?.value || '';
  if (!content.trim()) {
    preview.innerHTML = '<div class="empty text-sm">Tape un message pour voir l\'aperçu</div>';
    return;
  }
  if (fmt === 'embed') {
    preview.innerHTML = `
      <div class="embed-preview">
        ${title ? `<div class="ep-title">${escapeHtml(title)}</div>` : ''}
        <div class="ep-desc">${escapeHtml(content)}</div>
        <div class="ep-footer">BrainEXE · Aujourd'hui</div>
      </div>`;
  } else {
    preview.innerHTML = `<div class="plain-preview">${escapeHtml(content)}</div>`;
  }
}
async function sendPost() {
  const channelId = document.getElementById('post-channel').value;
  const content = document.getElementById('post-content').value;
  const asEmbed = document.querySelector('#post-format .chip.active')?.dataset.fmt === 'embed';
  const embedTitle = asEmbed ? document.getElementById('post-title').value : '';
  if (!content.trim()) return toast('Contenu vide', 'error');
  try {
    await api('/api/post', { method: 'POST', body: { channelId, content, asEmbed, embedTitle } });
    toast('Message envoyé', 'success');
    document.getElementById('post-content').value = '';
  } catch {}
}

// ───────── BACKUPS ─────────
function renderBackups() {
  const sec = document.getElementById('section-backups');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">💾 Backups</div>
          <div class="card-subtitle">Snapshots de la configuration</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="createBackup()">+ Nouveau backup</button>
      </div>
      <div id="backups-list" class="empty">Chargement…</div>
    </div>
  `;
  loadBackups();
}
async function loadBackups() {
  try {
    const res = await api('/api/backups');
    const list = document.getElementById('backups-list');
    const files = res.backups || res.files || [];
    if (!files.length) { list.innerHTML = '<div class="empty">Aucun backup</div>'; return; }
    list.innerHTML = `
      <table class="table">
        <thead><tr><th>Fichier</th><th>Taille</th><th>Date</th><th></th></tr></thead>
        <tbody>
          ${files.map(f => `
            <tr>
              <td style="font-family:monospace;font-size:12px">${escapeHtml(f.name || f)}</td>
              <td class="text-muted text-sm">${f.size ? (f.size / 1024).toFixed(1) + ' KB' : '—'}</td>
              <td class="text-muted text-sm">${f.date || '—'}</td>
              <td class="text-right" style="white-space:nowrap">
                <a class="btn btn-sm btn-ghost" href="/api/backups/${encodeURIComponent(f.name)}/download" download title="Télécharger">⬇</a>
                <button class="btn btn-sm btn-ghost" onclick="restoreBackupConfig('${escapeHtml(f.name)}')" title="Restaurer config">↩</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteBackup('${escapeHtml(f.name)}')" title="Supprimer" style="color:var(--danger)">🗑</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch {}
}

async function deleteBackup(name) {
  confirmAction(`Supprimer ${name}`, `Ce fichier de backup sera supprimé définitivement.`, async () => {
    await api(`/api/backups/${encodeURIComponent(name)}`, { method: 'DELETE' });
    toast('Backup supprimé', 'success');
    loadBackups();
  }, { danger: true });
}

async function restoreBackupConfig(name) {
  confirmAction(`Restaurer config depuis ${name}`, `Les sections botConfig de ce backup seront appliquées. La structure Discord ne sera pas modifiée.`, async () => {
    const res = await api(`/api/backups/${encodeURIComponent(name)}/restore-config`, { method: 'POST' });
    toast(`Config restaurée — ${res.sections} sections appliquées`, 'success');
  });
}
async function createBackup() {
  try {
    await api('/api/backup', { method: 'POST' });
    toast('Backup créé', 'success');
    loadBackups();
  } catch {}
}

// ───────── SETTINGS ─────────
function renderSettings() {
  const sec = document.getElementById('section-settings');
  const cfg = state.config || {};
  const w = cfg.welcome || {};
  sec.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🔄 Synchronisation</div>
            <div class="card-subtitle">Discord ↔ Fichier</div>
          </div>
        </div>
        <div class="flex gap-1">
          <button class="btn flex-1" onclick="action('sync/discord-to-file')">⬇ D → F</button>
          <button class="btn flex-1" onclick="action('sync/file-to-discord')">⬆ F → D</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🎭 Auto-rôle</div>
            <div class="card-subtitle">Rôle attribué à l'arrivée</div>
          </div>
          <span class="save-indicator" id="save-autorole">sauvé</span>
        </div>
        <input class="input" id="autorole-input" value="${escapeHtml(state.autoRole || '')}"
          placeholder="Nom du rôle"
          oninput="debouncedSaveAutoRole(this.value)">
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">👋 Welcome</div>
            <div class="card-subtitle">${w.enabled ? 'Actif' : 'Inactif'}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${w.enabled ? 'checked' : ''} onchange="toggleFeature('welcome', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <button class="btn btn-sm btn-block" onclick="action('welcome/test')">▶ Tester welcome</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">ℹ️ BrainEXE v2.2.2</div>
            <div class="card-subtitle">Full Dashboard Refresh</div>
          </div>
        </div>
        <div class="text-sm text-muted flex flex-col gap-1">
          <div>⚡ Toute modification appliquée en direct</div>
          <div>🎛️ Contrôle total du bot (mood, slot, état, TikTok)</div>
          <div>🎨 3 thèmes (light / dark / sombre)</div>
          <div>📊 Sidebar Discord temps réel</div>
        </div>
      </div>
    </div>
  `;
}

let _autoRoleTimer;
function debouncedSaveAutoRole(value) {
  clearTimeout(_autoRoleTimer);
  _autoRoleTimer = setTimeout(async () => {
    try {
      await liveSave('/api/autorole', { roleName: value }, 'save-autorole');
      state.autoRole = value;
    } catch {}
  }, 400);
}

// ───────── ACTIONS ─────────
async function action(endpoint) {
  try {
    await api(`/api/${endpoint}`, { method: 'POST' });
    toast(`✓ ${endpoint}`, 'success');
  } catch {}
}

async function deleteChannel(id, name) {
  confirmAction(`Supprimer #${name}`, `Le salon #${name} sera supprimé définitivement de Discord.`, async () => {
    await api(`/api/channels/${id}`, { method: 'DELETE' });
    toast('Salon supprimé', 'success');
  }, { danger: true });
}

async function deleteRole(id, name) {
  confirmAction(`Supprimer le rôle "${name}"`, `Le rôle "${name}" sera supprimé définitivement de Discord.`, async () => {
    await api(`/api/roles/${id}`, { method: 'DELETE' });
    toast('Rôle supprimé', 'success');
  }, { danger: true });
}

// ───────── MODAL ─────────
function confirmAction(title, message, onConfirm, { danger = false } = {}) {
  const body = `
    <p class="confirm-msg">${escapeHtml(message)}</p>
    ${danger ? `<div class="confirm-warn">⚠️ Cette action est irréversible.</div>` : ''}
  `;
  openModal(title, body, onConfirm, danger);
}

function openModal(title, body, onConfirm, danger = false) {
  const bg = document.getElementById('modal-bg');
  const confirmClass = danger ? 'btn btn-danger' : 'btn btn-primary';
  bg.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
      </div>
      ${body}
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Annuler</button>
        <button class="${confirmClass}" id="modal-confirm">Confirmer</button>
      </div>
    </div>
  `;
  bg.classList.add('active');
  document.getElementById('modal-confirm').onclick = async () => {
    try { await onConfirm(); closeModal(); } catch {}
  };
}
function closeModal() {
  document.getElementById('modal-bg').classList.remove('active');
}

function openCreateCategory() {
  openModal('Nouvelle catégorie', `
    <div class="field">
      <div class="field-label">Nom</div>
      <input class="input" id="m-name" placeholder="📁 ・ MA CATÉGORIE">
    </div>
  `, async () => {
    const name = document.getElementById('m-name').value.trim();
    if (!name) return toast('Nom requis', 'error');
    await api('/api/categories', { method: 'POST', body: { name } });
    toast('Catégorie créée', 'success');
  });
}

function openCreateChannel(categoryName = '') {
  const cats = (state.guild?.structure || [])
    .map(c => `<option ${c.category === categoryName ? 'selected' : ''}>${escapeHtml(c.category)}</option>`)
    .join('');
  openModal('Nouveau salon', `
    <div class="field">
      <div class="field-label">Nom</div>
      <input class="input" id="m-name" placeholder="mon-salon">
    </div>
    <div class="field">
      <div class="field-label">Catégorie</div>
      <select class="select" id="m-cat">${cats}</select>
    </div>
    <div class="field">
      <div class="field-label">Type</div>
      <select class="select" id="m-type">
        <option value="text">Texte</option>
        <option value="voice">Vocal</option>
      </select>
    </div>
    <div class="field">
      <div class="field-label">Topic (optionnel)</div>
      <input class="input" id="m-topic" placeholder="Description">
    </div>
  `, async () => {
    const name = document.getElementById('m-name').value.trim();
    const categoryName = document.getElementById('m-cat').value;
    const type = document.getElementById('m-type').value;
    const topic = document.getElementById('m-topic').value;
    if (!name) return toast('Nom requis', 'error');
    await api('/api/channels', { method: 'POST', body: { name, type, categoryName, topic } });
    toast('Salon créé', 'success');
  });
}

function openCreateRole() {
  openModal('Nouveau rôle', `
    <div class="field">
      <div class="field-label">Nom</div>
      <input class="input" id="m-name" placeholder="Mon rôle">
    </div>
    <div class="field">
      <div class="field-label">Couleur</div>
      <input class="input" type="color" id="m-color" value="#7c5cbf">
    </div>
    <div class="field">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="m-hoist">
        <span>Afficher séparément dans la liste</span>
      </label>
    </div>
  `, async () => {
    const name = document.getElementById('m-name').value.trim();
    const color = document.getElementById('m-color').value;
    const hoist = document.getElementById('m-hoist').checked;
    if (!name) return toast('Nom requis', 'error');
    await api('/api/roles', { method: 'POST', body: { name, color, hoist } });
    toast('Rôle créé', 'success');
  });
}

// ───────── FUNDING ─────────
async function loadFunding() {
  try {
    const data = await api('/api/project/funding');
    state.funding = data;
    refreshTopbar();
  } catch (e) {
    console.error('Funding load error:', e);
  }
}

function renderFunding() {
  const sec = document.getElementById('section-funding');
  const f = state.funding || {};
  const donated = f.totalDonated ?? 0;
  const total = f.totalCosts ?? 0;
  const percent = total > 0 ? Math.min(100, (donated / total) * 100) : 0;

  sec.innerHTML = `
    <div class="card">
      <h3>💰 Soutien du projet</h3>
      <p style="color:var(--text-2);margin-top:8px;line-height:1.6">
        Brainee a besoin de serveurs, d'API, et de stockage pour fonctionner.
        Chaque euro collecté aide à couvrir ces frais et à faire grandir le projet.
      </p>

      <div style="margin-top:32px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-weight:600">Progression ce mois</span>
          <span style="color:var(--accent)">${donated.toFixed(2)}€ / ${total.toFixed(2)}€</span>
        </div>
        <div style="background:var(--surface-hover);border-radius:8px;height:20px;overflow:hidden">
          <div style="background:var(--accent);height:100%;width:${percent}%;transition:width 0.3s"></div>
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--text-3)">
          ${percent.toFixed(0)}% · ${(total - donated).toFixed(2)}€ restant cette mois
        </div>
      </div>

      <div style="margin-top:32px;padding:20px;background:var(--accent-bg);border-radius:12px;border-left:4px solid var(--accent)">
        <div style="font-weight:600;margin-bottom:12px">🎁 Tu veux contribuer ?</div>
        <p style="color:var(--text-2);margin-bottom:12px">
          Les contributions se font sans engagement, de manière libre et directe via PayPal.
        </p>
        <a href="https://paypal.me/MatthieuMAUBERNARD" target="_blank" style="
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:10px 16px;
          background:var(--accent);
          color:white;
          border-radius:6px;
          font-weight:600;
          text-decoration:none;
        ">
          💳 Soutenir via PayPal
        </a>
      </div>

      <div style="margin-top:32px;padding:20px;background:var(--surface-active);border-radius:12px">
        <div style="font-weight:600;margin-bottom:16px">📊 Détail des coûts</div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>Serveur</span>
          <span>${(f.costs?.server || 0).toFixed(2)}€</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>API Claude</span>
          <span>${(f.costs?.claude || 0).toFixed(2)}€</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>Stockage</span>
          <span>${(f.costs?.storage || 0).toFixed(2)}€</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;font-weight:600;color:var(--accent)">
          <span>Total</span>
          <span>${total.toFixed(2)}€</span>
        </div>
      </div>
    </div>
  `;
}

// ───────── HEALTH ─────────
async function renderHealth() {
  const sec = document.getElementById('section-health');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const h = await api('/api/health');
    const uptime = h.uptimeMs ? formatDuration(h.uptimeMs) : '—';
    const discordOk = h.discord?.ready;
    const mongoOk = h.mongo?.ready;
    const claudeOk = (h.claude?.consecutiveErrors || 0) < 3;
    const ping = h.discord?.ping != null ? `${h.discord.ping}ms` : '—';
    const claudeErrors = h.claude?.consecutiveErrors || 0;
    const lastClaudeLat = h.claude?.lastLatencyMs != null ? `${h.claude.lastLatencyMs}ms` : '—';
    const lastSuccess = h.claude?.lastSuccess ? new Date(h.claude.lastSuccess).toLocaleTimeString('fr-FR') : '—';
    const lastError = h.claude?.lastError ? new Date(h.claude.lastError).toLocaleTimeString('fr-FR') : '—';

    sec.innerHTML = `
      <div class="health-grid mb-3">
        <div class="health-card ${discordOk ? 'ok' : 'error'}">
          <div class="health-label">Discord</div>
          <div class="health-status">
            <span class="health-dot ${discordOk ? 'ok' : 'error'}"></span>
            ${discordOk ? 'Connecté' : 'Déconnecté'}
          </div>
          <div class="health-meta">
            ${h.discord?.tag ? `Bot : ${escapeHtml(h.discord.tag)}<br>` : ''}
            Latence WS : ${ping}
          </div>
        </div>

        <div class="health-card ${mongoOk ? 'ok' : 'error'}">
          <div class="health-label">MongoDB</div>
          <div class="health-status">
            <span class="health-dot ${mongoOk ? 'ok' : 'error'}"></span>
            ${mongoOk ? 'Connecté' : 'Déconnecté'}
          </div>
          <div class="health-meta">Base de données cloud</div>
        </div>

        <div class="health-card ${claudeOk ? 'ok' : 'warn'}">
          <div class="health-label">Claude API</div>
          <div class="health-status">
            <span class="health-dot ${claudeOk ? 'ok' : 'warn'}"></span>
            ${claudeErrors === 0 ? 'OK' : `${claudeErrors} erreur${claudeErrors > 1 ? 's' : ''} consécutive${claudeErrors > 1 ? 's' : ''}`}
          </div>
          <div class="health-meta">
            Appels : ${h.claude?.totalCalls || 0} · Erreurs : ${h.claude?.totalErrors || 0}<br>
            Latence : ${lastClaudeLat}<br>
            Dernier succès : ${lastSuccess}
            ${claudeErrors > 0 ? `<br>Dernière erreur : ${lastError}<br><span style="color:var(--danger)">${escapeHtml(h.claude?.lastErrorMsg || '')}</span>` : ''}
          </div>
        </div>

        <div class="health-card ok">
          <div class="health-label">Système</div>
          <div class="health-status"><span class="health-dot ok"></span>En ligne</div>
          <div class="health-meta">
            Uptime : ${uptime}<br>
            Mémoire RSS : ${h.memoryMb || 0} Mo<br>
            Logs en buffer : ${h.logsCount || 0}<br>
            TikTok : ${h.tiktokLive ? '🔴 Live' : '⚫ Offline'}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Rafraîchir</div>
        </div>
        <button class="btn btn-sm" onclick="renderHealth()">↻ Actualiser</button>
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty text-sm" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}j ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

// ───────── EMOTIONS ─────────
async function renderEmotions() {
  const sec = document.getElementById('section-emotions');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const res = await api('/api/emotions/state');
    const internal = res.internalState || {};
    const stack = res.emotionStack || [];
    const temp = res.temperament || {};

    const stateKeys = [
      { k: 'energy',          label: '⚡ Énergie' },
      { k: 'socialNeed',      label: '🗨️ Besoin social' },
      { k: 'calmNeed',        label: '🌿 Besoin calme' },
      { k: 'stimulation',     label: '🎯 Stimulation' },
      { k: 'mentalLoad',      label: '🧠 Charge mentale' },
      { k: 'recognitionNeed', label: '💖 Besoin reconnaissance' },
    ];

    const activeEmotions = stack.filter(e => e.intensity >= 15).sort((a, b) => b.intensity - a.intensity);

    sec.innerHTML = `
      <div class="grid-2 mb-3">
        <div class="card">
          <div class="card-header">
            <div class="card-title">💫 États internes</div>
            <button class="btn btn-sm" onclick="renderEmotions()">↻</button>
          </div>
          <div class="state-bars">
            ${stateKeys.map(({ k, label }) => {
              const val = Math.round(internal[k] ?? 50);
              const color = val > 75 ? 'var(--danger)' : val > 50 ? 'var(--accent)' : val > 25 ? 'var(--success)' : 'var(--text-3)';
              return `
                <div class="state-bar">
                  <div class="state-bar-label">
                    <span>${label}</span>
                    <span style="font-variant-numeric:tabular-nums;font-weight:600">${val}</span>
                  </div>
                  <div class="state-bar-track">
                    <div class="state-bar-fill" style="width:${val}%;background:${color}"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🎭 Tempérament (stable)</div>
          </div>
          <div class="state-bars">
            ${Object.entries(temp).map(([k, v]) => `
              <div class="state-bar">
                <div class="state-bar-label">
                  <span>${k}</span>
                  <span style="font-variant-numeric:tabular-nums;font-weight:600">${v}</span>
                </div>
                <div class="state-bar-track">
                  <div class="state-bar-fill" style="width:${v}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">💗 Émotions actives</div>
          <div class="card-subtitle">${activeEmotions.length} émotion${activeEmotions.length !== 1 ? 's' : ''} en ce moment</div>
        </div>
        ${activeEmotions.length ? `
          <div class="emotion-stack">
            ${activeEmotions.map(e => {
              const opacity = e.intensity >= 50 ? '' : 'low';
              return `<div class="emotion-chip ${opacity}">
                ${escapeHtml(e.name)}
                <span class="intensity">${Math.round(e.intensity)}</span>
              </div>`;
            }).join('')}
          </div>
        ` : '<div class="empty">Aucune émotion active en ce moment</div>'}
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}

// ───────── BONDS ─────────
async function renderBonds() {
  const sec = document.getElementById('section-bonds');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const res = await api('/api/emotions/bonds');
    const bonds = res.bonds || [];
    if (!bonds.length) {
      sec.innerHTML = '<div class="card"><div class="empty">Aucune relation enregistrée pour l\'instant</div></div>';
      return;
    }
    sec.innerHTML = `
      <div class="card mb-3">
        <div class="card-header">
          <div class="card-title">💞 Relations membres</div>
          <div class="card-subtitle">${bonds.length} membre${bonds.length > 1 ? 's' : ''} · tri par attachement</div>
          <button class="btn btn-sm" onclick="renderBonds()">↻</button>
        </div>
        <div class="bond-grid">
          ${bonds.map(b => {
            const att = Math.round(b.baseAttachment || 0);
            const trust = Math.round(b.baseTrust || 0);
            const comfort = Math.round(b.baseComfort || 0);
            const tier = att >= 65 ? 'strong' : att >= 40 ? 'mid' : 'low';
            const tierLabel = att >= 65 ? 'Fort' : att >= 40 ? 'Moyen' : 'Faible';
            const traj = b.emotionalTrajectory || [];
            const sparkMax = Math.max(...traj.map(t => t.avgAttachment || 0), 1);
            const spark = traj.slice(-10).map(t => {
              const pct = Math.round(((t.avgAttachment || 0) / sparkMax) * 100);
              return `<div class="bond-spark-bar" style="height:${Math.max(4, pct)}%" title="${t.day}: ${t.avgAttachment}"></div>`;
            }).join('');
            return `
              <div class="bond-card">
                <div class="bond-card-head">
                  <div class="bond-name">${escapeHtml(b.username || b.userId || '—')}</div>
                  <span class="bond-strength ${tier}">${tierLabel}</span>
                </div>
                <div class="bond-metrics">
                  <div class="bond-metric">
                    <div class="bond-metric-label">Attachement</div>
                    <div class="bond-metric-value" style="color:var(--accent)">${att}</div>
                  </div>
                  <div class="bond-metric">
                    <div class="bond-metric-label">Confiance</div>
                    <div class="bond-metric-value">${trust}</div>
                  </div>
                  <div class="bond-metric">
                    <div class="bond-metric-label">Confort</div>
                    <div class="bond-metric-value">${comfort}</div>
                  </div>
                </div>
                ${traj.length >= 2 ? `<div class="bond-spark">${spark}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}

// ───────── SCHEDULE ─────────
async function renderSchedule() {
  const sec = document.getElementById('section-schedule');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const res = await api('/api/schedule');
    const days = [
      { label: 'Lun–Ven', slots: res.weekday },
      { label: 'Samedi', slots: res.saturday },
      { label: 'Dimanche', slots: res.sunday },
    ];
    const now = res.now || {};
    const currentHour = Math.floor(now.hour || 0);
    const currentDay = now.day; // 0=Sun,6=Sat
    const slotColors = {
      sleep: '#5b6ea7', wakeup: '#fbbf24', active: '#818cf8',
      lunch: '#f59e0b', productive: '#22d3ee', transition: '#a78bfa',
      gaming: '#ec4899', latenight: '#4338ca',
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const renderDay = (dayLabel, slots, isToday) => {
      const cells = hours.map(h => {
        const slot = slots.find(s => h >= s.start && h < s.end);
        if (!slot) return `<div class="schedule-cell" data-tip="${h}h : —"></div>`;
        const isCurrent = isToday && h === currentHour;
        return `<div class="schedule-cell${isCurrent ? ' current' : ''}"
          data-status="${slot.status}"
          data-tip="${h}h : ${slot.label} (max ${slot.maxConv} conv)"
          title="${h}h : ${slot.label}"></div>`;
      }).join('');
      return `<div class="schedule-day-label${isToday ? ' text-bold' : ''}" style="${isToday ? 'color:var(--accent)' : ''}">${dayLabel}</div>${cells}`;
    };

    const isToday = (dayLabel) => {
      if (dayLabel === 'Samedi' && currentDay === 6) return true;
      if (dayLabel === 'Dimanche' && currentDay === 0) return true;
      if (dayLabel === 'Lun–Ven' && currentDay >= 1 && currentDay <= 5) return true;
      return false;
    };

    const uniqueStatuses = [...new Set(days.flatMap(d => d.slots.map(s => s.status)))];

    sec.innerHTML = `
      <div class="card mb-3">
        <div class="card-header">
          <div>
            <div class="card-title">🗓️ Planning hebdomadaire</div>
            <div class="card-subtitle">Slot actuel : ${escapeHtml(now.label || '—')} · ${now.forced ? '🔒 Forcé' : 'Automatique'}</div>
          </div>
          <button class="btn btn-sm" onclick="navigate('admin')">🎛️ Forcer un slot →</button>
        </div>
        <div class="schedule-wrap">
          <div class="schedule-grid">
            <div class="schedule-head"></div>
            ${hours.map(h => `<div class="schedule-head">${h}</div>`).join('')}
            ${days.map(d => renderDay(d.label, d.slots, isToday(d.label))).join('')}
          </div>
        </div>
        <div class="schedule-legend">
          ${uniqueStatuses.map(s => {
            const slot = days.flatMap(d => d.slots).find(x => x.status === s);
            return `<div class="schedule-legend-item">
              <div class="schedule-legend-swatch" data-status="${s}" style="background:${slotColors[s] || '#888'}"></div>
              <span>${slot ? slot.label : s}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}

// ───────── AUDIT ─────────
const AUDIT_LABELS = {
  'channel.delete': '🗑 Salon supprimé',
  'role.delete': '🗑 Rôle supprimé',
  'member.mute': '🔇 Membre muté',
  'member.kick': '👢 Membre kické',
  'member.ban': '🔨 Membre banni',
  'post.send': '📤 Message posté',
  'config.update': '⚙️ Config modifiée',
  'admin.mood': '🎭 Humeur changée',
  'admin.slot': '🧠 Slot forcé',
  'admin.state': '💫 État interne',
  'admin.tiktok': '📱 TikTok override',
  'backup.create': '💾 Backup créé',
  'backup.delete': '🗑 Backup supprimé',
  'backup.restore-config': '↩ Config restaurée',
  'autorole.update': '🎭 Auto-rôle modifié',
  'funding.donation': '💰 Donation enregistrée',
};

async function renderAudit() {
  const sec = document.getElementById('section-audit');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const res = await api('/api/audit');
    const entries = res.entries || [];
    if (!entries.length) {
      sec.innerHTML = '<div class="card"><div class="empty">Aucune action enregistrée pour cette session</div></div>';
      return;
    }
    sec.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📖 Historique des actions</div>
          <div class="card-subtitle">${entries.length} action${entries.length > 1 ? 's' : ''} · session courante</div>
          <button class="btn btn-sm" onclick="renderAudit()">↻</button>
        </div>
        <div>
          ${entries.map(e => {
            const time = e.ts ? new Date(e.ts).toLocaleString('fr-FR') : '—';
            const label = AUDIT_LABELS[e.action] || e.action;
            const detail = Object.entries(e.details || {})
              .filter(([k]) => k !== 'preview')
              .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join(' · ');
            return `<div class="audit-entry">
              <span class="audit-time">${time}</span>
              <span class="audit-action">${label}</span>
              <span class="audit-details">${escapeHtml(detail)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}

// ───────── BOOT ─────────
async function boot() {
  theme.init();

  document.querySelectorAll('.theme-btn').forEach(b => {
    b.addEventListener('click', () => theme.apply(b.dataset.theme));
  });
  document.querySelectorAll('.nav-item').forEach(b => {
    b.addEventListener('click', () => navigate(b.dataset.section));
  });
  document.getElementById('modal-bg').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Mobile menu
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('open')) closeSidebar();
    else openSidebar();
  });
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebar();
      closeModal();
    }
  });

  connectWS();

  try {
    const [stateRes, cfgRes, logsRes, autoRes, adminRes, fundingRes] = await Promise.all([
      fetch('/api/state').then(r => r.json()).catch(() => ({})),
      fetch('/api/config').then(r => r.json()).catch(() => ({})),
      fetch('/api/logs').then(r => r.json()).catch(() => ({})),
      fetch('/api/autorole').then(r => r.json()).catch(() => ({})),
      fetch('/api/admin/status').then(r => r.json()).catch(() => ({})),
      fetch('/api/project/funding').then(r => r.json()).catch(() => ({})),
    ]);
    if (stateRes.ok) { state.guild = stateRes.state; state.stats = stateRes.stats; }
    if (cfgRes.ok) state.config = cfgRes.config;
    if (logsRes.ok) state.logs = logsRes.logs || [];
    if (autoRes.ok) state.autoRole = autoRes.roleName || '';
    if (adminRes.ok) state.admin = adminRes;
    if (fundingRes.ok) state.funding = fundingRes;
  } catch (err) {
    console.error('Boot error:', err);
  }

  refreshTopbar();
  renderCurrentSection();
}

document.addEventListener('DOMContentLoaded', boot);
