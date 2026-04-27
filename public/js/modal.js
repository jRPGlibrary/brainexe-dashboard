/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — modal.js
   Modales de confirmation et de création
   ═══════════════════════════════════════════════════ */

function confirmAction(title, message, onConfirm, { danger = false } = {}) {
  const body = `
    <p class="confirm-msg">${escapeHtml(message)}</p>
    ${danger ? `<div class="confirm-warn">⚠️ Cette action est irréversible.</div>` : ''}
  `;
  openModal(title, body, onConfirm, danger);
}

function openModal(title, body, onConfirm, danger = false) {
  const bg = document.getElementById('modal-bg');
  const confirmClass = danger ? 'btn btn-danger' : 'btn btn-primary';
  bg.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
      </div>
      ${body}
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Annuler</button>
        <button class="${confirmClass}" id="modal-confirm">Confirmer</button>
      </div>
    </div>
  `;
  bg.classList.add('active');
  document.getElementById('modal-confirm').onclick = async () => {
    try { await onConfirm(); closeModal(); } catch {}
  };
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('active');
}

function openCreateCategory() {
  openModal('Nouvelle catégorie', `
    <div class="field">
      <div class="field-label">Nom</div>
      <input class="input" id="m-name" placeholder="📁 ・ MA CATÉGORIE">
    </div>
  `, async () => {
    const name = document.getElementById('m-name').value.trim();
    if (!name) return toast('Nom requis', 'error');
    await api('/api/categories', { method: 'POST', body: { name } });
    toast('Catégorie créée', 'success');
  });
}

function openCreateChannel(categoryName = '') {
  const cats = (state.guild?.structure || [])
    .map(c => `<option ${c.category === categoryName ? 'selected' : ''}>${escapeHtml(c.category)}</option>`)
    .join('');
  openModal('Nouveau salon', `
    <div class="field">
      <div class="field-label">Nom</div>
      <input class="input" id="m-name" placeholder="mon-salon">
    </div>
    <div class="field">
      <div class="field-label">Catégorie</div>
      <select class="select" id="m-cat">${cats}</select>
    </div>
    <div class="field">
      <div class="field-label">Type</div>
      <select class="select" id="m-type">
        <option value="text">Texte</option>
        <option value="voice">Vocal</option>
      </select>
    </div>
    <div class="field">
      <div class="field-label">Topic (optionnel)</div>
      <input class="input" id="m-topic" placeholder="Description">
    </div>
  `, async () => {
    const name = document.getElementById('m-name').value.trim();
    const categoryName = document.getElementById('m-cat').value;
    const type = document.getElementById('m-type').value;
    const topic = document.getElementById('m-topic').value;
    if (!name) return toast('Nom requis', 'error');
    await api('/api/channels', { method: 'POST', body: { name, type, categoryName, topic } });
    toast('Salon créé', 'success');
  });
}

function openCreateRole() {
  openModal('Nouveau rôle', `
    <div class="field">
      <div class="field-label">Nom</div>
      <input class="input" id="m-name" placeholder="Mon rôle">
    </div>
    <div class="field">
      <div class="field-label">Couleur</div>
      <input class="input" type="color" id="m-color" value="#7c5cbf">
    </div>
    <div class="field">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="m-hoist">
        <span>Afficher séparément dans la liste</span>
      </label>
    </div>
  `, async () => {
    const name = document.getElementById('m-name').value.trim();
    const color = document.getElementById('m-color').value;
    const hoist = document.getElementById('m-hoist').checked;
    if (!name) return toast('Nom requis', 'error');
    await api('/api/roles', { method: 'POST', body: { name, color, hoist } });
    toast('Rôle créé', 'success');
  });
}
