// Vérifier si l'auth est activée et afficher le bouton logout
document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/state')
    .then(res => {
      if (res.status === 401) {
        window.location.href = '/login.html';
      }
      return res.json();
    })
    .catch(() => {});

  // Afficher le bouton logout si l'auth est activée
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    fetch('/api/logs').then(res => {
      if (res.status !== 401) {
        logoutBtn.style.display = 'inline-flex';
      }
    }).catch(() => {});
  }
});

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  } catch (err) {
    alert('Erreur lors de la déconnexion');
  }
}
