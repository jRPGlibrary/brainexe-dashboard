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

    const memberActivity = {};
    logs.forEach(log => {
      if (log.member) {
        memberActivity[log.member] = (memberActivity[log.member] || 0) + 1;
      }
    });

    const topMembers = Object.entries(memberActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

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
