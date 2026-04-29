/* Monitoring & Health - Routes */

const router = require('express').Router();
const monitoring = require('../monitoring');

router.get('/monitoring/health', async (req, res) => {
  try {
    const health = await monitoring.checkHealth();
    res.json({ ok: true, health });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/monitoring/status', async (req, res) => {
  try {
    const mongoStatus = await monitoring.checkMongoDB();
    const botStatus = await monitoring.checkBotStatus();
    res.json({
      ok: true,
      mongodb: mongoStatus,
      bot: botStatus,
      timestamp: new Date()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/monitoring/config', (req, res) => {
  try {
    const { webhookUrl, errorThreshold, checkInterval } = req.body;

    monitoring.config = {
      ...monitoring.config,
      ...(webhookUrl && { webhookUrl }),
      ...(errorThreshold && { errorThreshold }),
      ...(checkInterval && { checkInterval })
    };

    res.json({ ok: true, config: monitoring.config });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
