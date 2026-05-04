/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — navigation.js
   Sidebar mobile + routing entre sections
   ═══════════════════════════════════════════════════ */

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('active');
  const t = document.getElementById('menu-toggle');
  if (t) t.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('active');
  const t = document.getElementById('menu-toggle');
  if (t) t.setAttribute('aria-expanded', 'false');
}

function navigate(section) {
  closeSidebar();
  state.currentSection = section;
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.section === section);
  });
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === `section-${section}`);
  });
  const titles = {
    overview: ['Vue d\'ensemble', 'Dashboard temps réel · toute modification est appliquée instantanément'],
    admin:    ['🎛️ Admin live', 'Contrôle chaque paramètre du bot en direct — aucune sauvegarde requise'],
    logs:     ['📜 Logs', 'Stream temps réel des événements'],
    channels: ['💬 Salons', 'Arborescence & gestion des salons'],
    roles:    ['🎭 Rôles', 'Gestion des rôles du serveur'],
    members:  ['👥 Membres', 'Liste des membres du serveur'],
    automations: ['⚡ Automatisations', 'Features activables et tests manuels'],
    posts:    ['📝 Posts manuels', 'Envoyer un message dans un salon'],
    backups:  ['💾 Backups', 'Snapshots de configuration'],
    settings: ['⚙️ Paramètres', 'Configuration générale'],
    funding:   ['💰 Soutien Projet', 'Chaque contribution aide Brainee à grandir'],
    health:    ['❤️ Santé système', 'Discord · MongoDB · Claude · Mémoire'],
    emotions:  ['💗 Émotions', 'État émotionnel live de Brainee'],
    bonds:     ['💞 Relations', 'Liens affectifs avec les membres'],
    schedule:  ['🗓️ Planning', 'Grille horaire hebdomadaire du bot'],
    audit:     ['📖 Historique', 'Actions admin effectuées depuis le dashboard'],
  };
  const [title, sub] = titles[section] || [section, ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = sub;
  renderCurrentSection();
}

function renderCurrentSection() {
  const map = {
    overview: renderOverview, admin: renderAdmin,
    logs: renderLogs, channels: renderChannels, roles: renderRoles,
    members: renderMembers, automations: renderAutomations,
    posts: renderPosts, backups: renderBackups, settings: renderSettings,
    funding: renderFunding, health: renderHealth, emotions: renderEmotions,
    being: renderBeingSection,
    bonds: renderBonds, schedule: renderSchedule, audit: renderAudit,
  };
  const fn = map[state.currentSection];
  if (fn) fn();
}
