/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-bonds.js
   Relations affectives entre Brainee et les membres
   ═══════════════════════════════════════════════════ */

async function renderBonds() {
  const sec = document.getElementById('section-bonds');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const res = await api('/api/emotions/bonds');
    const bonds = res.bonds || [];
    if (!bonds.length) {
      sec.innerHTML = '<div class="card"><div class="empty">Aucune relation enregistrée pour l\'instant</div></div>';
      return;
    }
    sec.innerHTML = `
      <div class="card mb-3">
        <div class="card-header">
          <div class="card-title">💞 Relations membres</div>
          <div class="card-subtitle">${bonds.length} membre${bonds.length > 1 ? 's' : ''} · tri par attachement</div>
          <button class="btn btn-sm" onclick="renderBonds()">↻</button>
        </div>
        <div class="bond-grid">
          ${bonds.map(b => {
            const att = Math.round(b.baseAttachment || 0);
            const trust = Math.round(b.baseTrust || 0);
            const comfort = Math.round(b.baseComfort || 0);
            const tier = att >= 65 ? 'strong' : att >= 40 ? 'mid' : 'low';
            const tierLabel = att >= 65 ? 'Fort' : att >= 40 ? 'Moyen' : 'Faible';
            const traj = b.emotionalTrajectory || [];
            const sparkMax = Math.max(...traj.map(t => t.avgAttachment || 0), 1);
            const spark = traj.slice(-10).map(t => {
              const pct = Math.round(((t.avgAttachment || 0) / sparkMax) * 100);
              return `<div class="bond-spark-bar" style="height:${Math.max(4, pct)}%" title="${t.day}: ${t.avgAttachment}"></div>`;
            }).join('');
            return `
              <div class="bond-card">
                <div class="bond-card-head">
                  <div class="bond-name">${escapeHtml(b.username || b.userId || '—')}</div>
                  <span class="bond-strength ${tier}">${tierLabel}</span>
                </div>
                <div class="bond-metrics">
                  <div class="bond-metric">
                    <div class="bond-metric-label">Attachement</div>
                    <div class="bond-metric-value" style="color:var(--accent)">${att}</div>
                  </div>
                  <div class="bond-metric">
                    <div class="bond-metric-label">Confiance</div>
                    <div class="bond-metric-value">${trust}</div>
                  </div>
                  <div class="bond-metric">
                    <div class="bond-metric-label">Confort</div>
                    <div class="bond-metric-value">${comfort}</div>
                  </div>
                </div>
                ${traj.length >= 2 ? `<div class="bond-spark">${spark}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}
