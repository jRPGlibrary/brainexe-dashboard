/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-settings.js
   Synchronisation, auto-rôle, welcome, infos version
   ═══════════════════════════════════════════════════ */

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
            <div class="card-title">ℹ️ BrainEXE v2.3.1</div>
            <div class="card-subtitle">Frontend découpé en modules</div>
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
