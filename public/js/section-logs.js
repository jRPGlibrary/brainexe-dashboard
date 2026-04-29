/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-logs.js
   Stream de logs en temps réel avec filtres
   ═══════════════════════════════════════════════════ */

const LOG_TYPES = ['SYS', 'ERR', 'D2F', 'F2D', 'API', 'JOIN'];
let _logFilter = '';
let _logTypeFilter = '';
let _autoScrollLogs = true;

function renderLogs() {
  const sec = document.getElementById('section-logs');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Logs en direct</div>
          <div class="card-subtitle" id="logs-count">${state.logs.length} événements</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm" id="autoscroll-toggle" onclick="toggleAutoScroll()" title="Auto-scroll vers les nouveaux logs">📍 Auto</button>
          <button class="btn btn-sm btn-ghost" onclick="state.logs = []; renderLogsStream()">🗑 Vider</button>
        </div>
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
  updateAutoScrollButton();
  scrollLogsToBottom();
}

function renderLogsStream() {
  const el = document.getElementById('logs-stream');
  if (el) el.innerHTML = renderLogEntries([...state.logs].reverse(), _logFilter, _logTypeFilter);
  const count = document.getElementById('logs-count');
  if (count) count.textContent = `${state.logs.length} événements`;
  if (_autoScrollLogs) {
    setTimeout(() => scrollLogsToBottom(), 0);
  }
}

function toggleAutoScroll() {
  _autoScrollLogs = !_autoScrollLogs;
  updateAutoScrollButton();
  if (_autoScrollLogs) scrollLogsToBottom();
}

function updateAutoScrollButton() {
  const btn = document.getElementById('autoscroll-toggle');
  if (btn) {
    btn.style.opacity = _autoScrollLogs ? '1' : '0.5';
    btn.title = _autoScrollLogs ? 'Auto-scroll activé' : 'Auto-scroll désactivé';
  }
}

function scrollLogsToBottom() {
  const el = document.getElementById('logs-stream');
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}
