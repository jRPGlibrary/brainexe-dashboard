/* Graphiques d'activité — lit les données réelles depuis state */

const charts = {
  renderActivityChart() {
    if (!state.logs || !state.logs.length) return '';

    const hours = new Array(24).fill(0);
    state.logs.forEach(log => {
      const ts = log.ts ? new Date(log.ts) : null;
      if (ts) hours[ts.getHours()]++;
    });

    const max = Math.max(...hours, 1);
    const scaled = hours.map(h => Math.ceil((h / max) * 8));

    return `
      <div class="chart-container">
        <div class="chart-title">Activité par heure (dernières 24h)</div>
        <div class="mini-chart">
          ${scaled.map((h, i) => `
            <div class="chart-bar" style="height:${h * 12}px" title="${hours[i]} messages à ${String(i).padStart(2,'0')}h"></div>
          `).join('')}
        </div>
        <div class="chart-scale">00:00 → 23:00</div>
      </div>
    `;
  },

  renderTopMembers() {
    // Les vrais membres sont chargés dans section-members.js via /api/members
    // Ce widget lite affiche un résumé depuis state si disponible
    const members = state.admin?.topMembers || [];
    if (!members.length) return '';

    return `
      <div class="chart-container">
        <div class="chart-title">Top membres actifs</div>
        <div class="top-list">
          ${members.slice(0, 5).map((m, i) => `
            <div class="top-item">
              <span class="top-rank">${i + 1}</span>
              <span class="top-name">${typeof escapeHtml === 'function' ? escapeHtml(m.name) : m.name}</span>
              <span class="top-count">${m.count}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};
