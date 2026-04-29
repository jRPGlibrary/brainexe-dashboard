/* Moteur de recherche global (Cmd+K) */

const globalSearch = {
  isOpen: false,
  results: [],
  selectedIndex: 0,

  init() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      if (this.isOpen) {
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowDown') this.selectNext();
        if (e.key === 'ArrowUp') this.selectPrev();
        if (e.key === 'Enter') this.selectCurrent();
      }
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.render();
    document.getElementById('search-input')?.focus();
  },

  close() {
    this.isOpen = false;
    const modal = document.getElementById('search-modal');
    if (modal) modal.style.display = 'none';
  },

  search(query) {
    if (!query.trim()) {
      this.results = [];
      this.render();
      return;
    }

    const q = query.toLowerCase();
    this.results = [];

    // Logs
    if (state.logs) {
      state.logs.filter(l => String(l.msg || '').toLowerCase().includes(q))
        .slice(0, 5)
        .forEach(l => this.results.push({
          type: 'log',
          title: `${l.dir || l.type} - ${(l.msg || '').slice(0, 40)}`,
          action: () => navigate('logs')
        }));
    }

    // Sections
    const sections = ['overview', 'admin', 'health', 'logs', 'channels', 'members', 'emotions', 'bonds'];
    sections.filter(s => s.toLowerCase().includes(q))
      .forEach(s => this.results.push({
        type: 'section',
        title: s.charAt(0).toUpperCase() + s.slice(1),
        action: () => navigate(s)
      }));

    this.selectedIndex = 0;
    this.render();
  },

  selectNext() {
    this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
    this.render();
  },

  selectPrev() {
    this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
    this.render();
  },

  selectCurrent() {
    if (this.results[this.selectedIndex]) {
      this.results[this.selectedIndex].action();
      this.close();
    }
  },

  render() {
    if (!this.isOpen) return;

    let modal = document.getElementById('search-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'search-modal';
      modal.className = 'search-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="search-content">
        <input type="text" id="search-input" class="search-input" placeholder="Recherche…"
          oninput="globalSearch.search(this.value)" />
        <div class="search-results">
          ${this.results.length === 0 ? '<div class="search-empty">Aucun résultat</div>' : ''}
          ${this.results.map((r, i) => `
            <div class="search-result ${i === this.selectedIndex ? 'selected' : ''}"
              onclick="globalSearch.results[${i}].action(); globalSearch.close();">
              <span class="search-type">${r.type}</span>
              <span class="search-title">${escapeHtml(r.title)}</span>
            </div>
          `).join('')}
        </div>
        <div class="search-hint">
          <span>↑↓ Naviguer</span>
          <span>Enter Sélectionner</span>
          <span>Esc Fermer</span>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => globalSearch.init());
} else {
  globalSearch.init();
}
