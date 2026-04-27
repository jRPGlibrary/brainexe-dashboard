/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — boot.js
   Initialisation : thème, événements, chargement initial
   ═══════════════════════════════════════════════════ */

async function boot() {
  theme.init();

  document.querySelectorAll('.theme-btn').forEach(b => {
    b.addEventListener('click', () => theme.apply(b.dataset.theme));
  });
  document.querySelectorAll('.nav-item').forEach(b => {
    b.addEventListener('click', () => navigate(b.dataset.section));
  });
  document.getElementById('modal-bg').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('open')) closeSidebar();
    else openSidebar();
  });
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebar();
      closeModal();
    }
  });

  connectWS();

  try {
    const [stateRes, cfgRes, logsRes, autoRes, adminRes, fundingRes] = await Promise.all([
      fetch('/api/state').then(r => r.json()).catch(() => ({})),
      fetch('/api/config').then(r => r.json()).catch(() => ({})),
      fetch('/api/logs').then(r => r.json()).catch(() => ({})),
      fetch('/api/autorole').then(r => r.json()).catch(() => ({})),
      fetch('/api/admin/status').then(r => r.json()).catch(() => ({})),
      fetch('/api/project/funding').then(r => r.json()).catch(() => ({})),
    ]);
    if (stateRes.ok) { state.guild = stateRes.state; state.stats = stateRes.stats; }
    if (cfgRes.ok) state.config = cfgRes.config;
    if (logsRes.ok) state.logs = logsRes.logs || [];
    if (autoRes.ok) state.autoRole = autoRes.roleName || '';
    if (adminRes.ok) state.admin = adminRes;
    if (fundingRes.ok) state.funding = fundingRes;
  } catch (err) {
    console.error('Boot error:', err);
  }

  refreshTopbar();
  renderCurrentSection();
}

document.addEventListener('DOMContentLoaded', boot);
