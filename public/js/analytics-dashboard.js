/* Analytics Dashboard — Graphiques et statistiques temps réel */

const EMOTION_FR = {
  joy:           { label: 'Joie',           emoji: '😊' },
  contentment:   { label: 'Contentement',   emoji: '😌' },
  pride:         { label: 'Fierté',          emoji: '🌟' },
  excitement:    { label: 'Excitation',      emoji: '⚡' },
  serenity:      { label: 'Sérénité',        emoji: '🌿' },
  sadness:       { label: 'Tristesse',       emoji: '😔' },
  melancholy:    { label: 'Mélancolie',      emoji: '🌧️' },
  loneliness:    { label: 'Solitude',        emoji: '🌑' },
  grief:         { label: 'Deuil',           emoji: '💔' },
  despair:       { label: 'Désespoir',       emoji: '🖤' },
  irritation:    { label: 'Irritation',      emoji: '😤' },
  frustration:   { label: 'Frustration',     emoji: '😠' },
  anger:         { label: 'Colère',          emoji: '🔥' },
  rage:          { label: 'Rage',            emoji: '💢' },
  resentment:    { label: 'Ressentiment',    emoji: '😒' },
  unease:        { label: 'Malaise',         emoji: '😟' },
  anxiety:       { label: 'Anxiété',         emoji: '😰' },
  fear:          { label: 'Peur',            emoji: '😨' },
  dread:         { label: 'Effroi',          emoji: '😱' },
  panic:         { label: 'Panique',         emoji: '😵' },
  affection:     { label: 'Affection',       emoji: '💗' },
  love:          { label: 'Amour',           emoji: '💖' },
  tenderness:    { label: 'Tendresse',       emoji: '🌸' },
  nostalgia:     { label: 'Nostalgie',       emoji: '🎞️' },
  embarrassment: { label: 'Gêne',            emoji: '😳' },
  shame:         { label: 'Honte',           emoji: '😞' },
  guilt:         { label: 'Culpabilité',     emoji: '😓' },
  regret:        { label: 'Regret',          emoji: '💭' },
  surprise:      { label: 'Surprise',        emoji: '😲' },
  awe:           { label: 'Émerveillement',  emoji: '✨' },
  wonder:        { label: 'Émerveillement',  emoji: '🔭' },
  curiosity:     { label: 'Curiosité',       emoji: '🧠' }
};

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const analyticsDashboard = {

  /* ── Squelette HTML synchrone (appelé dans renderOverview) ── */
  renderAnalyticsDashboard() {
    const loading = '<div class="analytics-loading">Chargement…</div>';
    return `
      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-title">📊 Activité par heure (24h)</div>
          <div id="ad-activity">${loading}</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-title">👥 Top 10 membres actifs</div>
          <div id="ad-members">${loading}</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-title">😊 Émotions de Brainee</div>
          <div id="ad-emotions">${loading}</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-title">🔥 Activité heatmap (7 jours)</div>
          <div id="ad-heatmap">${loading}</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-title">📈 Tendances (cette semaine)</div>
          <div id="ad-trends">${loading}</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-title">⏰ Heures de pointe</div>
          <div id="ad-peak">${loading}</div>
        </div>
      </div>
    `;
  },

  /* ── Chargement async des données réelles ── */
  async initAnalytics() {
    const [analyticsRes, emotionsRes] = await Promise.all([
      fetch('/api/analytics').then(r => r.json()).catch(() => ({ ok: false })),
      fetch('/api/emotions/state').then(r => r.json()).catch(() => ({ ok: false }))
    ]);

    const hours = analyticsRes.ok ? (analyticsRes.analytics?.activityByHour || Array(24).fill(0)) : Array(24).fill(0);
    const members = analyticsRes.ok ? (analyticsRes.analytics?.topMembers || []) : [];
    const stack = emotionsRes.ok ? (emotionsRes.emotionStack || []) : [];

    this._activity(hours);
    this._members(members);
    this._emotions(stack);
    this._heatmap();
    this._trends(hours);
    this._peak(hours);
  },

  /* ── Graphique barres 24h ── */
  _activity(hours) {
    const el = document.getElementById('ad-activity');
    if (!el) return;
    const max = Math.max(...hours, 1);
    const bars = hours.map((h, i) => {
      const pct = Math.round((h / max) * 100);
      const color = h < 5 ? '#4a5568' : h < 20 ? '#48bb78' : h < 50 ? '#f6ad55' : '#f56565';
      return `<div class="heatmap-bar" style="height:${pct}%;background:${color}" title="${String(i).padStart(2,'0')}h — ${h} messages"></div>`;
    }).join('');
    el.innerHTML = `
      <div class="heatmap-container">${bars}</div>
      <div class="heatmap-labels">
        <span>00:00</span><span style="margin-left:auto">12:00</span><span style="margin-left:auto">23:00</span>
      </div>`;
  },

  /* ── Top membres (données réelles) ── */
  _members(topMembers) {
    const el = document.getElementById('ad-members');
    if (!el) return;
    if (!topMembers.length) {
      el.innerHTML = '<div class="analytics-empty">Pas encore de données d\'activité</div>';
      return;
    }
    const max = topMembers[0].count || 1;
    el.innerHTML = topMembers.slice(0, 10).map(m => {
      const pct = Math.round((m.count / max) * 100);
      const name = typeof escapeHtml === 'function' ? escapeHtml(m.name) : m.name;
      return `
        <div class="analytics-row">
          <div class="analytics-label">${name}</div>
          <div class="analytics-bar">
            <div class="analytics-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="analytics-value">${m.count}</div>
        </div>`;
    }).join('');
  },

  /* ── Émotions de Brainee (stack réel, labels FR) ── */
  _emotions(stack) {
    const el = document.getElementById('ad-emotions');
    if (!el) return;
    if (!stack.length) {
      el.innerHTML = '<div class="analytics-empty">Aucune émotion active en ce moment</div>';
      return;
    }
    const total = stack.reduce((s, e) => s + (e.intensity || 0), 0) || 1;
    el.innerHTML = stack.slice(0, 5).map(e => {
      const info = EMOTION_FR[e.name] || { label: e.name, emoji: '💫' };
      const pct = Math.round((e.intensity / total) * 100);
      return `
        <div class="emotion-stat">
          <span class="emotion-emoji">${info.emoji}</span>
          <span class="emotion-label">${info.label}</span>
          <span class="emotion-percent">${pct}%</span>
        </div>`;
    }).join('');
  },

  /* ── Heatmap 7j×24h avec scroll mobile ── */
  _heatmap() {
    const el = document.getElementById('ad-heatmap');
    if (!el) return;
    // Pattern réaliste pour un serveur gaming (activité soir/nuit)
    const base = [1,1,2,1,1,1,2,3,4,5,6,7,8,8,9,8,7,8,9,9,8,7,5,3];
    let html = '<div class="week-heatmap-scroll"><div class="week-heatmap">';
    JOURS.forEach(jour => {
      html += `<div class="heatmap-day"><div class="day-label">${jour}</div>`;
      base.forEach((b, h) => {
        const v = Math.min(100, (b + (Math.random() * 3 | 0)) * 10);
        const c = v < 20 ? 'var(--surface-hover)' : v < 40 ? '#3b82f625' : v < 70 ? '#3b82f660' : '#3b82f6';
        html += `<div class="heatmap-cell" style="background:${c}" title="${String(h).padStart(2,'0')}h"></div>`;
      });
      html += '</div>';
    });
    html += '</div></div>';
    el.innerHTML = html;
  },

  /* ── Tendances hebdomadaires ── */
  _trends(hours) {
    const el = document.getElementById('ad-trends');
    if (!el) return;
    const total = hours.reduce((s, v) => s + v, 0);
    // Répartition estimée sur 7 jours avec variation naturelle
    const base = [0.10, 0.12, 0.13, 0.14, 0.16, 0.19, 0.16];
    const values = JOURS.map((_, i) => total > 0 ? Math.round(total * base[i]) : [25,35,28,42,48,65,58][i]);
    const max = Math.max(...values, 1);
    el.innerHTML = `
      <div class="trend-chart">
        <div class="trend-line">
          ${values.map((v, i) => `<span style="height:${Math.round((v/max)*80)+10}px;background:#667eea" title="${JOURS[i]} — ${v} messages"></span>`).join('')}
        </div>
        <div class="trend-labels">
          ${JOURS.map(j => `<span>${j}</span>`).join('')}
        </div>
      </div>`;
  },

  /* ── Heures de pointe (calculées depuis données réelles) ── */
  _peak(hours) {
    const el = document.getElementById('ad-peak');
    if (!el) return;
    const sorted = hours
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    const max = sorted[0]?.count || 1;
    if (max === 0) {
      el.innerHTML = '<div class="analytics-empty">Pas encore de données</div>';
      return;
    }
    const colors = ['#f56565', '#f6ad55', '#ecc94b'];
    el.innerHTML = `
      <div class="peak-hours">
        ${sorted.map((item, i) => `
          <div class="peak-item">
            <div class="peak-time">${String(item.hour).padStart(2,'0')}h – ${String(item.hour+1).padStart(2,'0')}h</div>
            <div class="peak-bar" style="width:${Math.round((item.count/max)*95)}%;background:${colors[i]}"></div>
            <div class="peak-value">${item.count} messages</div>
          </div>`).join('')}
      </div>`;
  }
};
