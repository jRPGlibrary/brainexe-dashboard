/* Pagination des Logs - Chargement progressif */

const logsPagination = {
  pageSize: 50,
  currentPage: 0,
  totalLogs: 0,
  filters: {
    search: '',
    type: '',
    dateRange: 'all'
  },

  getFilteredLogs() {
    if (!state.logs) return [];

    let filtered = [...state.logs];

    // Filtre par texte
    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      filtered = filtered.filter(l => String(l.msg || '').toLowerCase().includes(q));
    }

    // Filtre par type
    if (this.filters.type) {
      filtered = filtered.filter(l => (l.dir || l.type) === this.filters.type);
    }

    // Filtre par plage de temps
    if (this.filters.dateRange !== 'all') {
      const now = Date.now();
      const ranges = {
        'hour': 3600000,
        'day': 86400000,
        'week': 604800000
      };
      const range = ranges[this.filters.dateRange];
      filtered = filtered.filter(l => {
        const ts = l.ts ? new Date(l.ts).getTime() : now;
        return (now - ts) < range;
      });
    }

    this.totalLogs = filtered.length;
    return filtered;
  },

  getPagedLogs(pageNum = 0) {
    const filtered = this.getFilteredLogs();
    const start = pageNum * this.pageSize;
    const end = start + this.pageSize;
    return filtered.slice(start, end).reverse();
  },

  hasNextPage() {
    return (this.currentPage + 1) * this.pageSize < this.totalLogs;
  },

  nextPage() {
    if (this.hasNextPage()) {
      this.currentPage++;
      this.renderPage();
    }
  },

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.renderPage();
    }
  },

  goToPage(pageNum) {
    const maxPage = Math.ceil(this.totalLogs / this.pageSize) - 1;
    this.currentPage = Math.max(0, Math.min(pageNum, maxPage));
    this.renderPage();
  },

  resetFilters() {
    this.filters = { search: '', type: '', dateRange: 'all' };
    this.currentPage = 0;
    this.renderPage();
  },

  renderPage() {
    const logs = this.getPagedLogs(this.currentPage);
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalLogs);

    let html = `
      <div class="logs-pagination-info">
        Affichage ${start}-${end} sur ${this.totalLogs} logs
      </div>
      <div class="log-stream">
        ${logs.length === 0 ? '<div class="empty">Aucun log</div>' : ''}
        ${logs.map(l => {
          const t = l.ts ? new Date(l.ts).toLocaleTimeString('fr-FR') : '--:--:--';
          const dirClass = l.dir || l.type || '';
          const emoji = { 'SYS': '⚙️', 'ERR': '❌', 'D2F': '↓', 'F2D': '↑', 'API': '🔗', 'JOIN': '➕' }[dirClass] || '•';
          return `
            <div class="log-entry">
              <span class="log-time">${t}</span>
              <span class="log-type ${dirClass}"><span style="margin-right:2px">${emoji}</span>${dirClass}</span>
              <span class="log-msg">${escapeHtml(l.msg || '')}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="logs-pagination-controls">
        <button class="btn btn-sm" onclick="logsPagination.previousPage()" ${this.currentPage === 0 ? 'disabled' : ''}>← Précédent</button>
        <span class="logs-page-number">Page ${this.currentPage + 1}/${Math.ceil(this.totalLogs / this.pageSize)}</span>
        <button class="btn btn-sm" onclick="logsPagination.nextPage()" ${!this.hasNextPage() ? 'disabled' : ''}>Suivant →</button>
      </div>
    `;

    const el = document.getElementById('logs-stream');
    if (el) el.innerHTML = html;
  },

  renderFilters() {
    return `
      <div class="logs-filters">
        <input
          class="input search"
          placeholder="Rechercher..."
          value="${this.filters.search}"
          oninput="logsPagination.filters.search = this.value; logsPagination.currentPage = 0; logsPagination.renderPage()"
        />
        <select class="select" onchange="logsPagination.filters.type = this.value; logsPagination.currentPage = 0; logsPagination.renderPage()">
          <option value="">Tous les types</option>
          <option value="SYS">SYS</option>
          <option value="ERR">ERR</option>
          <option value="D2F">D2F</option>
          <option value="F2D">F2D</option>
        </select>
        <select class="select" onchange="logsPagination.filters.dateRange = this.value; logsPagination.currentPage = 0; logsPagination.renderPage()">
          <option value="all">Tous les temps</option>
          <option value="hour">Dernière heure</option>
          <option value="day">Dernier jour</option>
          <option value="week">Dernière semaine</option>
        </select>
        <button class="btn btn-sm" onclick="logsPagination.resetFilters()">🔄 Réinitialiser</button>
      </div>
    `;
  }
};
