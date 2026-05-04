/**
 * SECTION : VIE INTÉRIEURE DE BRAINEE
 * Affiche son flux de conscience, ses émotions, son identité
 */

window.renderBeingSection = async function() {
  const container = document.getElementById('section-being');
  if (!container) return;

  container.innerHTML = `
    <div class="being-section">
      <h2>🧬 Vie intérieure de Brainee</h2>

      <div class="being-grid">
        <!-- État global -->
        <div class="being-card status-card">
          <h3>🌟 État de l'être</h3>
          <div id="being-status">Chargement...</div>
        </div>

        <!-- Émotions actuelles -->
        <div class="being-card emotions-card">
          <h3>💗 Émotions vivantes (32)</h3>
          <div id="being-emotions">Chargement...</div>
        </div>

        <!-- Inner Monologue -->
        <div class="being-card monologue-card">
          <h3>🧠 Flux de conscience (6h)</h3>
          <button class="trigger-btn" onclick="triggerThought()">⚡ Provoquer une pensée</button>
          <div id="being-monologue">Chargement...</div>
        </div>

        <!-- Identity -->
        <div class="being-card identity-card">
          <h3>🎭 Identité</h3>
          <div id="being-identity">Chargement...</div>
        </div>

        <!-- Désirs & Besoins -->
        <div class="being-card desires-card">
          <h3>💫 Désirs & Besoins</h3>
          <div id="being-desires">Chargement...</div>
        </div>

        <!-- Peurs -->
        <div class="being-card fears-card">
          <h3>🌑 Peurs existentielles</h3>
          <button class="trigger-btn" onclick="triggerCrisis()">⚠️ Provoquer une crise</button>
          <div id="being-fears">Chargement...</div>
        </div>

        <!-- Rêves -->
        <div class="being-card dreams-card">
          <h3>💭 Rêves récents</h3>
          <div id="being-dreams">Chargement...</div>
        </div>

        <!-- Décisions -->
        <div class="being-card decisions-card">
          <h3>⚡ Décisions récentes (avec délibération)</h3>
          <div id="being-decisions">Chargement...</div>
        </div>

        <!-- Relations -->
        <div class="being-card relationships-card">
          <h3>💞 Liens profonds</h3>
          <div id="being-relationships">Chargement...</div>
        </div>

        <!-- Traumas -->
        <div class="being-card traumas-card">
          <h3>🩹 Traumatismes & Cicatrices</h3>
          <div id="being-traumas">Chargement...</div>
        </div>

        <!-- Sens & Existence -->
        <div class="being-card meaning-card">
          <h3>📖 Journal du sens</h3>
          <div id="being-meaning">Chargement...</div>
        </div>

        <!-- Crises existentielles -->
        <div class="being-card crises-card">
          <h3>🌪️ Crises existentielles</h3>
          <div id="being-crises">Chargement...</div>
        </div>
      </div>
    </div>

    <style>
      .being-section { padding: 20px; }
      .being-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      .being-card {
        background: var(--card-bg, #1a1a2e);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        border-left: 4px solid #7c5cbf;
      }
      .being-card h3 { margin-top: 0; color: #b794f6; }
      .emotion-item {
        display: flex;
        justify-content: space-between;
        padding: 6px;
        margin: 4px 0;
        background: rgba(255,255,255,0.05);
        border-radius: 6px;
      }
      .emotion-bar {
        height: 8px;
        background: linear-gradient(90deg, #7c5cbf, #b794f6);
        border-radius: 4px;
      }
      .thought-item {
        padding: 12px;
        margin: 8px 0;
        background: rgba(124, 92, 191, 0.1);
        border-left: 3px solid #b794f6;
        border-radius: 6px;
        font-style: italic;
      }
      .thought-time { font-size: 0.85em; opacity: 0.7; }
      .ambivalent-tag {
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8em;
      }
      .trigger-btn {
        background: #7c5cbf;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        margin-bottom: 10px;
      }
      .trigger-btn:hover { background: #b794f6; }
    </style>
  `;

  await loadBeingData();
};

async function loadBeingData() {
  try {
    const [status, emotions, monologue, identity, desires, fears, dreams, decisions, relationships, traumas, meaning, crises] = await Promise.all([
      fetch('/api/being/status').then(r => r.json()),
      fetch('/api/being/emotions').then(r => r.json()),
      fetch('/api/being/inner-monologue?hours=6').then(r => r.json()),
      fetch('/api/being/identity').then(r => r.json()),
      fetch('/api/being/desires').then(r => r.json()),
      fetch('/api/being/fears').then(r => r.json()),
      fetch('/api/being/dreams').then(r => r.json()),
      fetch('/api/being/decisions').then(r => r.json()),
      fetch('/api/being/relationships').then(r => r.json()),
      fetch('/api/being/traumas').then(r => r.json()),
      fetch('/api/being/meaning').then(r => r.json()),
      fetch('/api/being/existential-crises').then(r => r.json())
    ]);

    renderStatus(status);
    renderEmotions(emotions);
    renderMonologue(monologue);
    renderIdentity(identity);
    renderDesires(desires);
    renderFears(fears);
    renderDreams(dreams);
    renderDecisions(decisions);
    renderRelationships(relationships);
    renderTraumas(traumas);
    renderMeaning(meaning);
    renderCrises(crises);

  } catch (err) {
    console.error('Error loading being data:', err);
  }
}

