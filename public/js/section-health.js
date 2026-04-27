/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-health.js
   Santé système : Discord, MongoDB, Claude, mémoire
   ═══════════════════════════════════════════════════ */

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
