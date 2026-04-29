/* Filtres avancés pour les logs */

const logFilters = {
  filters: {
    dateRange: 'all', // all, hour, day, week
    severity: 'all',  // all, errors, warnings, info
    search: ''
  },

  dateRanges: {
    all: () => true,
    hour: (ts) => Date.now() - ts < 3600000,
    day: (ts) => Date.now() - ts < 86400000,
    week: (ts) => Date.now() - ts < 604800000
  },

  severityLevels: {
    all: () => true,
    errors: (log) => (log.dir || log.type) === 'ERR',
    warnings: (log) => (log.dir || log.type) === 'F2D',
    info: (log) => (log.dir || log.type) === 'SYS'
  },

  apply(logs) {
    return logs.filter(log => {
      const ts = log.ts ? new Date(log.ts).getTime() : Date.now();
      const matchDate = this.dateRanges[this.filters.dateRange](ts);
      const matchSeverity = this.severityLevels[this.filters.severity](log);
      const matchSearch = !this.filters.search ||
        String(log.msg || '').toLowerCase().includes(this.filters.search.toLowerCase());

      return matchDate && matchSeverity && matchSearch;
    });
  },

  renderUI() {
    return `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
        <select onchange="logFilters.filters.dateRange = this.value; renderLogsStream()" class="select" style="flex: 0 0 auto;">
          <option value="all">Tous les temps</option>
          <option value="hour">Dernière heure</option>
          <option value="day">Dernier jour</option>
          <option value="week">Dernière semaine</option>
        </select>
        <select onchange="logFilters.filters.severity = this.value; renderLogsStream()" class="select" style="flex: 0 0 auto;">
          <option value="all">Tous les niveaux</option>
          <option value="errors">Erreurs uniquement</option>
          <option value="warnings">Avertissements</option>
          <option value="info">Info</option>
        </select>
      </div>
    `;
  }
};
