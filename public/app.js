/* ============================================
   BRAINEXE DASHBOARD v2.1.0 — Client Logic
   ============================================ */

// ---- STATE ----
const state = {
  guild: null,
  logs: [],
  stats: null,
  config: null,
  slot: null,
  emotions: null,
  ws: null,
  wsConnected: false,
  currentSection: 'overview',
};

// ---- THEME ----
const theme = {
  init() {
    const saved = localStorage.getItem('theme') || 'light';
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

// ---- TOAST ----
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, 2800);
}

// ---- API ----
async function api(path, opts = {}) {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    toast(err.message || 'Erreur API', 'error');
    throw err;
  }
}

// ---- WEBSOCKET ----
function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  state.ws = ws;

  ws.onopen = () => {
    state.wsConnected = true;
    updateStatusPill();
  };

  ws.onclose = () => {
    state.wsConnected = false;
    updateStatusPill();
    setTimeout(connectWS, 3000);
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      handleWSMessage(msg);
    } catch {}
  };
}

function handleWSMessage(msg) {
  if (msg.type === 'state') {
    state.guild = msg.data;
    renderCurrentSection();
  } else if (msg.type === 'logs') {
    state.logs = msg.data || [];
    if (state.currentSection === 'logs' || state.currentSection === 'overview') {
      renderCurrentSection();
    }
  } else if (msg.type === 'stats') {
    state.stats = msg.data;
    if (state.currentSection === 'overview') renderOverview();
  } else if (msg.type === 'logUpdate') {
    state.logs.push(msg.data);
    if (state.logs.length > 200) state.logs = state.logs.slice(-200);
    if (state.currentSection === 'logs' || state.currentSection === 'overview') {
      renderCurrentSection();
    }
  }
}

function updateStatusPill() {
  const pill = document.getElementById('ws-status');
  if (state.wsConnected) {
    pill.className = 'status-pill online';
    pill.innerHTML = '<span class="dot"></span>Connecté';
  } else {
    pill.className = 'status-pill offline';
    pill.innerHTML = '<span class="dot"></span>Déconnecté';
  }
}

// ---- NAVIGATION ----
function navigate(section) {
  state.currentSection = section;
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.section === section);
  });
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === `section-${section}`);
  });
  renderCurrentSection();
}

function renderCurrentSection() {
  const map = {
    overview: renderOverview,
    channels: renderChannels,
    roles: renderRoles,
    members: renderMembers,
    automations: renderAutomations,
    posts: renderPosts,
    logs: renderLogs,
    backups: renderBackups,
    settings: renderSettings,
  };
  const fn = map[state.currentSection];
  if (fn) fn();
}