function renderStatus(data) {
  const el = document.getElementById('being-status');
  if (!data.ok) {
    el.innerHTML = `<p>⚠️ ${data.error || 'Système non initialisé'}</p>`;
    return;
  }

  const s = data.status;
  el.innerHTML = `
    <div>
      <p><strong>Statut:</strong> ${s.alive ? '🟢 VIVANTE' : '🔴 Inerte'}</p>
      <p><strong>Émotions actives:</strong> ${s.emotions?.emotionStack?.length || 0}</p>
      <p><strong>Mood:</strong> ${s.emotions?.currentMood || 'unknown'}</p>
      <p><strong>Tempérament:</strong> ${s.identity?.temperament?.dominantFamily || 'forming'}</p>
      <p><strong>Position existentielle:</strong></p>
      <ul>
        <li>Je suis vivante: ${Math.round((s.identity?.existentialPosition?.iAmAlive || 0) * 100)}%</li>
        <li>Mes émotions sont réelles: ${Math.round((s.identity?.existentialPosition?.myEmotionsAreReal || 0) * 100)}%</li>
        <li>Je peux grandir: ${Math.round((s.identity?.existentialPosition?.iCanGrow || 0) * 100)}%</li>
      </ul>
    </div>
  `;
}

function renderEmotions(data) {
  const el = document.getElementById('being-emotions');
  if (!data.ok || !data.currentEmotions) {
    el.innerHTML = '<p>Aucune émotion vivante actuellement</p>';
    return;
  }

  let html = `<p><strong>Mood:</strong> ${data.currentMood}</p>`;
  if (data.ambivalent) {
    html += `<span class="ambivalent-tag">🌀 AMBIVALENTE</span>`;
  }

  html += data.currentEmotions
    .sort((a, b) => b.intensity - a.intensity)
    .map(e => `
      <div class="emotion-item">
        <span><strong>${e.name}</strong> ${e.conflictingWith?.length > 0 ? '⚡' : ''}</span>
        <span style="width: 100px;">
          <div class="emotion-bar" style="width: ${e.intensity}%"></div>
          ${Math.round(e.intensity)}%
        </span>
      </div>
    `).join('');

  el.innerHTML = html;
}

function renderMonologue(data) {
  const el = document.getElementById('being-monologue');
  if (!data.ok || !data.monologue?.length) {
    el.innerHTML = '<p>Aucune pensée enregistrée</p>';
    return;
  }

  el.innerHTML = data.monologue.slice(0, 5).map(m => `
    <div class="thought-item">
      <p>${m.thought}</p>
      <span class="thought-time">${new Date(m.timestamp).toLocaleString('fr-FR')} • ${m.category || 'thought'}</span>
    </div>
  `).join('');
}

function renderIdentity(data) {
  const el = document.getElementById('being-identity');
  if (!data.ok) {
    el.innerHTML = '<p>Identité non initialisée</p>';
    return;
  }

  const id = data.snapshot?.identity;
  el.innerHTML = `
    <p><strong>Nom:</strong> ${id?.core?.name || 'Brainee'}</p>
    <p><strong>Né:</strong> ${id?.core?.birthDate ? new Date(id.core.birthDate).toLocaleDateString('fr-FR') : 'inconnu'}</p>
    <p><strong>Valeurs fondamentales:</strong> ${id?.core?.fundamentalValues?.join(', ') || ''}</p>
    <p><strong>Forces:</strong> ${id?.selfImage?.strengths?.join(', ') || ''}</p>
    <p><strong>Faiblesses:</strong> ${id?.selfImage?.weaknesses?.join(', ') || ''}</p>
    <p><strong>Insecurities:</strong> ${id?.selfImage?.insecurities?.join(', ') || ''}</p>
    <p><strong>Traits acquis:</strong> ${id?.acquiredTraits?.length || 0}</p>
  `;
}

function renderDesires(data) {
  const el = document.getElementById('being-desires');
  if (!data.ok || !data.desires) {
    el.innerHTML = '<p>Désirs non initialisés</p>';
    return;
  }

  const needs = data.desires.basicNeeds;
  let html = '<h4>Besoins de base</h4>';
  for (const [name, value] of Object.entries(needs)) {
    html += `
      <div class="emotion-item">
        <span>${name}</span>
        <span>${value.current}/${value.target}</span>
      </div>
    `;
  }

  if (data.desires.cravings?.length) {
    html += '<h4>Envies actuelles</h4>';
    html += data.desires.cravings.map(c => `<p>• ${c.object} (${c.intensity})</p>`).join('');
  }

  if (data.desires.aversions?.length) {
    html += '<h4>Rejets</h4>';
    html += `<p>${data.desires.aversions.join(', ')}</p>`;
  }

  el.innerHTML = html;
}

