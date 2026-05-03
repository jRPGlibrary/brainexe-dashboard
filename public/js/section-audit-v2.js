/* Audit Avancé v0.9.6 - Journal sécurité détaillé */

async function renderAuditV2() {
  const sec = document.getElementById('section-audit');
  sec.innerHTML = '<div class="empty">Chargement audit avancé…</div>';

  try {
    const [auditRes, alertsRes] = await Promise.all([
      fetch('/api/audit').then(r => r.json()),
      fetch('/api/audit/security-alerts').then(r => r.json())
    ]);

    if (!auditRes.ok) throw new Error(auditRes.error);

    const audit = auditRes.audit || [];
    const alerts = alertsRes.alerts || [];

    let html = '<div class="card">';

    // Alertes de sécurité
    if (alerts.length > 0) {
      html += '<div style="margin-bottom: 20px;">';
      html += '<h3 style="margin-bottom: 12px;">🚨 Alertes de sécurité</h3>';
      alerts.forEach(alert => {
        const severity = alert.severity || 'warning';
        const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : '🟡';
        html += `
          <div class="security-alert">
            <div class="security-alert-icon">${icon}</div>
            <div class="security-alert-content">
              <div class="security-alert-title">${escapeHtml(alert.message)}</div>
              <div class="security-alert-message">
                ${escapeHtml(alert.details)} · ${new Date(alert.timestamp).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // Filtres
    html += `
      <div class="audit-filters" style="margin-bottom: 16px;">
        <input class="input search" placeholder="Rechercher…"
          id="audit-search" oninput="filterAuditLogs()">
        <select class="select" id="audit-action-filter" onchange="filterAuditLogs()">
          <option value="">Toutes les actions</option>
          <option value="auth.login">Connexion</option>
          <option value="auth.fail">Échec connexion</option>
          <option value="config.update">Mise à jour config</option>
          <option value="admin.action">Action admin</option>
        </select>
        <select class="select" id="audit-status-filter" onchange="filterAuditLogs()">
          <option value="">Tous les statuts</option>
          <option value="true">Succès</option>
          <option value="false">Échoué</option>
        </select>
        <button class="btn btn-sm" onclick="downloadAuditLog()">📥 Exporter CSV</button>
      </div>
    `;

    // Journal d'audit
    html += '<h3 style="margin-bottom: 12px;">📖 Journal d\'audit</h3>';
    html += '<div id="audit-entries">';

    if (audit.length === 0) {
      html += '<div class="empty">Aucune action enregistrée</div>';
    } else {
      audit.slice(0, 100).forEach(entry => {
        const time = new Date(entry.timestamp).toLocaleString('fr-FR');
        const statusClass = entry.success ? 'success' : 'error';
        const statusEmoji = entry.success ? '✅' : '❌';
        const actionClass = entry.success ? 'success' : 'error';

        html += `
          <div class="audit-entry ${actionClass}">
            <div class="audit-info">
              <div class="audit-action">${statusEmoji} ${escapeHtml(entry.action)}</div>
              <div class="audit-details">
                IP: ${escapeHtml(entry.ip)} · User-Agent: ${escapeHtml(entry.userAgent?.substring(0, 40) || 'N/A')}
              </div>
              <div class="audit-details">
                ${escapeHtml(entry.details || '')}
              </div>
              <div class="audit-time">${time}</div>
            </div>
            <div class="audit-badge">${entry.success ? 'Succès' : 'Erreur'}</div>
          </div>
        `;
      });

      if (audit.length > 100) {
        html += `<div class="empty" style="margin-top: 12px;">+ ${audit.length - 100} autres entrées</div>`;
      }
    }

    html += '</div></div>';
    sec.innerHTML = html;

    window.filteredAudit = audit;
  } catch (e) {
    sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">⚠️ ${escapeHtml(e.message)}</div></div>`;
  }
}

function filterAuditLogs() {
  const search = (document.getElementById('audit-search')?.value || '').toLowerCase();
  const action = document.getElementById('audit-action-filter')?.value || '';
  const status = document.getElementById('audit-status-filter')?.value || '';

  let filtered = window.filteredAudit || [];

  if (search) {
    filtered = filtered.filter(e =>
      e.action.toLowerCase().includes(search) ||
      (e.details || '').toLowerCase().includes(search) ||
      e.ip.toLowerCase().includes(search)
    );
  }

  if (action) {
    filtered = filtered.filter(e => e.action === action);
  }

  if (status !== '') {
    filtered = filtered.filter(e => e.success === (status === 'true'));
  }

  const container = document.getElementById('audit-entries');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">Aucune entrée correspondante</div>';
    return;
  }

  let html = '';
  filtered.slice(0, 100).forEach(entry => {
    const time = new Date(entry.timestamp).toLocaleString('fr-FR');
    const actionClass = entry.success ? 'success' : 'error';
    const statusEmoji = entry.success ? '✅' : '❌';

    html += `
      <div class="audit-entry ${actionClass}">
        <div class="audit-info">
          <div class="audit-action">${statusEmoji} ${escapeHtml(entry.action)}</div>
          <div class="audit-details">
            IP: ${escapeHtml(entry.ip)} · User-Agent: ${escapeHtml(entry.userAgent?.substring(0, 40) || 'N/A')}
          </div>
          <div class="audit-details">${escapeHtml(entry.details || '')}</div>
          <div class="audit-time">${time}</div>
        </div>
        <div class="audit-badge">${entry.success ? 'Succès' : 'Erreur'}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function downloadAuditLog() {
  try {
    const response = await fetch('/api/audit/export');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Journal d\'audit exporté', 'success');
  } catch (e) {
    toast(`Erreur export: ${e.message}`, 'error');
  }
}
