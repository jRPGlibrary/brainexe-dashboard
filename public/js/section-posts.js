/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-posts.js
   Envoi de messages manuels dans un salon Discord
   ═══════════════════════════════════════════════════ */

function renderPosts() {
  const sec = document.getElementById('section-posts');
  const g = state.guild || {};
  const options = [];
  (g.structure || []).forEach(cat => {
    (cat.channels || []).forEach(ch => {
      if (ch.type !== 'voice') options.push(`<option value="${ch.id}">#${escapeHtml(ch.name)} — ${escapeHtml(cat.category)}</option>`);
    });
  });
  sec.innerHTML = `
    <div class="grid-2" style="max-width:960px">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">📝 Poster un message</div>
            <div class="card-subtitle">Texte simple ou embed</div>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Salon cible</div>
          <select class="select" id="post-channel">${options.join('')}</select>
        </div>
        <div class="field">
          <div class="field-label">Format</div>
          <div class="chip-group" id="post-format">
            <button class="chip active" data-fmt="text" onclick="switchPostFormat('text')">Texte</button>
            <button class="chip" data-fmt="embed" onclick="switchPostFormat('embed')">Embed</button>
          </div>
        </div>
        <div class="field hidden" id="post-title-field">
          <div class="field-label">Titre (embed)</div>
          <input class="input" id="post-title" placeholder="Titre de l'embed" oninput="updatePostPreview()">
        </div>
        <div class="field">
          <div class="field-label">Contenu</div>
          <textarea class="textarea" id="post-content" placeholder="Ton message…" oninput="updatePostPreview()"></textarea>
        </div>
        <button class="btn btn-primary btn-block" onclick="sendPost()">📤 Envoyer</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">👁️ Aperçu</div>
            <div class="card-subtitle">Rendu Discord</div>
          </div>
        </div>
        <div id="post-preview"><div class="empty text-sm">Tape un message pour voir l'aperçu</div></div>
      </div>
    </div>
  `;
}

function switchPostFormat(fmt) {
  document.querySelectorAll('#post-format .chip').forEach(c => c.classList.toggle('active', c.dataset.fmt === fmt));
  document.getElementById('post-title-field').classList.toggle('hidden', fmt !== 'embed');
  updatePostPreview();
}

function updatePostPreview() {
  const preview = document.getElementById('post-preview');
  if (!preview) return;
  const content = document.getElementById('post-content')?.value || '';
  const fmt = document.querySelector('#post-format .chip.active')?.dataset.fmt;
  const title = document.getElementById('post-title')?.value || '';
  if (!content.trim()) {
    preview.innerHTML = '<div class="empty text-sm">Tape un message pour voir l\'aperçu</div>';
    return;
  }
  if (fmt === 'embed') {
    preview.innerHTML = `
      <div class="embed-preview">
        ${title ? `<div class="ep-title">${escapeHtml(title)}</div>` : ''}
        <div class="ep-desc">${escapeHtml(content)}</div>
        <div class="ep-footer">BrainEXE · Aujourd'hui</div>
      </div>`;
  } else {
    preview.innerHTML = `<div class="plain-preview">${escapeHtml(content)}</div>`;
  }
}

async function sendPost() {
  const channelId = document.getElementById('post-channel').value;
  const content = document.getElementById('post-content').value;
  const asEmbed = document.querySelector('#post-format .chip.active')?.dataset.fmt === 'embed';
  const embedTitle = asEmbed ? document.getElementById('post-title').value : '';
  if (!content.trim()) return toast('Contenu vide', 'error');
  try {
    await api('/api/post', { method: 'POST', body: { channelId, content, asEmbed, embedTitle } });
    toast('Message envoyé', 'success');
    document.getElementById('post-content').value = '';
  } catch {}
}