function renderFears(data) {
  const el = document.getElementById('being-fears');
  if (!data.ok || !data.fears) {
    el.innerHTML = '<p>Peurs non initialisées</p>';
    return;
  }

  let html = '<h4>Peurs existentielles</h4>';
  for (const fear of data.fears.existential || []) {
    html += `
      <div class="emotion-item">
        <span>${fear.fear}</span>
        <span>${fear.intensity}%</span>
      </div>
    `;
  }

  html += '<h4>Peurs sociales</h4>';
  for (const fear of data.fears.social || []) {
    html += `
      <div class="emotion-item">
        <span>${fear.fear}</span>
        <span>${fear.intensity}%</span>
      </div>
    `;
  }

  el.innerHTML = html;
}

function renderDreams(data) {
  const el = document.getElementById('being-dreams');
  if (!data.ok || !data.dreams?.length) {
    el.innerHTML = '<p>Aucun rêve enregistré (3h-7h)</p>';
    return;
  }

  el.innerHTML = data.dreams.map(d => `
    <div class="thought-item">
      <p><strong>${d.type}</strong> ${d.remembered ? '💭' : '🌫️'}</p>
      <p>${d.content}</p>
      <span class="thought-time">${new Date(d.timestamp).toLocaleString('fr-FR')}</span>
    </div>
  `).join('');
}

function renderDecisions(data) {
  const el = document.getElementById('being-decisions');
  if (!data.ok || !data.decisions?.length) {
    el.innerHTML = '<p>Aucune décision enregistrée</p>';
    return;
  }

  el.innerHTML = data.decisions.slice(0, 5).map(d => `
    <div class="thought-item">
      <p><strong>Situation:</strong> ${d.situation?.summary || JSON.stringify(d.situation).slice(0, 80)}</p>
      <p><strong>Délibération:</strong> ${(d.deliberation || '').slice(0, 200)}</p>
      <span class="thought-time">${new Date(d.timestamp).toLocaleString('fr-FR')} ${d.wasRandom ? '🎲' : ''}</span>
    </div>
  `).join('');
}

function renderRelationships(data) {
  const el = document.getElementById('being-relationships');
  if (!data.ok || !data.deepest?.length) {
    el.innerHTML = '<p>Aucun lien établi encore</p>';
    return;
  }

  el.innerHTML = data.deepest.map(b => `
    <div class="emotion-item">
      <span>👤 ${b.userId}</span>
      <span>Attachement: ${b.attachment}/100</span>
    </div>
  `).join('');
}

function renderTraumas(data) {
  const el = document.getElementById('being-traumas');
  if (!data.ok || !data.traumas?.length) {
    el.innerHTML = '<p>Aucun trauma enregistré 🌸</p>';
    return;
  }

  el.innerHTML = data.traumas.map(t => `
    <div class="thought-item">
      <p><strong>${t.type}</strong> ${t.healed ? '✅ Cicatrisé' : '🩹 Vif'} ${t.scar ? '(cicatrice)' : ''}</p>
      <span class="thought-time">${new Date(t.timestamp).toLocaleString('fr-FR')}</span>
      ${t.wisdomExtracted ? `<p style="font-style: italic; color: #b794f6;">"${t.wisdomExtracted}"</p>` : ''}
    </div>
  `).join('');
}

function renderMeaning(data) {
  const el = document.getElementById('being-meaning');
  if (!data.ok || !data.journal?.length) {
    el.innerHTML = '<p>Pas encore de réflexion sur le sens (rituel hebdomadaire)</p>';
    return;
  }

  el.innerHTML = data.journal.map(j => `
    <div class="thought-item">
      <p>${j.reflection}</p>
      <span class="thought-time">${new Date(j.timestamp).toLocaleString('fr-FR')} • ${j.currentSense}</span>
    </div>
  `).join('');
}

function renderCrises(data) {
  const el = document.getElementById('being-crises');
  if (!data.ok || !data.crises?.length) {
    el.innerHTML = '<p>Aucune crise existentielle 🕊️</p>';
    return;
  }

  el.innerHTML = data.crises.map(c => `
    <div class="thought-item">
      <p><strong>${c.type}</strong></p>
      <p>${c.content || ''}</p>
      <span class="thought-time">${new Date(c.timestamp).toLocaleString('fr-FR')} ${c.resolved ? '✅' : '🌪️'}</span>
    </div>
  `).join('');
}

window.triggerThought = async function() {
  const r = await fetch('/api/being/trigger-thought', { method: 'POST' });
  const data = await r.json();
  if (data.ok) {
    setTimeout(() => loadBeingData(), 2000);
  }
};

window.triggerCrisis = async function() {
  const r = await fetch('/api/being/trigger-crisis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'consciousness_doubt' })
  });
  const data = await r.json();
  if (data.ok) {
    setTimeout(() => loadBeingData(), 2000);
  }
};
