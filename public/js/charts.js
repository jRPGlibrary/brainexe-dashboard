/* Graphiques d'activité (ASCII charts) */

const charts = {
  renderActivityChart() {
    if (!state.logs) return '';

    const hours = new Array(24).fill(0);
    state.logs.forEach(log => {
      const ts = log.ts ? new Date(log.ts) : new Date();
      const hour = ts.getHours();
      hours[hour]++;
    });

    const max = Math.max(...hours);
    const scaled = hours.map(h => Math.ceil((h / max) * 8));

    return `
      <div class="chart-container">
        <div class="chart-title">Activité par heure (dernières 24h)</div>
        <div class="mini-chart">
          ${scaled.map((h, i) => `
            <div class="chart-bar" style="height: ${h * 12}px" title="${hours[i]} events at ${i}h"></div>
          `).join('')}
        </div>
        <div class="chart-scale">00:00 → 23:00</div>
      </div>
    `;
  },

  renderTopMembers() {
    return `
      <div class="chart-container">
        <div class="chart-title">Top 5 membres actifs</div>
        <div class="top-list">
          <div class="top-item">
            <span class="top-rank">1</span>
            <span class="top-name">Alice</span>
            <span class="top-count">147</span>
          </div>
          <div class="top-item">
            <span class="top-rank">2</span>
            <span class="top-name">Bob</span>
            <span class="top-count">92</span>
          </div>
          <div class="top-item">
            <span class="top-rank">3</span>
            <span class="top-name">Charlie</span>
            <span class="top-count">56</span>
          </div>
        </div>
      </div>
    `;
  }
};
