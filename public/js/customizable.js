/* Dashboard customisable - drag & drop des cards */

const customDashboard = {
  storageKey: 'brainexe_dashboard_layout',

  getLayout() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : {
      overview: true,
      health: true,
      recentLogs: true
    };
  },

  saveLayout(layout) {
    localStorage.setItem(this.storageKey, JSON.stringify(layout));
  },

  makeCardDraggable(card) {
    let isDragging = false;

    card.addEventListener('dragstart', (e) => {
      isDragging = true;
      e.dataTransfer.effectAllowed = 'move';
      card.style.opacity = '0.5';
    });

    card.addEventListener('dragend', () => {
      isDragging = false;
      card.style.opacity = '1';
    });

    card.addEventListener('dragover', (e) => {
      if (!isDragging) {
        e.preventDefault();
        card.style.borderTop = '2px solid var(--accent)';
      }
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.style.borderTop = 'none';
    });
  },

  toggleCardVisibility(cardId) {
    const layout = this.getLayout();
    layout[cardId] = !layout[cardId];
    this.saveLayout(layout);
    location.reload();
  }
};
