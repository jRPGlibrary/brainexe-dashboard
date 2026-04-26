/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — section-funding.js
   Soutien projet : progression, coûts, donation
   ═══════════════════════════════════════════════════ */

async function loadFunding() {
  try {
    const data = await api('/api/project/funding');
    state.funding = data;
    refreshTopbar();
  } catch (e) {
    console.error('Funding load error:', e);
  }
}

function renderFunding() {
  const sec = document.getElementById('section-funding');
  const f = state.funding || {};
  const donated = f.totalDonated ?? 0;
  const total = f.totalCosts ?? 0;
  const percent = total > 0 ? Math.min(100, (donated / total) * 100) : 0;

  sec.innerHTML = `
    <div class="card">
      <h3>💰 Soutien du projet</h3>
      <p style="color:var(--text-2);margin-top:8px;line-height:1.6">
        Brainee a besoin de serveurs, d'API, et de stockage pour fonctionner.
        Chaque euro collecté aide à couvrir ces frais et à faire grandir le projet.
      </p>

      <div style="margin-top:32px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-weight:600">Progression ce mois</span>
          <span style="color:var(--accent)">${donated.toFixed(2)}€ / ${total.toFixed(2)}€</span>
        </div>
        <div style="background:var(--surface-hover);border-radius:8px;height:20px;overflow:hidden">
          <div style="background:var(--accent);height:100%;width:${percent}%;transition:width 0.3s"></div>
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--text-3)">
          ${percent.toFixed(0)}% · ${(total - donated).toFixed(2)}€ restant cette mois
        </div>
      </div>

      <div style="margin-top:32px;padding:20px;background:var(--accent-bg);border-radius:12px;border-left:4px solid var(--accent)">
        <div style="font-weight:600;margin-bottom:12px">🎁 Tu veux contribuer ?</div>
        <p style="color:var(--text-2);margin-bottom:12px">
          Les contributions se font sans engagement, de manière libre et directe via PayPal.
        </p>
        <a href="https://paypal.me/MatthieuMAUBERNARD" target="_blank" style="
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:10px 16px;
          background:var(--accent);
          color:white;
          border-radius:6px;
          font-weight:600;
          text-decoration:none;
        ">
          💳 Soutenir via PayPal
        </a>
      </div>

      <div style="margin-top:32px;padding:20px;background:var(--surface-active);border-radius:12px">
        <div style="font-weight:600;margin-bottom:16px">📊 Détail des coûts</div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>Serveur</span>
          <span>${(f.costs?.server || 0).toFixed(2)}€</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>API Claude</span>
          <span>${(f.costs?.claude || 0).toFixed(2)}€</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>Stockage</span>
          <span>${(f.costs?.storage || 0).toFixed(2)}€</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;font-weight:600;color:var(--accent)">
          <span>Total</span>
          <span>${total.toFixed(2)}€</span>
        </div>
      </div>
    </div>
  `;
}
