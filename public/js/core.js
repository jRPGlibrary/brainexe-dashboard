/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — core.js
   État global, thème, toast, API helper, utilitaires
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
