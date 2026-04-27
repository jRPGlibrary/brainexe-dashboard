const { Router } = require('express');
const { pushLog } = require('../../logger');
const { startAnecdoteCron, postDailyAnecdote } = require('../../features/anecdotes');
const { startActusCron, postBiMonthlyActus } = require('../../features/actus');
const { postRandomConversation, replyToConversations } = require('../../features/conversations');
const { postMorningGreeting, postGoodnight, postNightWakeup } = require('../../features/greetings');
const { runDriftCheck } = require('../../features/drift');
const { claudeLimiter } = require('../rateLimits');

const router = Router();

// Actions bot — toutes limitées à 5/min car elles déclenchent des appels Claude
router.post('/anecdote', claudeLimiter, (req, res) => { postDailyAnecdote(); res.json({ ok: true }); });
router.post('/actus', claudeLimiter, (req, res) => { postBiMonthlyActus(req.body?.force === true); res.json({ ok: true }); });
router.post('/conversation', claudeLimiter, (req, res) => { postRandomConversation(); res.json({ ok: true }); });
router.post('/conversation/reply', claudeLimiter, (req, res) => { replyToConversations(); res.json({ ok: true }); });
router.post('/morning', claudeLimiter, (req, res) => { postMorningGreeting(); res.json({ ok: true }); });
router.post('/goodnight', claudeLimiter, (req, res) => { postGoodnight(); res.json({ ok: true }); });
router.post('/nightwakeup', claudeLimiter, (req, res) => { postNightWakeup(); res.json({ ok: true }); });
router.post('/drift/check', (req, res) => { pushLog('SYS', 'Drift check manuel'); runDriftCheck(); res.json({ ok: true }); });

module.exports = router;
