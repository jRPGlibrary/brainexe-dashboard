let tokenStats = {};
let tokenLeaderboard = [];

function initTokensSection() {
  const section = document.getElementById('section-tokens');
  if (!section) return;

  section.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>📊 Utilisation des Tokens</h1>
        <p>Suivi détaillé de l'utilisation des tokens Claude par membre</p>
      </div>

      <div class="tabs-container">
        <button class="tab-btn active" data-tab="overview">Vue d'ensemble</button>
        <button class="tab-btn" data-tab="leaderboard">Leaderboard</button>
        <button class="tab-btn" data-tab="daily">Évolution</button>
      </div>

      <div class="tab-content active" id="tab-overview">
        <div class="grid">
          <div class="card">
            <h3>Statistiques globales</h3>
            <div id="global-stats" class="stats-grid">
              <div class="stat">
                <div class="stat-label">Total des tokens utilisés</div>
                <div class="stat-value" id="total-tokens">—</div>
              </div>
              <div class="stat">
                <div class="stat-label">Tokens d'entrée</div>
                <div class="stat-value" id="total-input">—</div>
              </div>
              <div class="stat">
                <div class="stat-label">Tokens de sortie</div>
                <div class="stat-value" id="total-output">—</div>
              </div>
              <div class="stat">
                <div class="stat-label">Messages traités</div>
                <div class="stat-value" id="total-messages">—</div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3>Rechercher un membre</h3>
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
              <input type="text" id="member-search" placeholder="Nom d'utilisateur Discord..." class="input">
              <button class="btn btn-primary" onclick="searchMemberTokens()">Rechercher</button>
            </div>
            <div id="search-results"></div>
          </div>
        </div>
      </div>

      <div class="tab-content" id="tab-leaderboard">
        <div class="card">
          <h3>Top 50 utilisateurs</h3>
          <div id="leaderboard-container" style="overflow-x: auto;">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 40px">Rang</th>
                  <th>Utilisateur</th>
                  <th style="width: 120px">Tokens</th>
                  <th style="width: 120px">Entrée</th>
                  <th style="width: 120px">Sortie</th>
                  <th style="width: 100px">Messages</th>
                  <th style="width: 120px">Dernière interaction</th>
                </tr>
              </thead>
              <tbody id="leaderboard-body">
                <tr><td colspan="7" class="text-center text-muted">Chargement...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="tab-content" id="tab-daily">
        <div class="card">
          <h3>Évolution journalière</h3>
          <p class="text-muted" style="font-size: 0.9em; margin-bottom: 16px;">
            Entrez un ID Discord ou un nom pour voir l'évolution sur 30 jours
          </p>
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <input type="text" id="daily-member-search" placeholder="ID Discord ou nom..." class="input">
            <button class="btn btn-primary" onclick="loadDailyStats()">Charger</button>
          </div>
          <div id="daily-chart" style="height: 400px; margin-top: 20px;">
            <canvas id="tokens-daily-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attachez les event listeners
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('tab-' + this.dataset.tab).classList.add('active');

      if (this.dataset.tab === 'leaderboard') loadTokenLeaderboard();
      if (this.dataset.tab === 'daily') {
        setTimeout(() => {
          if (window.Chart && !window.tokensDailyChartInstance) {
            window.tokensDailyChartInstance = new Chart(
              document.getElementById('tokens-daily-chart'),
              { type: 'line', data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false } }
            );
          }
        }, 100);
      }
    });
  });

  loadTokenLeaderboard();
  loadGlobalStats();
}

async function loadGlobalStats() {
  try {
    const res = await fetch('/api/members/token-stats/leaderboard?limit=1000');
    const data = await res.json();

    if (!data.ok || !data.stats) {
      document.getElementById('global-stats').innerHTML = '<p class="text-muted">Aucune donnée disponible</p>';
      return;
    }

    let totalTokens = 0, totalInput = 0, totalOutput = 0, totalMessages = 0;

    data.stats.forEach(stat => {
      totalTokens += stat.totalTokens || 0;
      totalInput += stat.totalInput || 0;
      totalOutput += stat.totalOutput || 0;
      totalMessages += stat.messageCount || 0;
    });

    document.getElementById('total-tokens').textContent = formatNumber(totalTokens);
    document.getElementById('total-input').textContent = formatNumber(totalInput);
    document.getElementById('total-output').textContent = formatNumber(totalOutput);
    document.getElementById('total-messages').textContent = formatNumber(totalMessages);
  } catch (e) {
    console.error('Erreur lors du chargement des stats globales:', e);
  }
}