// ---- RENDERERS ----
function renderOverview() {
  const sec = document.getElementById('section-overview');
  const g = state.guild || {};
  const stats = state.stats || {};
  const slot = state.slot?.slot || {};
  const mood = state.slot?.mood || '—';

  const channelCount = (g.structure || []).reduce((n, c) => n + (c.channels?.length || 0), 0);
  const catCount = (g.structure || []).length;
  const memberCount = g._info?.memberCount || g._info?.totalMembers || '—';

  sec.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">👥 Membres</div>
        <div class="stat-value">${memberCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">💬 Salons</div>
        <div class="stat-value">${channelCount}</div>
        <div class="stat-meta">${catCount} catégories</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">🎭 Rôles</div>
        <div class="stat-value">${(g.roles || []).length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">🔄 Syncs</div>
        <div class="stat-value">${(stats.d2f || 0) + (stats.f2d || 0)}</div>
        <div class="stat-meta">D→F ${stats.d2f || 0} · F→D ${stats.f2d || 0}</div>
      </div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">État actuel du bot</div>
            <div class="card-subtitle">Slot et humeur en cours</div>
          </div>
        </div>
        <div class="flex flex-col gap">
          <div class="flex justify-between items-center">
            <span class="text-muted text-sm">Slot</span>
            <span class="badge badge-accent">${slot.label || '—'}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-muted text-sm">Humeur</span>
            <span class="badge badge-info">${mood}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-muted text-sm">Statut</span>
            <span class="badge ${slot.maxConv > 0 ? 'badge-success' : 'badge-warning'}">
              ${slot.maxConv > 0 ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Actions rapides</div>
            <div class="card-subtitle">Tester les features</div>
          </div>
        </div>
        <div class="grid-2">
          <button class="btn" onclick="action('anecdote')">📚 Anecdote</button>
          <button class="btn" onclick="action('actus')">📰 Actus</button>
          <button class="btn" onclick="action('conversation')">💬 Conversation</button>
          <button class="btn" onclick="action('morning')">☀️ Morning</button>
          <button class="btn" onclick="action('goodnight')">🌙 Goodnight</button>
          <button class="btn" onclick="action('tiktok/test')">📱 TikTok test</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Activité récente</div>
          <div class="card-subtitle">10 derniers événements</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="navigate('logs')">Voir tout →</button>
      </div>
      <div class="log-stream" style="max-height: 280px;">
        ${renderLogEntries(state.logs.slice(-10).reverse())}
      </div>
    </div>
  `;
}

function renderLogEntries(logs) {
  if (!logs.length) return '<div class="empty-state">Aucun événement</div>';
  return logs.map(l => {
    const t = l.time ? new Date(l.time).toLocaleTimeString('fr-FR') : '--:--:--';
    return `<div class="log-entry">
      <span class="log-time">${t}</span>
      <span class="log-type ${l.type || ''}">${l.type || '—'}</span>
      <span class="log-msg">${escapeHtml(l.msg || '')}</span>
    </div>`;
  }).join('');
}

function renderChannels() {
  const sec = document.getElementById('section-channels');
  const g = state.guild || {};
  const tree = (g.structure || []).map(cat => `
    <div class="channel-category">
      <div class="channel-category-header">
        <span>📂 ${escapeHtml(cat.category)}</span>
        <div class="channel-actions">
          <button class="btn btn-sm" onclick="openCreateChannel('${escapeHtml(cat.category)}')">+ Salon</button>
        </div>
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
    <div class="card mb-lg">
      <div class="card-header">
        <div>
          <div class="card-title">Salons du serveur</div>
          <div class="card-subtitle">${(g.structure || []).length} catégories</div>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-sm" onclick="openCreateCategory()">+ Catégorie</button>
          <button class="btn btn-sm btn-primary" onclick="openCreateChannel()">+ Salon</button>
        </div>
      </div>
      ${tree || '<div class="empty-state">Aucune catégorie</div>'}
    </div>
  `;
}

function renderRoles() {
  const sec = document.getElementById('section-roles');
  const roles = (state.guild?.roles || []).sort((a, b) => (b.position || 0) - (a.position || 0));

  sec.innerHTML = `
    <div class="card mb-lg">
      <div class="card-header">
        <div>
          <div class="card-title">Rôles du serveur</div>
          <div class="card-subtitle">${roles.length} rôles</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="openCreateRole()">+ Nouveau rôle</button>
      </div>
      <table class="table">
        <thead>
          <tr><th>Nom</th><th>Couleur</th><th>Position</th><th>Visible</th><th></th></tr>
        </thead>
        <tbody>
          ${roles.map(r => `
            <tr>
              <td><span class="color-dot" style="background:${r.color || '#99aab5'}"></span>${escapeHtml(r.name)}</td>
              <td><span class="text-muted text-sm">${r.color || '—'}</span></td>
              <td>${r.position || 0}</td>
              <td>${r.hoist ? '<span class="badge badge-success">Oui</span>' : '<span class="badge">Non</span>'}</td>
              <td class="text-right">
                <button class="btn btn-sm btn-ghost" onclick="deleteRole('${r.id}', '${escapeHtml(r.name)}')">🗑</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderMembers() {
  const sec = document.getElementById('section-members');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Membres du serveur</div>
          <div class="card-subtitle">Chargement...</div>
        </div>
      </div>
      <div id="members-list" class="empty-state">Chargement des membres...</div>
    </div>
  `;
  loadMembers();
}

async function loadMembers() {
  try {
    const res = await api('/api/members');
    const list = document.getElementById('members-list');
    const members = res.members || [];
    if (!members.length) { list.innerHTML = '<div class="empty-state">Aucun membre</div>'; return; }
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
      ${members.length > 100 ? `<div class="empty-state">... et ${members.length - 100} autres</div>` : ''}
    `;
  } catch (err) {}
}

function renderAutomations() {
  const sec = document.getElementById('section-automations');
  const cfg = state.config || {};

  sec.innerHTML = `
    <div class="grid-2">
      ${automationCard('Anecdotes', '📚', cfg.anecdote, 'anecdote')}
      ${automationCard('Actus gaming', '📰', cfg.actus, 'actus')}
      ${automationCard('Conversations', '💬', cfg.conversations, 'conversation')}
      ${automationCard('Greetings', '☀️', cfg.greetings, 'morning')}
      ${automationCard('TikTok Live', '📱', cfg.tiktokLive, 'tiktok/test')}
      ${automationCard('Drift check', '🔍', { enabled: true }, 'drift/check')}
    </div>
  `;
}

function automationCard(title, icon, cfg, action) {
  cfg = cfg || {};
  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">${icon} ${title}</div>
          <div class="card-subtitle">${cfg.enabled ? 'Actif' : 'Inactif'}</div>
        </div>
        <span class="badge ${cfg.enabled ? 'badge-success' : ''}">${cfg.enabled ? 'ON' : 'OFF'}</span>
      </div>
      <div class="flex gap-sm">
        <button class="btn btn-sm btn-primary" onclick="action('${action}')">▶ Tester</button>
      </div>
    </div>
  `;
}

function renderPosts() {
  const sec = document.getElementById('section-posts');
  const g = state.guild || {};
  const options = [];
  (g.structure || []).forEach(cat => {
    (cat.channels || []).forEach(ch => {
      if (ch.type !== 'voice') options.push(`<option value="${ch.id}">#${escapeHtml(ch.name)}</option>`);
    });
  });

  sec.innerHTML = `
    <div class="card" style="max-width: 640px;">
      <div class="card-header">
        <div>
          <div class="card-title">Poster un message manuel</div>
          <div class="card-subtitle">Envoyer un message (texte ou embed) dans un salon</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Salon cible</label>
        <select class="form-select" id="post-channel">${options.join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Format</label>
        <select class="form-select" id="post-format">
          <option value="text">Texte simple</option>
          <option value="embed">Embed</option>
        </select>
      </div>
      <div class="form-group" id="embed-title-group" style="display:none">
        <label class="form-label">Titre (embed)</label>
        <input class="form-input" id="post-title" placeholder="Titre de l'embed">
      </div>
      <div class="form-group">
        <label class="form-label">Contenu</label>
        <textarea class="form-textarea" id="post-content" placeholder="Ton message..."></textarea>
      </div>
      <button class="btn btn-primary" onclick="sendPost()">📤 Envoyer</button>
    </div>
  `;

  document.getElementById('post-format').addEventListener('change', (e) => {
    document.getElementById('embed-title-group').style.display = e.target.value === 'embed' ? '' : 'none';
  });
}

function renderLogs() {
  const sec = document.getElementById('section-logs');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Logs en temps réel</div>
          <div class="card-subtitle">${state.logs.length} événements</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="state.logs = []; renderLogs()">🗑 Vider</button>
      </div>
      <div class="log-stream">
        ${renderLogEntries([...state.logs].reverse())}
      </div>
    </div>
  `;
}

function renderBackups() {
  const sec = document.getElementById('section-backups');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Backups de la configuration</div>
          <div class="card-subtitle">Snapshots du serveur</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="createBackup()">+ Nouveau backup</button>
      </div>
      <div id="backups-list" class="empty-state">Chargement...</div>
    </div>
  `;
  loadBackups();
}

async function loadBackups() {
  try {
    const res = await api('/api/backups');
    const list = document.getElementById('backups-list');
    const files = res.files || [];
    if (!files.length) { list.innerHTML = '<div class="empty-state">Aucun backup</div>'; return; }
    list.innerHTML = `
      <table class="table">
        <thead><tr><th>Fichier</th><th>Taille</th><th>Date</th></tr></thead>
        <tbody>
          ${files.map(f => `
            <tr>
              <td style="font-family:monospace">${escapeHtml(f.name || f)}</td>
              <td class="text-muted text-sm">${f.size ? (f.size / 1024).toFixed(1) + ' KB' : '—'}</td>
              <td class="text-muted text-sm">${f.mtime ? new Date(f.mtime).toLocaleString('fr-FR') : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {}
}

function renderSettings() {
  const sec = document.getElementById('section-settings');
  const cfg = state.config || {};
  const w = cfg.welcome || {};

  sec.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Synchronisation</div>
            <div class="card-subtitle">Discord ↔ Fichier</div>
          </div>
        </div>
        <div class="flex gap-sm">
          <button class="btn" onclick="action('sync/discord-to-file')">⬇ Discord → Fichier</button>
          <button class="btn" onclick="action('sync/file-to-discord')">⬆ Fichier → Discord</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Auto-rôle</div>
            <div class="card-subtitle">Rôle attribué à l'arrivée</div>
          </div>
        </div>
        <div class="form-row">
          <input class="form-input" id="autorole-input" value="${escapeHtml(state.autoRole || '')}" placeholder="Nom du rôle">
          <button class="btn btn-primary" onclick="saveAutoRole()">Sauver</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Welcome message</div>
            <div class="card-subtitle">${w.enabled ? 'Actif' : 'Inactif'}</div>
          </div>
          <span class="badge ${w.enabled ? 'badge-success' : ''}">${w.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <button class="btn btn-sm" onclick="action('welcome/test')">▶ Tester welcome</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">À propos</div>
            <div class="card-subtitle">BrainEXE Dashboard v2.1.0</div>
          </div>
        </div>
        <div class="text-sm text-muted flex flex-col gap-sm">
          <div>✨ Sidebar Discord temps réel</div>
          <div>🎨 3 thèmes (light / dark / sombre)</div>
          <div>🤖 Brainee AI personality engine</div>
        </div>
      </div>
    </div>
  `;
}

// ---- ACTIONS ----
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
  if (!confirm(`Supprimer le rôle ${name} ?`)) return;
  try {
    await api(`/api/roles/${id}`, { method: 'DELETE' });
    toast('Rôle supprimé', 'success');
  } catch {}
}

async function saveAutoRole() {
  const roleName = document.getElementById('autorole-input').value;
  try {
    await api('/api/autorole', { method: 'POST', body: { roleName } });
    state.autoRole = roleName;
    toast('Auto-rôle enregistré', 'success');
  } catch {}
}

async function sendPost() {
  const channelId = document.getElementById('post-channel').value;
  const content = document.getElementById('post-content').value;
  const format = document.getElementById('post-format').value;
  const asEmbed = format === 'embed';
  const embedTitle = asEmbed ? document.getElementById('post-title').value : '';
  if (!content.trim()) return toast('Contenu vide', 'error');
  try {
    await api('/api/post', { method: 'POST', body: { channelId, content, asEmbed, embedTitle } });
    toast('Message envoyé', 'success');
    document.getElementById('post-content').value = '';
  } catch {}
}

async function createBackup() {
  try {
    await api('/api/backup', { method: 'POST' });
    toast('Backup créé', 'success');
    loadBackups();
  } catch {}
}

function openCreateCategory() {
  openModal('Nouvelle catégorie', `
    <div class="form-group">
      <label class="form-label">Nom</label>
      <input class="form-input" id="modal-name" placeholder="📁 ・ MA CATÉGORIE">
    </div>
  `, async () => {
    const name = document.getElementById('modal-name').value;
    if (!name) return toast('Nom requis', 'error');
    await api('/api/categories', { method: 'POST', body: { name } });
    toast('Catégorie créée', 'success');
  });
}

function openCreateChannel(categoryName = '') {
  const cats = (state.guild?.structure || []).map(c => `<option ${c.category === categoryName ? 'selected' : ''}>${escapeHtml(c.category)}</option>`).join('');
  openModal('Nouveau salon', `
    <div class="form-group">
      <label class="form-label">Nom</label>
      <input class="form-input" id="modal-name" placeholder="mon-salon">
    </div>
    <div class="form-group">
      <label class="form-label">Catégorie</label>
      <select class="form-select" id="modal-cat">${cats}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Type</label>
      <select class="form-select" id="modal-type">
        <option value="text">Texte</option>
        <option value="voice">Vocal</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Topic (optionnel)</label>
      <input class="form-input" id="modal-topic" placeholder="Description du salon">
    </div>
  `, async () => {
    const name = document.getElementById('modal-name').value;
    const categoryName = document.getElementById('modal-cat').value;
    const type = document.getElementById('modal-type').value;
    const topic = document.getElementById('modal-topic').value;
    if (!name) return toast('Nom requis', 'error');
    await api('/api/channels', { method: 'POST', body: { name, type, categoryName, topic } });
    toast('Salon créé', 'success');
  });
}

function openCreateRole() {
  openModal('Nouveau rôle', `
    <div class="form-group">
      <label class="form-label">Nom</label>
      <input class="form-input" id="modal-name" placeholder="Mon rôle">
    </div>
    <div class="form-group">
      <label class="form-label">Couleur</label>
      <input class="form-input" type="color" id="modal-color" value="#7c5cbf">
    </div>
    <div class="form-group">
      <label class="form-label">
        <input type="checkbox" id="modal-hoist"> Afficher séparément
      </label>
    </div>
  `, async () => {
    const name = document.getElementById('modal-name').value;
    const color = document.getElementById('modal-color').value;
    const hoist = document.getElementById('modal-hoist').checked;
    if (!name) return toast('Nom requis', 'error');
    await api('/api/roles', { method: 'POST', body: { name, color, hoist } });
    toast('Rôle créé', 'success');
  });
}

// ---- MODAL ----
function openModal(title, body, onConfirm) {
  const backdrop = document.getElementById('modal-backdrop');
  backdrop.innerHTML = `
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
  backdrop.classList.add('active');
  document.getElementById('modal-confirm').onclick = async () => {
    try { await onConfirm(); closeModal(); } catch {}
  };
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('active');
}

// ---- UTILS ----
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---- BOOT ----
async function boot() {
  theme.init();
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.addEventListener('click', () => theme.apply(b.dataset.theme));
  });
  document.querySelectorAll('.nav-item').forEach(b => {
    b.addEventListener('click', () => navigate(b.dataset.section));
  });

  connectWS();

  try {
    const [stateRes, cfgRes, logsRes, slotRes, autoRes] = await Promise.all([
      fetch('/api/state').then(r => r.json()),
      fetch('/api/config').then(r => r.json()),
      fetch('/api/logs').then(r => r.json()),
      fetch('/api/slot').then(r => r.json()),
      fetch('/api/autorole').then(r => r.json()),
    ]);
    if (stateRes.ok) { state.guild = stateRes.state; state.stats = stateRes.stats; }
    if (cfgRes.ok) state.config = cfgRes.config;
    if (logsRes.ok) state.logs = logsRes.logs || [];
    if (slotRes.ok) state.slot = slotRes;
    if (autoRes.ok) state.autoRole = autoRes.roleName;
  } catch (err) {
    console.error(err);
  }

  renderCurrentSection();
}

document.addEventListener('DOMContentLoaded', boot);
