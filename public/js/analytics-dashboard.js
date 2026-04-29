/* Analytics Dashboard - Graphiques et statistiques */

const analyticsDashboard = {
  renderAnalyticsDashboard() {
    return `
      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-title">📊 Activité par heure (24h)</div>
          ${this.renderActivityHeatmap()}
        </div>

        <div class="analytics-card">
          <div class="analytics-title">👥 Top 10 membres actifs</div>
          ${this.renderTopMembers()}
        </div>

        <div class="analytics-card">
          <div class="analytics-title">😊 Émotions du bot</div>
          ${this.renderEmotionStats()}
        </div>

        <div class="analytics-card">
          <div class="analytics-title">🔥 Activité heatmap (7 jours)</div>
          ${this.renderWeekHeatmap()}
        </div>

        <div class="analytics-card">
          <div class="analytics-title">📈 Tendances (cette semaine)</div>
          ${this.renderWeekTrends()}
        </div>

        <div class="analytics-card">
          <div class="analytics-title">⏰ Peak hours</div>
          ${this.renderPeakHours()}
        </div>
      </div>
    `;
  },

  renderActivityHeatmap() {
    const hours = new Array(24).fill(0);
    const now = new Date();

    // Simuler les données (à connecter avec logs réels)
    hours.forEach((_, i) => {
      hours[i] = Math.random() * 100 | 0;
    });

    const max = Math.max(...hours);
    const bars = hours.map(h => {
      const height = (h / max) * 100;
      const color = h < 20 ? '#4a5568' : h < 50 ? '#48bb78' : h < 80 ? '#f6ad55' : '#f56565';
      return `<div class="heatmap-bar" style="height: ${height}%; background: ${color}" title="${h} events"></div>`;
    }).join('');

    return `
      <div class="heatmap-container">
        ${bars}
      </div>
      <div class="heatmap-labels">
        <span>00:00</span><span style="margin-left: auto">12:00</span><span style="margin-left: auto">23:00</span>
      </div>
    `;
  },

  renderTopMembers() {
    const members = [
      { name: 'Alice', count: 247, percentage: 28 },
      { name: 'Bob', count: 189, percentage: 21 },
      { name: 'Charlie', count: 156, percentage: 18 },
      { name: 'Diana', count: 134, percentage: 15 },
      { name: 'Eve', count: 89, percentage: 10 },
      { name: 'Frank', count: 67, percentage: 8 }
    ];

    return members.map(m => `
      <div class="analytics-row">
        <div class="analytics-label">${m.name}</div>
        <div class="analytics-bar" style="width: ${m.percentage}%"></div>
        <div class="analytics-value">${m.count}</div>
      </div>
    `).join('');
  },

  renderEmotionStats() {
    const emotions = [
      { emoji: '😊', label: 'Happy', count: 45, percent: 30 },
      { emoji: '😴', label: 'Sleepy', count: 30, percent: 20 },
      { emoji: '💭', label: 'Thoughtful', count: 35, percent: 23 },
      { emoji: '🔥', label: 'Energetic', count: 25, percent: 17 },
      { emoji: '😔', label: 'Sad', count: 15, percent: 10 }
    ];

    return emotions.map(e => `
      <div class="emotion-stat">
        <span class="emotion-emoji">${e.emoji}</span>
        <span class="emotion-label">${e.label}</span>
        <span class="emotion-percent">${e.percent}%</span>
      </div>
    `).join('');
  },

  renderWeekHeatmap() {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const hours = Array(24).fill(0);

    let html = '<div class="week-heatmap">';
    days.forEach((day, dayIdx) => {
      html += `<div class="heatmap-day"><div class="day-label">${day}</div>`;

      hours.forEach((_, hour) => {
        const intensity = Math.random() * 100 | 0;
        const color = intensity < 20 ? '#e2e8f0' : intensity < 50 ? '#90cdf4' : intensity < 80 ? '#4299e1' : '#2c5282';
        html += `<div class="heatmap-cell" style="background: ${color}" title="${hour}h"></div>`;
      });

      html += '</div>';
    });
    html += '</div>';

    return html;
  },

  renderWeekTrends() {
    return `
      <div class="trend-chart">
        <div class="trend-line">
          <span style="height: 40px; background: #667eea"></span>
          <span style="height: 50px; background: #667eea"></span>
          <span style="height: 35px; background: #667eea"></span>
          <span style="height: 60px; background: #667eea"></span>
          <span style="height: 55px; background: #667eea"></span>
          <span style="height: 80px; background: #667eea"></span>
          <span style="height: 75px; background: #667eea"></span>
        </div>
        <div class="trend-labels">
          <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
        </div>
      </div>
    `;
  },

  renderPeakHours() {
    return `
      <div class="peak-hours">
        <div class="peak-item">
          <div class="peak-time">14h - 15h</div>
          <div class="peak-bar" style="width: 95%; background: #f56565"></div>
          <div class="peak-value">89 events</div>
        </div>
        <div class="peak-item">
          <div class="peak-time">20h - 21h</div>
          <div class="peak-bar" style="width: 88%; background: #f6ad55"></div>
          <div class="peak-value">82 events</div>
        </div>
        <div class="peak-item">
          <div class="peak-time">22h - 23h</div>
          <div class="peak-bar" style="width: 85%; background: #ecc94b"></div>
          <div class="peak-value">79 events</div>
        </div>
      </div>
    `;
  },

  exportAnalytics() {
    const data = {
      exported: new Date(),
      activityHours: this.getActivityByHour(),
      topMembers: this.getTopMembers(),
      emotionStats: this.getEmotionStats()
    };

    return JSON.stringify(data, null, 2);
  },

  getActivityByHour() {
    return Array(24).fill(0).map((_, i) => ({ hour: i, count: Math.random() * 100 | 0 }));
  },

  getTopMembers() {
    return [
      { name: 'Alice', messages: 247 },
      { name: 'Bob', messages: 189 }
    ];
  },

  getEmotionStats() {
    return {
      happy: 30,
      sleepy: 20,
      thoughtful: 25,
      energetic: 15,
      sad: 10
    };
  }
};
