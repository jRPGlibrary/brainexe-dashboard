const express = require('express');
const router = express.Router();
const shared = require('../../shared');

router.get('/mod/logs', async (req, res) => {
  if (!shared.mongoDb) return res.json({ ok: true, logs: [] });
  try {
    const logs = await shared.mongoDb.collection('modActions')
      .find({}).sort({ timestamp: -1 }).limit(100).toArray();
    res.json({ ok: true, logs });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/mod/members', async (req, res) => {
  if (!shared.mongoDb) return res.json({ ok: true, events: [] });
  try {
    const events = await shared.mongoDb.collection('memberEvents')
      .find({}).sort({ timestamp: -1 }).limit(100).toArray();
    res.json({ ok: true, events });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
