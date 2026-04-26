/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-backups.js
   Gestion des snapshots de configuration
   ═══════════════════════════════════════════════════ */

function renderBackups() {
  const sec = document.getElementById('section-backups');
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">💾 Backups</div>
          <div class="card-subtitle">Snapshots de la configuration</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="createBackup()">+ Nouveau backup</button>
      </div>
      <div id="backups-list" class="empty">Chargement…</div>
    </div>
  `;
  loadBackups();
}

async function loadBackups() {
  try {
    const res = await api('/api/backups');
    const list = document.getElementById('backups-list');
    const files = res.backups || res.files || [];
    if (!files.length) { list.innerHTML = '<div class="empty">Aucun backup</div>'; return; }
    list.innerHTML = `
      <table class="table">
        <thead><tr><th>Fichier</th><th>Taille</th><th>Date</th><th></th></tr></thead>
        <tbody>
          ${files.map(f => `
            <tr>
              <td style="font-family:monospace;font-size:12px">${escapeHtml(f.name || f)}</td>
              <td class="text-muted text-sm">${f.size ? (f.size / 1024).toFixed(1) + ' KB' : '—'}</td>
              <td class="text-muted text-sm">${f.date || '—'}</td>
              <td class="text-right" style="white-space:nowrap">
                <a class="btn btn-sm btn-ghost" href="/api/backups/${encodeURIComponent(f.name)}/download" download title="Télécharger">⬇</a>
                <button class="btn btn-sm btn-ghost" onclick="restoreBackupConfig('${escapeHtml(f.name)}')" title="Restaurer config">↩</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteBackup('${escapeHtml(f.name)}')" title="Supprimer" style="color:var(--danger)">🗑</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch {}
}

async function deleteBackup(name) {
  confirmAction(`Supprimer ${name}`, `Ce fichier de backup sera supprimé définitivement.`, async () => {
    await api(`/api/backups/${encodeURIComponent(name)}`, { method: 'DELETE' });
    toast('Backup supprimé', 'success');
    loadBackups();
  }, { danger: true });
}

async function restoreBackupConfig(name) {
  confirmAction(`Restaurer config depuis ${name}`, `Les sections botConfig de ce backup seront appliquées. La structure Discord ne sera pas modifiée.`, async () => {
    const res = await api(`/api/backups/${encodeURIComponent(name)}/restore-config`, { method: 'POST' });
    toast(`Config restaurée — ${res.sections} sections appliquées`, 'success');
  });
}

async function createBackup() {
  try {
    await api('/api/backup', { method: 'POST' });
    toast('Backup créé', 'success');
    loadBackups();
  } catch {}
}
