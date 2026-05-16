/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-moderation.js
   Logs de modération : actions spam + événements membres
   ═══════════════════════════════════════════════════ */

let _modTab = 'spam'; // 'spam' | 'members'

function renderModeration() {
  const sec = document.getElementById('section-moderation');
  if (!sec) return;
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">🛡️ Modération</div>
          <div class="card-subtitle">Actions automatiques et événements membres</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="_loadModSection()">🔄 Actualiser</button>
      </div>
      <div class="filter-bar" style="gap:8px">
        <button class="btn btn-sm ${_modTab==='spam'?'btn-primary':'btn-ghost'}" onclick="_modTab='spam';_renderModTabs()">⚠️ Actions spam</button>
        <button class="btn btn-sm ${_modTab==='members'?'btn-primary':'btn-ghost'}" onclick="_modTab='members';_renderModTabs()">👥 Membres</button>
      </div>
      <div id="mod-spam-tab" ${_modTab!=='spam'?'style="display:none"':''}>
        <div id="mod-spam-list" class="empty">Chargement…</div>
      </div>
      <div id="mod-members-tab" ${_modTab!=='members'?'style="display:none"':''}>
        <div id="mod-members-list" class="empty">Chargement…</div>
      </div>
    </div>
  `;
  _loadModSection();
}

function _renderModTabs() {
  const spamTab = document.getElementById('mod-spam-tab');
  const membersTab = document.getElementById('mod-members-tab');
  const btns = document.querySelectorAll('#section-moderation .filter-bar .btn');
  if (!spamTab || !membersTab) return;
  spamTab.style.display = _modTab === 'spam' ? '' : 'none';
  membersTab.style.display = _modTab === 'members' ? '' : 'none';
  btns.forEach((b, i) => {
    b.className = `btn btn-sm ${(i===0&&_modTab==='spam')||(i===1&&_modTab==='members') ? 'btn-primary' : 'btn-ghost'}`;
  });
}

async function _loadModSection() {
  await Promise.all([_loadModSpam(), _loadModMembers()]);
}

async function _loadModSpam() {
  const el = document.getElementById('mod-spam-list');
  if (!el) return;
  try {
    const res = await api('/api/mod/logs');
    const logs = res.logs || [];
    if (!logs.length) { el.innerHTML = '<div class="empty">Aucune action enregistrée</div>'; return; }
    const typeLabel = {
      flood: 'Flood', duplicate: 'Doublon', mention_spam: 'Mention spam', link_spam: 'Spam de liens',
    };
    el.innerHTML = `
      <table class="table">
        <thead><tr><th>Date</th><th>Membre</th><th>Type</th><th>Action</th><th>Offense</th></tr></thead>
        <tbody>
          ${logs.map(l => {
            const d = new Date(l.timestamp).toLocaleString('fr-FR');
            const isKick = l.action === 'kick';
            const badge = isKick
              ? '<span class="badge" style="background:#e74c3c22;color:#e74c3c">👢 Kick</span>'
              : `<span class="badge" style="background:#f39c1222;color:#f39c12">⏱️ Timeout ${l.timeoutMin || '?'} min</span>`;
            return `<tr>
              <td class="text-muted text-sm">${escapeHtml(d)}</td>
              <td>${escapeHtml(l.username || l.userId)}</td>
              <td class="text-sm">${escapeHtml(typeLabel[l.spamType] || l.spamType || '—')}</td>
              <td>${badge}</td>
              <td class="text-center text-sm">#${l.offenseCount || 1}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch { el.innerHTML = '<div class="empty text-muted">Erreur de chargement</div>'; }
}

async function _loadModMembers() {
  const el = document.getElementById('mod-members-list');
  if (!el) return;
  try {
    const res = await api('/api/mod/members');
    const events = res.events || [];
    if (!events.length) { el.innerHTML = '<div class="empty">Aucun événement enregistré</div>'; return; }
    const icons = { join: '📥', leave: '📤', ban: '🔨', kick: '👢' };
    const colors = { join: '#27ae60', leave: '#99aab5', ban: '#e74c3c', kick: '#e67e22' };
    el.innerHTML = `
      <table class="table">
        <thead><tr><th>Date</th><th>Événement</th><th>Membre</th><th>Détail</th></tr></thead>
        <tbody>
          ${events.map(e => {
            const d = new Date(e.timestamp).toLocaleString('fr-FR');
            const icon = icons[e.eventType] || '•';
            const color = colors[e.eventType] || 'inherit';
            const detail = e.reason ? escapeHtml(e.reason) : (e.accountAgeDays != null ? `Compte : ${e.accountAgeDays}j` : '—');
            return `<tr>
              <td class="text-muted text-sm">${escapeHtml(d)}</td>
              <td><span style="color:${color}">${icon} ${escapeHtml(e.eventType)}</span></td>
              <td>${escapeHtml(e.tag || e.userId)}</td>
              <td class="text-sm text-muted">${detail}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch { el.innerHTML = '<div class="empty text-muted">Erreur de chargement</div>'; }
}
