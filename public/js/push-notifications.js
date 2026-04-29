/* Web Push Notifications - Notifs sur téléphone/desktop */

const pushNotifications = {
  isSupported: false,
  serviceWorkerUrl: '/service-worker.js',
  notificationHistory: [],

  init() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

    if (!this.isSupported) {
      console.log('⚠️ Web Push non supporté sur ce navigateur');
      return;
    }

    this.registerServiceWorker();
    this.loadNotificationHistory();
  },

  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register(this.serviceWorkerUrl);
      console.log('✅ Service Worker enregistré');

      // Vérifier si déjà subscribed
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        console.log('✅ Déjà subscribed aux push notifications');
      }
    } catch (e) {
      console.error('Erreur Service Worker:', e.message);
    }
  },

  async requestPermission() {
    if (!this.isSupported) {
      toast('Push notifications non supportées', 'error');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast('Push notifications activées!', 'success');
      this.subscribeToPushNotifications();
      return true;
    } else {
      toast('Permission push notifications refusée', 'error');
      return false;
    }
  },

  async subscribeToPushNotifications() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VAPID_PUBLIC_KEY || 'FAKE_KEY'
        )
      });

      console.log('✅ Subscribed à push notifications');
      await this.saveSubscription(subscription);
    } catch (e) {
      console.error('Erreur subscription:', e.message);
    }
  },

  async showNotification(title, options = {}) {
    if (!this.isSupported) return;

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'brainexe-notification',
      requireInteraction: options.severity === 'CRITICAL'
    };

    const notification = new Notification(title, { ...defaultOptions, ...options });

    // Ajouter à l'historique
    this.addToHistory(title, options);

    // Click sur notif = focus le dashboard
    notification.onclick = () => window.focus();
  },

  playSound(type = 'default') {
    const sounds = {
      'default': '🔔',
      'alert': '🚨',
      'critical': '🔴'
    };

    // Utiliser Web Audio API pour un "beep"
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const frequency = type === 'critical' ? 800 : 400;
      const duration = type === 'critical' ? 500 : 200;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
      console.log('Son non disponible');
    }
  },

  addToHistory(title, options) {
    this.notificationHistory.unshift({
      title: title,
      message: options.body || '',
      timestamp: new Date(),
      read: false,
      severity: options.severity || 'info'
    });

    // Garder que 50 dernières
    if (this.notificationHistory.length > 50) {
      this.notificationHistory.pop();
    }

    localStorage.setItem('notif_history', JSON.stringify(this.notificationHistory));
  },

  loadNotificationHistory() {
    const saved = localStorage.getItem('notif_history');
    this.notificationHistory = saved ? JSON.parse(saved) : [];
  },

  getHistory(limit = 20) {
    return this.notificationHistory.slice(0, limit);
  },

  clearHistory() {
    this.notificationHistory = [];
    localStorage.removeItem('notif_history');
  },

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
  }
};

// Initialiser au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pushNotifications.init());
} else {
  pushNotifications.init();
}
