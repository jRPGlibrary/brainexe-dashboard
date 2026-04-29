/* Backup & Restore - Sauvegarde et restauration */

const backupRestore = {
  backupHistory: [],

  // Créer une sauvegarde complète
  createBackup() {
    const backup = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      name: `Backup ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`,
      data: {
        config: state.botConfig || {},
        admin: state.admin || {},
        logs: state.logs || [],
        stats: state.stats || {}
      },
      version: '2.4'
    };

    this.backupHistory.unshift(backup);

    // Garder que 10 derniers backups
    if (this.backupHistory.length > 10) {
      this.backupHistory.pop();
    }

    localStorage.setItem('backup_history', JSON.stringify(this.backupHistory));
    toast(`✅ Sauvegarde créée: ${backup.name}`, 'success');

    return backup;
  },

  // Exporter une sauvegarde en JSON
  downloadBackup(backupId = null) {
    const backup = backupId
      ? this.backupHistory.find(b => b.id === backupId)
      : this.backupHistory[0];

    if (!backup) {
      toast('Aucune sauvegarde trouvée', 'error');
      return;
    }

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainexe-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast('Sauvegarde téléchargée!', 'success');
  },

  // Importer une sauvegarde depuis un fichier
  async uploadBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);

          // Validation
          if (!backup.data || !backup.timestamp) {
            throw new Error('Format de sauvegarde invalide');
          }

          // Afficher un modal de confirmation
          const confirmed = confirm(
            `Restaurer la sauvegarde du ${new Date(backup.timestamp).toLocaleDateString('fr-FR')}?\n\n⚠️ Cela écrasera la configuration actuelle!`
          );

          if (confirmed) {
            this.restoreBackup(backup);
            resolve(true);
          } else {
            reject('Restauration annulée par l\'utilisateur');
          }
        } catch (err) {
          reject(`Erreur: ${err.message}`);
        }
      };

      reader.onerror = () => reject('Erreur lecture fichier');
      reader.readAsText(file);
    });
  },

  // Restaurer depuis une sauvegarde
  async restoreBackup(backup) {
    try {
      // Restaurer la config
      if (backup.data.config) {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'all',
            data: backup.data.config
          })
        });
      }

      // Sauvegarder dans l'historique
      this.backupHistory.unshift({
        ...backup,
        id: Date.now(),
        name: `Restauration ${new Date().toLocaleDateString('fr-FR')}`
      });

      localStorage.setItem('backup_history', JSON.stringify(this.backupHistory));

      toast('✅ Sauvegarde restaurée avec succès!', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      toast(`Erreur restauration: ${err.message}`, 'error');
    }
  },

  // Afficher l'historique des sauvegardes
  renderBackupHistory() {
    return `
      <div class="backup-history">
        <h3>Historique des sauvegardes</h3>
        <div class="backup-list">
          ${this.backupHistory.length === 0
            ? '<p>Aucune sauvegarde</p>'
            : this.backupHistory.map(b => `
                <div class="backup-item">
                  <div class="backup-info">
                    <div class="backup-name">${b.name}</div>
                    <div class="backup-date">${new Date(b.timestamp).toLocaleDateString('fr-FR')} à ${new Date(b.timestamp).toLocaleTimeString('fr-FR')}</div>
                  </div>
                  <div class="backup-actions">
                    <button class="btn btn-sm" onclick="backupRestore.downloadBackup(${b.id})">📥 Télécharger</button>
                    <button class="btn btn-sm" onclick="backupRestore.restoreBackup(${JSON.stringify(b).replace(/"/g, '&quot;')})">♻️ Restaurer</button>
                  </div>
                </div>
              `).join('')
          }
        </div>
        <button class="btn btn-primary" onclick="backupRestore.uploadFromFile()">
          📤 Importer sauvegarde
        </button>
      </div>
    `;
  },

  uploadFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      this.uploadBackup(e.target.files[0])
        .catch(err => toast(err, 'error'));
    };

    input.click();
  },

  // Charger l'historique au démarrage
  loadBackupHistory() {
    const saved = localStorage.getItem('backup_history');
    this.backupHistory = saved ? JSON.parse(saved) : [];
  },

  // Auto-backup quotidien (à intégrer avec cron)
  scheduleAutoBackup() {
    setInterval(() => {
      this.createBackup();
      console.log('✅ Auto-backup quotidien créé');
    }, 24 * 60 * 60 * 1000); // 24h
  }
};

// Charger au démarrage
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => backupRestore.loadBackupHistory());
} else {
  backupRestore.loadBackupHistory();
}
