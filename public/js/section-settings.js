/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-settings.js
   Synchronisation, auto-rôle, welcome, infos version
   ═══════════════════════════════════════════════════ */

function renderSettings() {
  const sec = document.getElementById('section-settings');
  const cfg = state.config || {};
  const w = cfg.welcome || {};
  sec.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🔄 Synchronisation</div>
            <div class="card-subtitle">Discord ↔ Fichier</div>
          </div>
        </div>
        <div class="flex gap-1">
          <button class="btn flex-1" onclick="action('sync/discord-to-file')">⬇ D → F</button>
          <button class="btn flex-1" onclick="action('sync/file-to-discord')">⬆ F → D</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🎭 Auto-rôle</div>
            <div class="card-subtitle">Rôle attribué à l'arrivée</div>
          </div>
          <span class="save-indicator" id="save-autorole">sauvé</span>
        </div>
        <input class="input" id="autorole-input" value="${escapeHtml(state.autoRole || '')}"
          placeholder="Nom du rôle"
          oninput="debouncedSaveAutoRole(this.value)">
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">👋 Welcome</div>
            <div class="card-subtitle">${w.enabled ? 'Actif' : 'Inactif'}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${w.enabled ? 'checked' : ''} onchange="toggleFeature('welcome', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <button class="btn btn-sm btn-block" onclick="action('welcome/test')">▶ Tester welcome</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🎨 Personnaliser le thème</div>
            <div class="card-subtitle">Couleurs et présets</div>
          </div>
        </div>
        <div id="theme-customizer-widget"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🔐 Double authentification (2FA)</div>
            <div class="card-subtitle">Sécurité supplémentaire</div>
          </div>
        </div>
        <button class="btn btn-block" onclick="showTotpSetup()">⚙️ Configurer 2FA</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">ℹ️ BrainEXE v0.9.6</div>
            <div class="card-subtitle">Dashboard sécurisé avec analytiques</div>
          </div>
        </div>
        <div class="text-sm text-muted flex flex-col gap-1">
          <div>⚡ Toute modification appliquée en direct</div>
          <div>🎛️ Contrôle total du bot (mood, slot, état, TikTok)</div>
          <div>🎨 3 thèmes + 6 présets + personnalisation hex</div>
          <div>🔐 Double authentification TOTP intégrée</div>
          <div>📊 Sidebar Discord temps réel + analytiques</div>
          <div>💾 Sauvegarde/restauration automatique</div>
          <div>📱 Notifications push desktop/mobile</div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const widget = document.getElementById('theme-customizer-widget');
    if (widget) {
      widget.innerHTML = themeCustomizer.renderThemeSelector();
    }
  }, 100);
}

let _autoRoleTimer;
function debouncedSaveAutoRole(value) {
  clearTimeout(_autoRoleTimer);
  _autoRoleTimer = setTimeout(async () => {
    try {
      await liveSave('/api/autorole', { roleName: value }, 'save-autorole');
      state.autoRole = value;
    } catch {}
  }, 400);
}

function showTotpSetup() {
  const modal = document.getElementById('modal-bg');
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.cssText = 'max-width: 500px; max-height: 80vh; overflow-y: auto;';
  content.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">🔐 Configuration 2FA</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="totp-setup">
        <div class="totp-step">
          <div class="totp-step-title">
            <span class="totp-step-number">1</span>
            Télécharger une appli authenticateur
          </div>
          <div style="font-size: 12px; color: var(--text-3); line-height: 1.6;">
            Google Authenticator, Microsoft Authenticator, Authy, ou 1Password
          </div>
        </div>

        <div class="totp-step">
          <div class="totp-step-title">
            <span class="totp-step-number">2</span>
            Scanner le QR code
          </div>
          <div class="qr-code-container" id="totp-qr">Génération en cours…</div>
          <div style="font-size: 11px; color: var(--text-3); margin-top: 8px;">
            Ou entrer manuellement cette clé:
          </div>
          <div class="secret-display" id="totp-secret">Génération en cours…</div>
        </div>

        <div class="totp-step">
          <div class="totp-step-title">
            <span class="totp-step-number">3</span>
            Codes de secours
          </div>
          <div style="font-size: 11px; color: var(--text-3); margin-bottom: 8px;">
            Gardez ces codes en lieu sûr pour accès d'urgence:
          </div>
          <div class="backup-codes" id="totp-backup">Génération en cours…</div>
        </div>

        <div class="totp-step">
          <div class="totp-step-title">
            <span class="totp-step-number">4</span>
            Confirmer le code à 6 chiffres
          </div>
          <input type="text" class="totp-input" id="totp-code" placeholder="000000" maxlength="6"
            oninput="this.value = this.value.replace(/[^0-9]/g, '')">
          <button class="btn btn-primary btn-block" onclick="verifyTotpSetup()">
            ✅ Confirmer et activer
          </button>
        </div>

        <div class="totp-warning">
          ⚠️ <strong>Important:</strong> Sauvegardez vos codes de secours. Sans eux, vous risquez d'être bloqué si vous perdez accès à votre authenticateur.
        </div>
      </div>
    </div>
  `;

  modal.appendChild(content);
  modal.classList.add('active');

  generateTotpQr();
}

async function generateTotpQr() {
  try {
    const response = await fetch('/api/auth/2fa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@brainexe' })
    });

    if (!response.ok) throw new Error('Erreur génération');

    const data = await response.json();
    if (data.ok) {
      document.getElementById('totp-secret').textContent = data.secret;
      document.getElementById('totp-backup').textContent = data.backupCodes.join('\n');

      const qrCode = await QRCode.toDataURL(data.qrCode);
      document.getElementById('totp-qr').innerHTML = `<img src="${qrCode}" alt="QR Code">`;

      window.totpSetup = { secret: data.secret, backupCodes: data.backupCodes };
    }
  } catch (e) {
    toast(`Erreur: ${e.message}`, 'error');
    closeModal();
  }
}

async function verifyTotpSetup() {
  const code = document.getElementById('totp-code').value;
  if (code.length !== 6) {
    toast('Code à 6 chiffres requis', 'error');
    return;
  }

  try {
    const response = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: window.totpSetup?.secret,
        token: code
      })
    });

    const data = await response.json();
    if (data.ok) {
      toast('✅ 2FA activé avec succès!', 'success');
      closeModal();
    } else {
      toast(`❌ ${data.error || 'Code invalide'}`, 'error');
    }
  } catch (e) {
    toast(`Erreur: ${e.message}`, 'error');
  }
}
