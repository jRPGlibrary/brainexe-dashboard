/* Monitoring - Alertes Discord en cas de problème */

const monitoring = {
  config: {
    errorThreshold: 10,        // alert si > 10 erreurs par minute
    checkInterval: 60000,      // vérifier chaque minute
    webhookUrl: process.env.DISCORD_WEBHOOK_ALERTS || null
  },

  async initialize() {
    if (!this.config.webhookUrl) {
      console.log('⚠️ DISCORD_WEBHOOK_ALERTS non configuré - Alertes désactivées');
      return;
    }
    setInterval(() => this.checkHealth(), this.config.checkInterval);
  },

  async checkHealth() {
    const alerts = [];

    // Vérifier les erreurs (du système de logs)
    const recentErrors = this.getRecentErrors();
    if (recentErrors >= this.config.errorThreshold) {
      alerts.push({
        type: 'ERROR_SPIKE',
        message: `🔴 ${recentErrors} erreurs dans la dernière minute!`,
        severity: 'HIGH'
      });
    }

    // Vérifier MongoDB
    const mongoStatus = await this.checkMongoDB();
    if (!mongoStatus.ok) {
      alerts.push({
        type: 'MONGODB_DOWN',
        message: `🗄️ MongoDB problème: ${mongoStatus.error}`,
        severity: 'CRITICAL'
      });
    }

    // Vérifier Discord Bot
    const botStatus = this.checkBotStatus();
    if (!botStatus.ok) {
      alerts.push({
        type: 'BOT_DOWN',
        message: `🤖 Discord Bot offline!`,
        severity: 'CRITICAL'
      });
    }

    // Envoyer les alertes à Discord
    for (const alert of alerts) {
      await this.sendDiscordAlert(alert);
    }

    return alerts;
  },

  getRecentErrors() {
    // À intégrer avec le système de logs existant
    // Pour maintenant, retourner 0
    return 0;
  },

  async checkMongoDB() {
    try {
      // À intégrer avec connexion MongoDB existante
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  checkBotStatus() {
    // À intégrer avec Discord client existant
    // Pour maintenant, checker si bot est login
    return { ok: true };
  },

  async sendDiscordAlert(alert) {
    if (!this.config.webhookUrl) return;

    const colors = {
      'HIGH': 16711680,      // Rouge
      'CRITICAL': 16711680,  // Rouge intense
      'WARNING': 16776960    // Orange
    };

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '⚠️ Alerte Dashboard',
            description: alert.message,
            color: colors[alert.severity] || 9807270,
            timestamp: new Date(),
            footer: { text: 'BrainEXE Monitoring' }
          }]
        })
      });
    } catch (e) {
      console.error('Erreur envoi alerte Discord:', e.message);
    }
  },

  // Interface pour configurer les seuils
  setErrorThreshold(value) {
    this.config.errorThreshold = value;
  },

  setWebhookUrl(url) {
    this.config.webhookUrl = url;
  }
};

module.exports = monitoring;
