/* Système de hotkeys (raccourcis clavier) */

const hotkeys = {
  init() {
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'l':
            e.preventDefault();
            this.toggleTheme();
            break;
          case 'm':
            e.preventDefault();
            this.toggleMuteLogs();
            break;
          case '?':
            e.preventDefault();
            this.showHelp();
            break;
        }
      }
    });
  },

  toggleTheme() {
    const themes = ['light', 'dark', 'sombre'];
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    toast(`Thème: ${next}`, 'info');
  },

  toggleMuteLogs() {
    const isMuted = document.body.classList.toggle('logs-muted');
    toast(isMuted ? 'Logs muets' : 'Logs affichés', 'info');
  },

  showHelp() {
    const html = `
      <div class="hotkeys-help">
        <h3>⌨️ Raccourcis clavier</h3>
        <table>
          <tr><td>Cmd/Ctrl + K</td><td>Recherche globale</td></tr>
          <tr><td>Cmd/Ctrl + L</td><td>Changer thème</td></tr>
          <tr><td>Cmd/Ctrl + M</td><td>Mute/Unmute logs</td></tr>
          <tr><td>Cmd/Ctrl + ?</td><td>Afficher cette aide</td></tr>
        </table>
      </div>
    `;
    const modal = document.getElementById('modal-bg');
    modal.innerHTML = html;
    modal.classList.add('active');
    setTimeout(() => modal.classList.remove('active'), 5000);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => hotkeys.init());
} else {
  hotkeys.init();
}
