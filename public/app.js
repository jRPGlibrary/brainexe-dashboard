/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD v2.2.0 — Live Admin Panel
   Toute modification → appliquée instantanément
   ═══════════════════════════════════════════════════ */

const state = {
  guild: null,
  logs: [],
  stats: null,
  config: null,
  admin: null,
  autoRole: '',
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

  ws.onopen = () => { state.wsConnected = true; updateWsPill(); };
  ws.onclose = () => { state.wsConnected = false; updateWsPill(); setTimeout(connectWS, 3000); };
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
  }
}

function updateWsPill() {
  const pill = document.getElementById('ws-pill');
  if (state.wsConnected) {
    pill.className = 'pill online';
    pill.innerHTML = '<span class="dot"></span>Connecté';
  } else {
    pill.className = 'pill offline';
    pill.innerHTML = '<span class="dot"></span>Déconnecté';
  }
}

function refreshTopbar() {
  const a = state.admin || {};
  const count = a.memberCount ?? state.guild?._info?.memberCount ?? '—';
  document.getElementById('member-count').textContent = typeof count === 'number' ? count.toLocaleString('fr-FR') : count;
  document.getElementById('slot-label').textContent = a.slot?.label || '—';
  document.getElementById('mood-label').textContent = a.mood ? `${moodEmoji(a.mood)} ${a.mood}` : '—';
}

// ───────── NAVIGATION ─────────
function navigate(section) {
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

function renderLogEntries(logs) {
  if (!logs.length) return '<div class="empty">Aucun événement</div>';
  return logs.map(l => {
    const t = l.time ? new Date(l.time).toLocaleTimeString('fr-FR') : '--:--:--';
    return `<div class="log-entry">
      <span class="log-time">${t}</span>
      <span class="log-type ${l.type || ''}">${l.type || '—'}</span>
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
function renderLogs() {
  const sec = document.getElementById('section-logs');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Logs en direct</div>
          <div class="card-subtitle">${state.logs.length} événements</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="state.logs = []; renderLogs()">🗑 Vider (local)</button>
      </div>
      <div class="log-stream">
        ${renderLogEntries([...state.logs].reverse())}
      </div>
    </div>
  `;
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
      <div id="members-list" class="empty">Chargement…</div>
    </div>
  `;
  loadMembers();
}
async function loadMembers() {
  try {
    const res = await api('/api/members');
    const list = document.getElementById('members-list');
    const members = res.members || [];
    document.getElementById('members-count').textContent = `${members.length} membres`;
    if (!members.length) { list.innerHTML = '<div class="empty">Aucun membre</div>'; return; }
    list.innerHTML = `
      <table class="table">
        <thead><tr><th>Utilisateur</th><th>Rôles</th><th>Rejoint</th><th></th></tr></thead>
        <tbody>
          ${members.slice(0, 100).map(m => `
            <tr>
              <td>${escapeHtml(m.displayName || m.username || m.id)}</td>
              <td>${(m.roles || []).slice(0, 3).map(r => `<span class="badge">${escapeHtml(r)}</span>`).join(' ')}</td>
              <td class="text-muted text-sm">${m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('fr-FR') : '—'}</td>
              <td class="text-right text-muted text-sm">${m.bot ? '🤖' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${members.length > 100 ? `<div class="empty">… et ${members.length - 100} autres</div>` : ''}
    `;
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
    <div class="card" style="max-width:680px">
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
        <input class="input" id="post-title" placeholder="Titre de l'embed">
      </div>
      <div class="field">
        <div class="field-label">Contenu</div>
        <textarea class="textarea" id="post-content" placeholder="Ton message…"></textarea>
      </div>
      <button class="btn btn-primary btn-block" onclick="sendPost()">📤 Envoyer</button>
    </div>
  `;
}
function switchPostFormat(fmt) {
  document.querySelectorAll('#post-format .chip').forEach(c => c.classList.toggle('active', c.dataset.fmt === fmt));
  document.getElementById('post-title-field').classList.toggle('hidden', fmt !== 'embed');
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
        <thead><tr><th>Fichier</th><th>Taille</th><th>Date</th></tr></thead>
        <tbody>
          ${files.map(f => `
            <tr>
              <td style="font-family:monospace;font-size:12px">${escapeHtml(f.name || f)}</td>
              <td class="text-muted text-sm">${f.size ? (f.size / 1024).toFixed(1) + ' KB' : '—'}</td>
              <td class="text-muted text-sm">${f.date || (f.mtime ? new Date(f.mtime).toLocaleString('fr-FR') : '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch {}
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
            <div class="card-title">ℹ️ BrainEXE v2.2.0</div>
            <div class="card-subtitle">Live Admin Panel</div>
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
  if (!confirm(`Supprimer #${name} ?`)) return;
  try {
    await api(`/api/channels/${id}`, { method: 'DELETE' });
    toast('Salon supprimé', 'success');
  } catch {}
}

async function deleteRole(id, name) {
  if (!confirm(`Supprimer le rôle "${name}" ?`)) return;
  try {
    await api(`/api/roles/${id}`, { method: 'DELETE' });
    toast('Rôle supprimé', 'success');
  } catch {}
}

// ───────── MODAL ─────────
function openModal(title, body, onConfirm) {
  const bg = document.getElementById('modal-bg');
  bg.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
      </div>
      ${body}
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" id="modal-confirm">Confirmer</button>
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

  connectWS();

  try {
    const [stateRes, cfgRes, logsRes, autoRes, adminRes] = await Promise.all([
      fetch('/api/state').then(r => r.json()).catch(() => ({})),
      fetch('/api/config').then(r => r.json()).catch(() => ({})),
      fetch('/api/logs').then(r => r.json()).catch(() => ({})),
      fetch('/api/autorole').then(r => r.json()).catch(() => ({})),
      fetch('/api/admin/status').then(r => r.json()).catch(() => ({})),
    ]);
    if (stateRes.ok) { state.guild = stateRes.state; state.stats = stateRes.stats; }
    if (cfgRes.ok) state.config = cfgRes.config;
    if (logsRes.ok) state.logs = logsRes.logs || [];
    if (autoRes.ok) state.autoRole = autoRes.roleName || '';
    if (adminRes.ok) state.admin = adminRes;
  } catch (err) {
    console.error('Boot error:', err);
  }

  refreshTopbar();
  renderCurrentSection();
}

document.addEventListener('DOMContentLoaded', boot);
