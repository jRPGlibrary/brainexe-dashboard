/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-admin.js
   Panneau admin live : humeur, slot, TikTok, états internes
   ═══════════════════════════════════════════════════ */

function renderAdmin() {
  const sec = document.getElementById('section-admin');
  const a = state.admin || {};
  const moods = a.moods || ['energique', 'chill', 'hyperfocus', 'zombie'];
  const slots = a.slots || [];
  const internal = a.internalState || {};
  const currentMood = a.mood || 'chill';
  const currentSlotStatus = a.slot?.forced || a.slot?.status || 'active';
  const stateKeys = [
    { k: 'energy',          label: '⚡ Énergie',           hint: 'Dynamisme et élan' },
    { k: 'socialNeed',      label: '🗨️ Besoin social',     hint: 'Envie d\'interagir' },
    { k: 'calmNeed',        label: '🌿 Besoin de calme',   hint: 'Envie de tranquillité' },
    { k: 'stimulation',     label: '🎯 Stimulation',       hint: 'Intérêt / curiosité' },
    { k: 'mentalLoad',      label: '🧠 Charge mentale',    hint: 'Fatigue cognitive' },
    { k: 'recognitionNeed', label: '💖 Besoin reconnaissance', hint: 'Envie d\'être vue' },
  ];

  sec.innerHTML = `
    <div class="stats-grid mb-3">
      <div class="stat">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Membres</div>
        <div class="stat-value">${fmtNumber(a.memberCount)}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">🧠</div>
        <div class="stat-label">Slot</div>
        <div class="stat-value" style="font-size:18px">${escapeHtml(a.slot?.label || '—')}</div>
        <div class="stat-meta">${a.slot?.forced ? '🔒 Forcé' : 'Auto'}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">${moodEmoji(a.mood)}</div>
        <div class="stat-label">Humeur</div>
        <div class="stat-value" style="font-size:20px">${escapeHtml(a.mood || '—')}</div>
      </div>
      <div class="stat">
        <div class="stat-icon">📱</div>
        <div class="stat-label">TikTok</div>
        <div class="stat-value" style="font-size:20px">${a.tiktokLive ? '🔴 LIVE' : '⚫ Off'}</div>
      </div>
    </div>

    <div class="grid-2 mb-3">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🎭 Humeur du jour</div>
            <div class="card-subtitle">Appliqué instantanément · seed l'état interne</div>
          </div>
          <span class="save-indicator" id="save-mood">sauvé</span>
        </div>
        <div class="chip-group mb-2">
          ${moods.map(m => `
            <button class="chip ${m === currentMood ? 'active' : ''}" data-mood="${m}" onclick="setMood('${m}')">
              ${moodEmoji(m)} ${m}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-sm btn-block" onclick="rerollMood()">🎲 Nouvelle humeur aléatoire</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🧠 Slot forcé</div>
            <div class="card-subtitle">Force l'état du bot (sinon auto selon l'heure Paris)</div>
          </div>
          <span class="save-indicator" id="save-slot">sauvé</span>
        </div>
        <select class="select mb-2" onchange="setSlot(this.value)">
          <option value="">🕒 Automatique (selon l'heure)</option>
          ${slots.map(s => `
            <option value="${s.status}" ${s.status === a.slot?.forced ? 'selected' : ''}>
              ${escapeHtml(s.label)} (${s.status})
            </option>
          `).join('')}
        </select>
        ${a.slot?.forced ? `<button class="btn btn-sm btn-block" onclick="setSlot('')">🔓 Revenir à l'automatique</button>` : `<div class="text-sm text-muted text-right">Actuellement en mode automatique</div>`}
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div>
          <div class="card-title">📱 TikTok Live</div>
          <div class="card-subtitle">Override manuel du statut live</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="save-indicator" id="save-tiktok">sauvé</span>
          <label class="toggle">
            <input type="checkbox" ${a.tiktokLive ? 'checked' : ''} onchange="setTiktok(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="text-sm text-muted">
        ${a.tiktokLive ? '🔴 Le bot considère le live comme actif' : '⚫ Le bot considère le live comme hors ligne'}
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div>
          <div class="card-title">💫 État interne (live)</div>
          <div class="card-subtitle">Chaque slider → appliqué immédiatement au bot</div>
        </div>
        <span class="save-indicator" id="save-state">sauvé</span>
      </div>
      ${stateKeys.map(({ k, label, hint }) => `
        <div class="field">
          <div class="field-label">
            <span>${label}</span>
            <span class="field-hint">${hint}</span>
          </div>
          <div class="slider-wrap">
            <input type="range" class="slider" min="0" max="100" value="${internal[k] ?? 50}"
              oninput="document.getElementById('v-${k}').textContent = this.value"
              onchange="setStateValue('${k}', this.value)">
            <span class="slider-value" id="v-${k}">${internal[k] ?? 50}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">📊 Aperçu Discord live</div>
          <div class="card-subtitle">Reflet de la sidebar en temps réel</div>
        </div>
        <button class="btn btn-sm" onclick="refreshSidebarNow()">↻ Force refresh</button>
      </div>
      ${renderDiscordPreview(a)}
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <div>
          <div class="card-title">💰 Enregistrer une contribution</div>
          <div class="card-subtitle">Ajouter une donation au total du mois</div>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Montant (€)</label>
        <input type="number" id="donation-amount" class="input" placeholder="10.00" min="0.01" step="0.01">
      </div>
      <button class="btn btn-block" onclick="addDonation()">✓ Enregistrer</button>
    </div>
  `;
}

// ── Handlers admin live-save ──────────────────────────
async function setMood(mood) {
  try {
    await liveSave('/api/admin/mood', { mood }, 'save-mood');
    await loadAdmin();
  } catch {}
}

async function rerollMood() {
  try {
    await liveSave('/api/admin/mood/reroll', {}, 'save-mood');
    await loadAdmin();
    toast(`Nouvelle humeur : ${state.admin?.mood}`, 'success');
  } catch {}
}

async function setSlot(status) {
  try {
    await liveSave('/api/admin/slot', { status: status || null }, 'save-slot');
    await loadAdmin();
  } catch {}
}

async function setTiktok(live) {
  try {
    await liveSave('/api/admin/tiktok', { live }, 'save-tiktok');
    await loadAdmin();
  } catch {}
}

async function setStateValue(key, value) {
  try {
    await liveSave('/api/admin/state', { key, value: parseInt(value, 10) }, 'save-state');
    if (state.admin) {
      state.admin.internalState = { ...(state.admin.internalState || {}), [key]: parseInt(value, 10) };
      refreshTopbar();
    }
  } catch {}
}

async function refreshSidebarNow() {
  try {
    await api('/api/admin/sidebar/refresh', { method: 'POST' });
    toast('Sidebar Discord rafraîchie', 'success');
  } catch {}
}

async function addDonation() {
  const input = document.getElementById('donation-amount');
  const amount = parseFloat(input?.value || '0');
  if (!amount || amount <= 0) {
    toast('Montant invalide', 'error');
    return;
  }
  try {
    await api('/api/project/donation', { method: 'POST', body: { amount } });
    toast(`${amount}€ enregistrés ✓`, 'success');
    input.value = '';
    await loadFunding();
    renderAdmin();
  } catch (e) {
    toast(e.message || 'Erreur', 'error');
  }
}

async function loadAdmin() {
  try {
    const res = await api('/api/admin/status');
    state.admin = res;
    refreshTopbar();
    if (state.currentSection === 'admin' || state.currentSection === 'overview') {
      renderCurrentSection();
    }
  } catch (err) { /* handled */ }
}
