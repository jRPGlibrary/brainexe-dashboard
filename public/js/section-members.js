/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-members.js
   Liste des membres avec tri, recherche et affinité
   ═══════════════════════════════════════════════════ */

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