async function loadTokenLeaderboard() {
  try {
    const res = await fetch('/api/members/token-stats/leaderboard?limit=50');
    const data = await res.json();

    const tbody = document.getElementById('leaderboard-body');
    if (!data.ok || !data.stats || data.stats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Aucune donnée</td></tr>';
      return;
    }

    tbody.innerHTML = data.stats.map((stat, idx) => `
      <tr onclick="loadMemberTokenStats('${stat._id}', '${stat.username}')" style="cursor: pointer;">
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${escapeHtml(stat.username || 'Inconnu')}</strong></td>
        <td>${formatNumber(stat.totalTokens)}</td>
        <td>${formatNumber(stat.totalInput)}</td>
        <td>${formatNumber(stat.totalOutput)}</td>
        <td>${stat.messageCount}</td>
        <td>${stat.lastUsage ? new Date(stat.lastUsage).toLocaleDateString('fr-FR') : '—'}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erreur lors du chargement du leaderboard:', e);
  }
}

async function searchMemberTokens() {
  const input = document.getElementById('member-search').value.trim().toLowerCase();
  if (!input.length) {
    document.getElementById('search-results').innerHTML = '<p class="text-muted">Entrez un nom pour rechercher</p>';
    return;
  }

  try {
    const res = await fetch('/api/members/token-stats/leaderboard?limit=200');
    const data = await res.json();

    if (!data.ok || !data.stats) {
      document.getElementById('search-results').innerHTML = '<p class="text-muted">Erreur lors de la recherche</p>';
      return;
    }

    const filtered = data.stats.filter(s => (s.username || '').toLowerCase().includes(input)).slice(0, 10);

    if (filtered.length === 0) {
      document.getElementById('search-results').innerHTML = '<p class="text-muted">Aucun résultat</p>';
      return;
    }

    document.getElementById('search-results').innerHTML = `
      <div style="max-height: 300px; overflow-y: auto;">
        ${filtered.map(stat => `
          <div class="card-item" onclick="loadMemberTokenStats('${stat._id}', '${stat.username}')" style="cursor: pointer; padding: 12px; margin-bottom: 8px; border: 1px solid var(--border-color); border-radius: 6px;">
            <div style="font-weight: 600;">${escapeHtml(stat.username)}</div>
            <div class="text-sm text-muted">${formatNumber(stat.totalTokens)} tokens · ${stat.messageCount} messages</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    console.error('Erreur lors de la recherche:', e);
  }
}

async function loadMemberTokenStats(userId, username) {
  try {
    const [statsRes, contextRes, dailyRes] = await Promise.all([
      fetch(`/api/members/${userId}/token-stats`),
      fetch(`/api/members/${userId}/token-stats/context`),
      fetch(`/api/members/${userId}/token-stats/daily?days=30`),
    ]);

    const stats = await statsRes.json();
    const context = await contextRes.json();
    const daily = await dailyRes.json();

    if (!stats.ok) {
      showToast('Erreur lors du chargement', 'error');
      return;
    }

    let html = `<div class="card" style="margin-top: 16px;">`;
    html += `<h4>Statistiques pour ${escapeHtml(username || 'Inconnu')}</h4>`;

    if (!stats.stats) {
      html += '<p class="text-muted">Pas de données disponibles</p>';
    } else {
      html += `
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-label">Total des tokens</div>
            <div class="stat-value">${formatNumber(stats.stats.totalTokens)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Tokens d'entrée</div>
            <div class="stat-value">${formatNumber(stats.stats.totalInput)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Tokens de sortie</div>
            <div class="stat-value">${formatNumber(stats.stats.totalOutput)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Messages</div>
            <div class="stat-value">${stats.stats.messageCount}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Moyenne par message</div>
            <div class="stat-value">${Math.round(stats.stats.totalTokens / stats.stats.messageCount)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Dernière interaction</div>
            <div class="stat-value text-sm">${new Date(stats.stats.lastUsage).toLocaleString('fr-FR')}</div>
          </div>
        </div>
      `;

      if (context.ok && Object.keys(context.stats).length > 0) {
        html += `<h5 style="margin-top: 24px;">Par contexte</h5><table class="table" style="margin-top: 12px;"><thead><tr><th>Type</th><th>Tokens</th><th>Entrée</th><th>Sortie</th><th>Messages</th></tr></thead><tbody>`;
        Object.entries(context.stats).forEach(([ctx, data]) => {
          html += `<tr><td>${escapeHtml(ctx)}</td><td>${formatNumber(data.totalTokens)}</td><td>${formatNumber(data.inputTokens)}</td><td>${formatNumber(data.outputTokens)}</td><td>${data.count}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    }

    html += `</div>`;
    document.getElementById('search-results').innerHTML = html;
  } catch (e) {
    console.error('Erreur lors du chargement des stats:', e);
  }
}

async function loadDailyStats() {
  const input = document.getElementById('daily-member-search').value.trim();
  if (!input) {
    showToast('Entrez un ID Discord ou un nom', 'warning');
    return;
  }

  try {
    const res = await fetch(`/api/members/${input}/token-stats/daily?days=30`);
    const data = await res.json();

    if (!data.ok || !data.stats || data.stats.length === 0) {
      showToast('Aucune donnée trouvée', 'warning');
      return;
    }

    const labels = data.stats.map(s => s._id).reverse();
    const inputData = data.stats.map(s => s.totalInput).reverse();
    const outputData = data.stats.map(s => s.totalOutput).reverse();

    if (window.tokensDailyChartInstance) {
      window.tokensDailyChartInstance.data.labels = labels;
      window.tokensDailyChartInstance.data.datasets = [
        {
          label: 'Tokens d\'entrée',
          data: inputData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Tokens de sortie',
          data: outputData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ];
      window.tokensDailyChartInstance.update();
    }

    showToast('Données chargées', 'success');
  } catch (e) {
    console.error('Erreur:', e);
    showToast('Erreur lors du chargement', 'error');
  }
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString('fr-FR');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

initTokensSection();
