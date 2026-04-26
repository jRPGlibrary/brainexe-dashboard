/* ═══════════════════════════════════════════════════
   BRAINEXE DASHBOARD — actions.js
   Actions rapides : tests, suppression salons/rôles
   ═══════════════════════════════════════════════════ */

async function action(endpoint) {
  try {
    await api(`/api/${endpoint}`, { method: 'POST' });
    toast(`✓ ${endpoint}`, 'success');
  } catch {}
}

async function deleteChannel(id, name) {
  confirmAction(`Supprimer #${name}`, `Le salon #${name} sera supprimé définitivement de Discord.`, async () => {
    await api(`/api/channels/${id}`, { method: 'DELETE' });
    toast('Salon supprimé', 'success');
  }, { danger: true });
}

async function deleteRole(id, name) {
  confirmAction(`Supprimer le rôle "${name}"`, `Le rôle "${name}" sera supprimé définitivement de Discord.`, async () => {
    await api(`/api/roles/${id}`, { method: 'DELETE' });
    toast('Rôle supprimé', 'success');
  }, { danger: true });
}
