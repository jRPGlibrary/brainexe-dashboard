/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-backups.js
   Gestion des snapshots de configuration
   ═══════════════════════════════════════════════════ */

function renderBackups() {
  const sec = document.getElementById('section-backups');
  sec.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">💾 Backups serveur</div>
            <div class="card-subtitle">Snapshots de la configuration</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="createBackup()">+ Nouveau</button>
        </div>
        <div id="backups-list" class="empty">Chargement…</div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">💾 Backups locaux</div>
            <div class="card-subtitle">Historique client-side</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="backupRestore.createBackup()">+ Créer</button>
        </div>
        <div id="local-backups"></div>
      </div>
    </div>
  `;
  loadBackups();
  loadLocalBackups();
}

function loadLocalBackups() {
  const container = document.getElementById('local-backups');
  if (!container) return;

  backupRestore.loadBackupHistory();
  const backups = backupRestore.backupHistory || [];

  if (backups.length === 0) {
    container.innerHTML = '<div class="empty">Aucun backup local</div>';
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
  backups.slice(0, 10).forEach((backup, idx) => {
    const date = new Date(backup.timestamp).toLocaleString('fr-FR');
    html += `
      <div style="padding: 8px; background: var(--bg-2); border-radius: 6px; font-size: 12px;">
        <div style="font-weight: 500; margin-bottom: 4px;">${escapeHtml(backup.name)}</div>
        <div style="color: var(--text-3); font-size: 11px; margin-bottom: 6px;">${date}</div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm" style="flex: 1; padding: 4px 8px;" onclick="backupRestore.downloadBackup(${backup.id})">📥</button>
          <button class="btn btn-sm" style="flex: 1; padding: 4px 8px;" onclick="restoreLocalBackup(${backup.id})">↩️</button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  if (backups.length > 10) {
    html += `<div style="margin-top: 8px; font-size: 11px; color: var(--text-3);">+ ${backups.length - 10} autres backups</div>`;
  }

  container.innerHTML = html;
}

function restoreLocalBackup(id) {
  backupRestore.loadBackupHistory();
  const backup = backupRestore.backupHistory.find(b => b.id === id);
  if (!backup) {
    toast('Backup non trouvé', 'error');
    return;
  }

  confirmAction('Restaurer backup', `Restaurer la sauvegarde du ${new Date(backup.timestamp).toLocaleDateString('fr-FR')}?\n\n⚠️ Cela écrasera la configuration actuelle!`, async () => {
    await backupRestore.restoreBackup(backup);
  }, { danger: true });
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
