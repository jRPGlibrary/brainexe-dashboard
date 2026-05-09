/* Analytics Dashboard - Routes */

const router = require('express').Router();
const { readGuildState } = require('../../discord/sync');
const shared = require('../../shared');

router.get('/analytics', async (req, res) => {
  try {
    const state = await readGuildState();
    const logs = shared.changeLog || [];

    const activityByHour = Array(24).fill(0);
    logs.forEach(log => {
      if (log.ts) {
        const hour = new Date(log.ts).getHours();
        activityByHour[hour]++;
      }
    });

    // Top membres depuis memberProfiles (interactionCount réel)
    // Les logs n'ont pas de champ member — on utilise MongoDB
    let topMembers = [];
    if (shared.mongoDb) {
      try {
        const profiles = await shared.mongoDb.collection('memberProfiles')
          .find({ interactionCount: { $gt: 0 } })
          .sort({ interactionCount: -1 })
          .limit(10)
          .toArray();
        topMembers = profiles.map(p => ({
          name: p.username || p.userId || 'Inconnu',
          count: p.interactionCount || 0,
        }));
      } catch (_) {}
    }

    res.json({
      ok: true,
      analytics: {
        activityByHour,
        topMembers,
        totalLogs: logs.length,
        totalMembers: state.members?.length || 0,
        exported: new Date()
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/analytics/export', async (req, res) => {
  try {
    const state = await readGuildState();
    const logs = shared.changeLog || [];

    const data = {
      exported: new Date(),
      totalLogs: logs.length,
      totalMembers: state.members?.length || 0,
      activityByHour: Array(24).fill(0).map((_, i) => {
        const hour = logs.filter(l => l.ts && new Date(l.ts).getHours() === i).length;
        return { hour: i, count: hour };
      })
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.json');
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
