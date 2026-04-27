/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-schedule.js
   Grille horaire hebdomadaire du bot
   ═══════════════════════════════════════════════════ */

async function renderSchedule() {
  const sec = document.getElementById('section-schedule');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const res = await api('/api/schedule');
    const days = [
      { label: 'Lun–Ven', slots: res.weekday },
      { label: 'Samedi', slots: res.saturday },
      { label: 'Dimanche', slots: res.sunday },
    ];
    const now = res.now || {};
    const currentHour = Math.floor(now.hour || 0);
    const currentDay = now.day;
    const slotColors = {
      sleep: '#5b6ea7', wakeup: '#fbbf24', active: '#818cf8',
      lunch: '#f59e0b', productive: '#22d3ee', transition: '#a78bfa',
      gaming: '#ec4899', latenight: '#4338ca',
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const renderDay = (dayLabel, slots, isToday) => {
      const cells = hours.map(h => {
        const slot = slots.find(s => h >= s.start && h < s.end);
        if (!slot) return `<div class="schedule-cell" data-tip="${h}h : —"></div>`;
        const isCurrent = isToday && h === currentHour;
        return `<div class="schedule-cell${isCurrent ? ' current' : ''}"
          data-status="${slot.status}"
          data-tip="${h}h : ${slot.label} (max ${slot.maxConv} conv)"
          title="${h}h : ${slot.label}"></div>`;
      }).join('');
      return `<div class="schedule-day-label${isToday ? ' text-bold' : ''}" style="${isToday ? 'color:var(--accent)' : ''}">${dayLabel}</div>${cells}`;
    };

    const isToday = (dayLabel) => {
      if (dayLabel === 'Samedi' && currentDay === 6) return true;
      if (dayLabel === 'Dimanche' && currentDay === 0) return true;
      if (dayLabel === 'Lun–Ven' && currentDay >= 1 && currentDay <= 5) return true;
      return false;
    };

    const uniqueStatuses = [...new Set(days.flatMap(d => d.slots.map(s => s.status)))];

    sec.innerHTML = `
      <div class="card mb-3">
        <div class="card-header">
          <div>
            <div class="card-title">🗓️ Planning hebdomadaire</div>
            <div class="card-subtitle">Slot actuel : ${escapeHtml(now.label || '—')} · ${now.forced ? '🔒 Forcé' : 'Automatique'}</div>
          </div>
          <button class="btn btn-sm" onclick="navigate('admin')">🎛️ Forcer un slot →</button>
        </div>
        <div class="schedule-wrap">
          <div class="schedule-grid">
            <div class="schedule-head"></div>
            ${hours.map(h => `<div class="schedule-head">${h}</div>`).join('')}
            ${days.map(d => renderDay(d.label, d.slots, isToday(d.label))).join('')}
          </div>
        </div>
        <div class="schedule-legend">
          ${uniqueStatuses.map(s => {
            const slot = days.flatMap(d => d.slots).find(x => x.status === s);
            return `<div class="schedule-legend-item">
              <div class="schedule-legend-swatch" data-status="${s}" style="background:${slotColors[s] || '#888'}"></div>
              <span>${slot ? slot.label : s}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}
