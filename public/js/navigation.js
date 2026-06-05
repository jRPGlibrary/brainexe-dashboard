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
  document.querySelector('.main')?.scrollTo(0, 0);
  updateBottomTabs(section);
  const titles = {
    overview: ['Vue d\'ensemble', 'Dashboard temps réel · toute modification est appliquée instantanément'],
    admin:    ['🎛️ Admin live', 'Contrôle chaque paramètre du bot en direct — aucune sauvegarde requise'],
    logs:     ['📜 Logs', 'Stream temps réel des événements'],
    channels: ['💬 Salons', 'Arborescence & gestion des salons'],
    roles:    ['🎭 Rôles', 'Gestion des rôles du serveur'],
    members:  ['👥 Membres', 'Liste des membres du serveur'],
    moderation: ['🛡️ Modération', 'Logs de modération — spam, mutes, kicks, bans'],
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
    tokens:    ['📊 Tokens', 'Consommation de tokens Claude par membre · leaderboard'],
    being:     ['🧬 Vie intérieure', '12 modules BRAINEE-LIVING — conscience simulée'],
  };
  const [title, sub] = titles[section] || [section, ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = sub;
  renderCurrentSection();
}

function updateBottomTabs(section) {
  document.querySelectorAll('.bottom-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.section === section);
  });
}

function renderCurrentSection() {
  const map = {
    overview: renderOverview, admin: renderAdmin,
    logs: renderLogs, channels: renderChannels, roles: renderRoles,
    members: renderMembers, moderation: renderModeration, automations: renderAutomations,
    posts: renderPosts, backups: renderBackups, settings: renderSettings,
    funding: renderFunding, health: renderHealth, emotions: renderEmotions,
    being: renderBeingSection,
    bonds: renderBonds, schedule: renderSchedule, audit: renderAudit,
    tokens: initTokensSection,
  };
  const fn = map[state.currentSection];
  if (fn) {
    try {
      fn();
    } catch (e) {
      console.error(`[Dashboard] Erreur rendu section "${state.currentSection}":`, e);
      const sec = document.getElementById(`section-${state.currentSection}`);
      if (sec) sec.innerHTML = `<div class="card"><div class="empty" style="color:var(--danger)">⚠️ Erreur : ${escapeHtml(e.message || String(e))}</div></div>`;
    }
  }
}
