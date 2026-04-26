/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-automations.js
   Features activables et tests manuels
   ═══════════════════════════════════════════════════ */

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
