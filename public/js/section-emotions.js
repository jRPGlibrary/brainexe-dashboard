/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-emotions.js
   État émotionnel live : états internes, tempérament, stack
   ═══════════════════════════════════════════════════ */

async function renderEmotions() {
  const sec = document.getElementById('section-emotions');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const res = await api('/api/emotions/state');
    const internal = res.internalState || {};
    const stack = res.emotionStack || [];
    const temp = res.temperament || {};

    const stateKeys = [
      { k: 'energy',          label: '⚡ Énergie' },
      { k: 'socialNeed',      label: '🗨️ Besoin social' },
      { k: 'calmNeed',        label: '🌿 Besoin calme' },
      { k: 'stimulation',     label: '🎯 Stimulation' },
      { k: 'mentalLoad',      label: '🧠 Charge mentale' },
      { k: 'recognitionNeed', label: '💖 Besoin reconnaissance' },
    ];

    const activeEmotions = stack.filter(e => e.intensity >= 15).sort((a, b) => b.intensity - a.intensity);

    sec.innerHTML = `
      <div class="grid-2 mb-3">
        <div class="card">
          <div class="card-header">
            <div class="card-title">💫 États internes</div>
            <button class="btn btn-sm" onclick="renderEmotions()">↻</button>
          </div>
          <div class="state-bars">
            ${stateKeys.map(({ k, label }) => {
              const val = Math.round(internal[k] ?? 50);
              const color = val > 75 ? 'var(--danger)' : val > 50 ? 'var(--accent)' : val > 25 ? 'var(--success)' : 'var(--text-3)';
              return `
                <div class="state-bar">
                  <div class="state-bar-label">
                    <span>${label}</span>
                    <span style="font-variant-numeric:tabular-nums;font-weight:600">${val}</span>
                  </div>
                  <div class="state-bar-track">
                    <div class="state-bar-fill" style="width:${val}%;background:${color}"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🎭 Tempérament (stable)</div>
          </div>
          <div class="state-bars">
            ${Object.entries(temp).map(([k, v]) => `
              <div class="state-bar">
                <div class="state-bar-label">
                  <span>${k}</span>
                  <span style="font-variant-numeric:tabular-nums;font-weight:600">${v}</span>
                </div>
                <div class="state-bar-track">
                  <div class="state-bar-fill" style="width:${v}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">💗 Émotions actives</div>
          <div class="card-subtitle">${activeEmotions.length} émotion${activeEmotions.length !== 1 ? 's' : ''} en ce moment</div>
        </div>
        ${activeEmotions.length ? `
          <div class="emotion-stack">
            ${activeEmotions.map(e => {
              const opacity = e.intensity >= 50 ? '' : 'low';
              return `<div class="emotion-chip ${opacity}">
                ${escapeHtml(e.name)}
                <span class="intensity">${Math.round(e.intensity)}</span>
              </div>`;
            }).join('')}
          </div>
        ` : '<div class="empty">Aucune émotion active en ce moment</div>'}
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}
