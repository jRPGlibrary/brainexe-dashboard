/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-overview.js
   Vue d'ensemble : stats, sidebar Discord, logs récents
   ═══════════════════════════════════════════════════ */

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

  const typeEmojis = {
    'SYS': '⚙️',
    'ERR': '❌',
    'D2F': '↓',
    'F2D': '↑',
    'API': '🔗',
    'JOIN': '➕'
  };

  return filtered.map(l => {
    const t = l.ts ? new Date(l.ts).toLocaleTimeString('fr-FR') : (l.time ? l.time.slice(11, 19) : '--:--:--');
    const dirClass = l.dir || l.type || '';
    const emoji = typeEmojis[dirClass] || '•';
    return `<div class="log-entry">
      <span class="log-time">${t}</span>
      <span class="log-type ${dirClass}"><span style="margin-right:2px">${emoji}</span>${dirClass || '—'}</span>
      <span class="log-msg">${escapeHtml(l.msg || '')}</span>
    </div>`;
  }).join('');
}
