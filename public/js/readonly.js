/* Mode lecture seule pour observateurs */

const readOnlyMode = {
  enabled: false,

  init() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('readonly') === '1') {
      this.enable();
    }
  },

  enable() {
    this.enabled = true;
    document.documentElement.setAttribute('data-readonly', 'true');

    // Masquer tous les boutons d'action
    document.querySelectorAll('.btn-primary, .btn-danger, [onclick*="action"], [onclick*="post"]')
      .forEach(btn => {
        if (!btn.textContent.includes('Télécharger')) {
          btn.style.display = 'none';
        }
      });

    // Afficher banneau info
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      padding: 8px 12px;
      background: var(--info);
      color: white;
      font-size: 11px;
      z-index: 300;
      border-radius: 0 0 0 6px;
    `;
    banner.textContent = '📖 Mode lecture seule';
    document.body.appendChild(banner);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => readOnlyMode.init());
} else {
  readOnlyMode.init();
}
