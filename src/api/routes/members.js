const { Router } = require('express');
const shared = require('../../shared');
const { GUILD_ID } = require('../../config');
const { readGuildState } = require('../../discord/sync');
const { auditLog } = require('../../audit');
const { discordActionLimiter } = require('../rateLimits');

const router = Router();

router.get('/members', async (req, res) => {
  try {
    const state = shared.guildCache || await readGuildState();
    const members = state.members || [];
    if (!shared.mongoDb) return res.json({ ok: true, members });
    const bondsMap = new Map();
    const bonds = await shared.mongoDb.collection('memberBonds').find({}).toArray();
    bonds.forEach(b => bondsMap.set(b.userId, b));
    const membersWithBonds = members.map(m => ({ ...m, bond: bondsMap.get(m.id) || null }));
    res.json({ ok: true, members: membersWithBonds });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/members/profiles', async (req, res) => {
  if (!shared.mongoDb) return res.json({ ok: false, error: 'MongoDB non connecté' });
  try {
    const profiles = await shared.mongoDb.collection('memberProfiles').find({}).sort({ interactionCount: -1 }).limit(50).toArray();
    res.json({ ok: true, profiles });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/members/:id/mute', discordActionLimiter, async (req, res) => {
  const { duration } = req.body;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(req.params.id);
    if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' });
    await member.timeout(duration && duration > 0 ? Math.min(duration * 60 * 1000, 28 * 24 * 60 * 60 * 1000) : null, 'Dashboard');
    auditLog('member.mute', { id: req.params.id, username: member.user?.username, duration: duration || 0 });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/members/:id/kick', discordActionLimiter, async (req, res) => {
  const { reason } = req.body;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(req.params.id);
    if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' });
    const username = member.user?.username;
    await member.kick(reason || 'Dashboard');
    auditLog('member.kick', { id: req.params.id, username, reason: reason || '' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/members/:id/ban', discordActionLimiter, async (req, res) => {
  const { reason, deleteMessageDays } = req.body;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.bans.create(req.params.id, {
      reason: reason || 'Dashboard',
      deleteMessageSeconds: Math.min((deleteMessageDays || 0) * 86400, 604800),
    });
    auditLog('member.ban', { id: req.params.id, reason: reason || '' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/members/:id/roles', discordActionLimiter, async (req, res) => {
  const { addRoles, removeRoles } = req.body;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();
    const member = await guild.members.fetch(req.params.id);
    if (addRoles?.length) await member.roles.add(addRoles, 'Dashboard');
    if (removeRoles?.length) await member.roles.remove(removeRoles, 'Dashboard');
    res.json({
      ok: true,
      roles: member.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0') })),
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
