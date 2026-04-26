/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-discord.js
   Salons et rôles Discord : affichage et suppression
   ═══════════════════════════════════════════════════ */

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
