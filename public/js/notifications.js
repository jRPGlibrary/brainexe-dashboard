/* Système de badges pour notifications temps réel */

const badgeSystem = {
  badges: {},

  init() {
    document.addEventListener('logUpdate', () => this.updateBadges());
  },

  setBadge(section, count) {
    this.badges[section] = count;
    const item = document.querySelector(`[data-section="${section}"]`);
    if (!item) return;

    let badge = item.querySelector('.nav-badge');
    if (!badge && count > 0) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      item.appendChild(badge);
    }
    if (badge) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  },

  updateBadges() {
    if (!state.logs) return;
    const errors = state.logs.filter(l => (l.dir || l.type) === 'ERR').length;
    const criticals = state.logs.filter(l => l.msg?.includes('CRITICAL')).length;

    this.setBadge('logs', errors);
    if (criticals > 0) {
      this.flashBadge('logs');
    }
  },

  flashBadge(section) {
    const item = document.querySelector(`[data-section="${section}"]`);
    if (item) {
      item.style.animation = 'badgeFlash 0.6s';
      setTimeout(() => item.style.animation = '', 600);
    }
  },

  clearBadge(section) {
    this.setBadge(section, 0);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => badgeSystem.init());
} else {
  badgeSystem.init();
}
