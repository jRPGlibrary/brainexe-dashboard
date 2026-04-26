/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-audit.js
   Journal des actions admin effectuées depuis le dashboard
   ═══════════════════════════════════════════════════ */

const AUDIT_LABELS = {
  'channel.delete': '🗑 Salon supprimé',
  'role.delete': '🗑 Rôle supprimé',
  'member.mute': '🔇 Membre muté',
  'member.kick': '👢 Membre kické',
  'member.ban': '🔨 Membre banni',
  'post.send': '📤 Message posté',
  'config.update': '⚙️ Config modifiée',
  'admin.mood': '🎭 Humeur changée',
  'admin.slot': '🧠 Slot forcé',
  'admin.state': '💫 État interne',
  'admin.tiktok': '📱 TikTok override',
  'backup.create': '💾 Backup créé',
  'backup.delete': '🗑 Backup supprimé',
  'backup.restore-config': '↩ Config restaurée',
  'autorole.update': '🎭 Auto-rôle modifié',
  'funding.donation': '💰 Donation enregistrée',
};

async function renderAudit() {
  const sec = document.getElementById('section-audit');
  sec.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const res = await api('/api/audit');
    const entries = res.entries || [];
    if (!entries.length) {
      sec.innerHTML = '<div class="card"><div class="empty">Aucune action enregistrée pour cette session</div></div>';
      return;
    }
    sec.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📖 Historique des actions</div>
          <div class="card-subtitle">${entries.length} action${entries.length > 1 ? 's' : ''} · session courante</div>
          <button class="btn btn-sm" onclick="renderAudit()">↻</button>
        </div>
        <div>
          ${entries.map(e => {
            const time = e.ts ? new Date(e.ts).toLocaleString('fr-FR') : '—';
            const label = AUDIT_LABELS[e.action] || e.action;
            const detail = Object.entries(e.details || {})
              .filter(([k]) => k !== 'preview')
              .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join(' · ');
            return `<div class="audit-entry">
              <span class="audit-time">${time}</span>
              <span class="audit-action">${label}</span>
              <span class="audit-details">${escapeHtml(detail)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">Erreur : ${escapeHtml(e.message)}</div></div>`;
  }
}
