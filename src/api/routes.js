const fs = require('fs');
const path = require('path');
const discord_js = require('discord.js');
const ChannelType = discord_js.ChannelType;
const EmbedBuilder = discord_js.EmbedBuilder || discord_js.MessageEmbed;
const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID } = require('../config');
const { saveConfig } = require('../botConfig');
const { readGuildState, syncDiscordToFile, syncFileToDiscord } = require('../discord/sync');
const { startAnecdoteCron, postDailyAnecdote } = require('../features/anecdotes');
const { startActusCron, postBiMonthlyActus } = require('../features/actus');
const { postRandomConversation, replyToConversations } = require('../features/conversations');
const { postMorningGreeting, postGoodnight, postNightWakeup } = require('../features/greetings');
const { runDriftCheck } = require('../features/drift');
const { connectToTikTokLive } = require('../features/tiktok');
const { getChannelMemory } = require('../db/channelMem');
const { getDmHistory } = require('../db/dmHistory');
const { getCurrentSlot, getParisHour, getParisDay, setForcedSlot, getForcedSlot, getAllSlots, WEEKDAY_SLOTS } = require('../bot/scheduling');
const { getDailyMood, setDailyMood, MOODS, refreshDailyMood } = require('../bot/mood');
const { getInternalState, getEmotionStack, getTemperament, setInternalStateValue } = require('../bot/emotions');
const { getMemberBond } = require('../db/memberBonds');
const { updateSidebarChannels } = require('../features/sidebar');
const { sleep } = require('../utils');
const { getFundingData, addDonation, calculateTotalCosts, updateBotStatus } = require('../project/funding');

function registerRoutes(app) {
  // State & logs
  app.get('/api/state', async (req, res) => { try { const state = await readGuildState(); res.json({ ok: true, state, stats: shared.syncStats, uptime: Date.now() - shared.syncStats.startTime }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.get('/api/logs', (req, res) => res.json({ ok: true, logs: shared.changeLog }));
  app.get('/api/config', (req, res) => res.json({ ok: true, config: shared.botConfig }));

  app.post('/api/config', (req, res) => {
    try {
      const { section, data } = req.body;
      if (!section || !data) return res.status(400).json({ ok: false, error: 'section + data requis' });
      if (!shared.botConfig[section]) return res.status(400).json({ ok: false, error: `Section inconnue` });
      shared.botConfig[section] = { ...shared.botConfig[section], ...data };
      saveConfig();
      const { startConvCron } = require('../crons');
      if (section === 'anecdote') startAnecdoteCron();
      if (section === 'actus') startActusCron();
      if (section === 'conversations') startConvCron();
      pushLog('SYS', `Config "${section}" mise à jour`, 'success');
      broadcast('configUpdate', { section, data: shared.botConfig[section] });
      res.json({ ok: true, config: shared.botConfig[section] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Sync
  app.post('/api/sync/discord-to-file', async (req, res) => { await syncDiscordToFile('Forced'); res.json({ ok: true }); });
  app.post('/api/sync/file-to-discord', async (req, res) => { await syncFileToDiscord(); res.json({ ok: true }); });

  // Channels & roles management
  app.post('/api/categories', async (req, res) => { const { name } = req.body; if (!name) return res.status(400).json({ ok: false, error: 'name requis' }); try { const guild = await shared.discord.guilds.fetch(GUILD_ID); const cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Dashboard' }); res.json({ ok: true, id: cat.id }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.post('/api/channels', async (req, res) => { const { name, type, categoryName, topic } = req.body; try { const guild = await shared.discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const cat = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory); const chType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText; const opts = { name, type: chType, reason: 'Dashboard' }; if (cat) opts.parent = cat.id; if (topic) opts.topic = topic; const ch = await guild.channels.create(opts); res.json({ ok: true, id: ch.id }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.delete('/api/channels/:id', async (req, res) => { try { const guild = await shared.discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const ch = guild.channels.cache.get(req.params.id); if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' }); await ch.delete('Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.patch('/api/channels/:id', async (req, res) => { const { name, topic } = req.body; try { const guild = await shared.discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const ch = guild.channels.cache.get(req.params.id); if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' }); const opts = {}; if (name) opts.name = name; if (topic !== undefined) opts.topic = topic; await ch.edit(opts, 'Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.post('/api/roles', async (req, res) => { const { name, color, hoist } = req.body; try { const guild = await shared.discord.guilds.fetch(GUILD_ID); const role = await guild.roles.create({ name, color: parseInt((color || '#7c5cbf').replace('#', ''), 16), hoist: !!hoist, permissions: [], reason: 'Dashboard' }); res.json({ ok: true, id: role.id }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.delete('/api/roles/:id', async (req, res) => { try { const guild = await shared.discord.guilds.fetch(GUILD_ID); await guild.roles.fetch(); const role = guild.roles.cache.get(req.params.id); if (!role) return res.status(404).json({ ok: false, error: 'Rôle introuvable' }); await role.delete('Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

  // Backup
  app.post('/api/backup', async (req, res) => { try { const state = await readGuildState(); const fn = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`; fs.writeFileSync(fn, JSON.stringify(state, null, 2), 'utf8'); pushLog('SYS', `Backup : ${fn}`, 'success'); res.json({ ok: true, filename: fn }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.get('/api/backups', (req, res) => { try { const files = fs.readdirSync('.').filter(f => f.startsWith('backup_') && f.endsWith('.json')).sort().reverse().map(f => { const s = fs.statSync(f); return { name: f, date: s.mtime.toLocaleString('fr-FR'), size: s.size }; }); res.json({ ok: true, backups: files }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

  // Auto-role
  app.get('/api/autorole', (req, res) => res.json({ ok: true, roleName: shared.AUTO_ROLE_NAME }));
  app.post('/api/autorole', (req, res) => { const { roleName } = req.body; if (!roleName) return res.status(400).json({ ok: false, error: 'roleName requis' }); shared.AUTO_ROLE_NAME = roleName; pushLog('SYS', `Auto-role → "${shared.AUTO_ROLE_NAME}"`, 'success'); broadcast('config', { autoRole: shared.AUTO_ROLE_NAME }); res.json({ ok: true, roleName: shared.AUTO_ROLE_NAME }); });

  // Bot actions
  app.post('/api/anecdote', async (req, res) => { postDailyAnecdote(); res.json({ ok: true }); });
  app.post('/api/actus', async (req, res) => { postBiMonthlyActus(req.body?.force === true); res.json({ ok: true }); });
  app.post('/api/conversation', async (req, res) => { postRandomConversation(); res.json({ ok: true }); });
  app.post('/api/conversation/reply', async (req, res) => { replyToConversations(); res.json({ ok: true }); });
  app.post('/api/morning', async (req, res) => { postMorningGreeting(); res.json({ ok: true }); });
  app.post('/api/goodnight', async (req, res) => { postGoodnight(); res.json({ ok: true }); });
  app.post('/api/nightwakeup', async (req, res) => { postNightWakeup(); res.json({ ok: true }); });
  app.post('/api/drift/check', async (req, res) => { pushLog('SYS', 'Drift check manuel'); runDriftCheck(); res.json({ ok: true }); });

  // Slot & mood
  app.get('/api/slot', (req, res) => { const slot = getCurrentSlot(); const d = getParisDay(); res.json({ ok: true, slot, hour: Math.round(getParisHour() * 100) / 100, day: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d], mood: getDailyMood() }); });

  // Channel memory
  app.get('/api/channel-memory/:id', async (req, res) => { try { const mem = await getChannelMemory(req.params.id); res.json({ ok: true, memory: mem }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.get('/api/channel-memory', async (req, res) => { if (!shared.mongoDb) return res.json({ ok: false, error: 'MongoDB non connecté' }); try { const all = await shared.mongoDb.collection('channelMemory').find({}).toArray(); res.json({ ok: true, memories: all }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

  // DM history
  app.get('/api/dm-history/:userId', async (req, res) => { try { const h = await getDmHistory(req.params.userId); res.json({ ok: true, history: h }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

  // Channel directory
  app.get('/api/channel-directory', async (req, res) => { if (!shared.mongoDb) return res.json([]); try { const docs = await shared.mongoDb.collection('channelDirectory').find({}).toArray(); res.json(docs); } catch (e) { res.status(500).json({ error: e.message }); } });

  // Emotional state (v2.1.0)
  app.get('/api/emotions/state', (req, res) => {
    res.json({ ok: true, internalState: getInternalState(), temperament: getTemperament(), emotionStack: getEmotionStack() });
  });
  app.get('/api/emotions/bonds', async (req, res) => {
    if (!shared.mongoDb) return res.json({ ok: false, error: 'MongoDB non connecté' });
    try {
      const bonds = await shared.mongoDb.collection('memberBonds').find({}).sort({ baseAttachment: -1 }).limit(50).toArray();
      res.json({ ok: true, bonds });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
  app.get('/api/emotions/bonds/:userId', async (req, res) => {
    try {
      const bond = await getMemberBond(req.params.userId);
      if (!bond) return res.status(404).json({ ok: false, error: 'Aucun lien trouvé' });
      res.json({ ok: true, bond });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // Welcome test
  app.post('/api/welcome/test', async (req, res) => { const cfg = shared.botConfig.welcome; if (!cfg.enabled) return res.json({ ok: false, error: 'Welcome désactivé' }); try { const guild = await shared.discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const channel = guild.channels.cache.get(cfg.channelId); if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' }); const phrase = cfg.messages[Math.floor(Math.random() * cfg.messages.length)]; const embed = new EmbedBuilder().setColor(0x7c5cbf).setTitle('👾 Bienvenue TestMembre ! [TEST]').setDescription(`${phrase}\n\n📋 → <#1481028175474589827>\n🎭 → <#1481028181485027471>`).setFooter({ text: 'BrainEXE • Test' }).setTimestamp(); await channel.send({ content: '👋 **[TEST]**', embeds: [embed] }); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

  // TikTok test
  app.post('/api/tiktok/test', async (req, res) => { connectToTikTokLive(); res.json({ ok: true }); });

  // Manual post
  app.post('/api/post', async (req, res) => { const { channelId, content, asEmbed, embedTitle } = req.body; if (!channelId || !content) return res.status(400).json({ ok: false, error: 'channelId + content requis' }); try { const guild = await shared.discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const channel = guild.channels.cache.get(channelId); if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' }); if (asEmbed) { const embed = new EmbedBuilder().setColor(0x7c5cbf).setDescription(content).setFooter({ text: 'BrainEXE' }).setTimestamp(); if (embedTitle) embed.setTitle(embedTitle); await channel.send({ embeds: [embed] }); } else await channel.send(content); pushLog('API', `Post manuel → ${channel.name}`, 'success'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

  // Members
  app.get('/api/members/profiles', async (req, res) => { if (!shared.mongoDb) return res.json({ ok: false, error: 'MongoDB non connecté' }); try { const profiles = await shared.mongoDb.collection('memberProfiles').find({}).sort({ interactionCount: -1 }).limit(50).toArray(); res.json({ ok: true, profiles }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.post('/api/members/:id/mute', async (req, res) => { const { duration } = req.body; try { const guild = await shared.discord.guilds.fetch(GUILD_ID); const member = await guild.members.fetch(req.params.id); if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' }); await member.timeout(duration && duration > 0 ? Math.min(duration * 60 * 1000, 28 * 24 * 60 * 60 * 1000) : null, 'Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.post('/api/members/:id/kick', async (req, res) => { const { reason } = req.body; try { const guild = await shared.discord.guilds.fetch(GUILD_ID); const member = await guild.members.fetch(req.params.id); if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' }); await member.kick(reason || 'Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.post('/api/members/:id/ban', async (req, res) => { const { reason, deleteMessageDays } = req.body; try { const guild = await shared.discord.guilds.fetch(GUILD_ID); await guild.bans.create(req.params.id, { reason: reason || 'Dashboard', deleteMessageSeconds: Math.min((deleteMessageDays || 0) * 86400, 604800) }); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.patch('/api/members/:id/roles', async (req, res) => { const { addRoles, removeRoles } = req.body; try { const guild = await shared.discord.guilds.fetch(GUILD_ID); await guild.roles.fetch(); const member = await guild.members.fetch(req.params.id); if (addRoles?.length) await member.roles.add(addRoles, 'Dashboard'); if (removeRoles?.length) await member.roles.remove(removeRoles, 'Dashboard'); res.json({ ok: true, roles: member.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0') })) }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
  app.get('/api/members', async (req, res) => { try { const state = shared.guildCache || await readGuildState(); res.json({ ok: true, members: state.members || [] }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

  // ═════════════════════════════════════════════════════════
  // ADMIN PANEL — Live control (v2.2.0)
  // ═════════════════════════════════════════════════════════

  // État complet pour le dashboard
  app.get('/api/admin/status', async (req, res) => {
    try {
      const guild = await shared.discord.guilds.fetch(GUILD_ID).catch(() => null);
      const memberCount = guild?.memberCount ?? 0;
      const slot = getCurrentSlot();
      const mood = getDailyMood();
      const internalState = getInternalState();
      res.json({
        ok: true,
        memberCount,
        slot: { label: slot.label, status: slot.status, maxConv: slot.maxConv, forced: getForcedSlot() },
        mood,
        moods: MOODS,
        slots: getAllSlots().map(s => ({ status: s.status, label: s.label })),
        internalState,
        tiktokLive: shared.tiktokLiveActive === true,
        guildName: guild?.name || 'Discord',
      });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  function refreshSidebar() { updateSidebarChannels().catch(() => {}); }

  // Mood (humeur du jour)
  app.post('/api/admin/mood', (req, res) => {
    const { mood } = req.body;
    if (!MOODS.includes(mood)) return res.status(400).json({ ok: false, error: 'Humeur invalide' });
    setDailyMood(mood, true);
    refreshSidebar();
    broadcast('adminUpdate', { type: 'mood', value: mood });
    res.json({ ok: true, mood });
  });

  app.post('/api/admin/mood/reroll', (req, res) => {
    // Force un nouveau roll en resettant la date
    const { resetDailyMoodDate } = require('../bot/mood');
    resetDailyMoodDate();
    const newMood = refreshDailyMood();
    refreshSidebar();
    broadcast('adminUpdate', { type: 'mood', value: newMood });
    res.json({ ok: true, mood: newMood });
  });

  // Slot (état courant)
  app.post('/api/admin/slot', (req, res) => {
    const { status } = req.body;
    setForcedSlot(status || null);
    refreshSidebar();
    const slot = getCurrentSlot();
    broadcast('adminUpdate', { type: 'slot', value: slot });
    res.json({ ok: true, slot, forced: status || null });
  });

  // Energy / Internal state (sliders)
  app.post('/api/admin/state', (req, res) => {
    const { key, value } = req.body;
    const valid = ['energy', 'socialNeed', 'calmNeed', 'stimulation', 'mentalLoad', 'recognitionNeed'];
    if (!valid.includes(key)) return res.status(400).json({ ok: false, error: 'Clé invalide' });
    const n = Math.max(0, Math.min(100, parseInt(value) || 0));
    setInternalStateValue(key, n);
    refreshSidebar();
    broadcast('adminUpdate', { type: 'state', key, value: n });
    res.json({ ok: true, key, value: n });
  });

  // TikTok override
  app.post('/api/admin/tiktok', (req, res) => {
    const { live } = req.body;
    shared.tiktokLiveActive = live === true;
    refreshSidebar();
    broadcast('adminUpdate', { type: 'tiktok', value: shared.tiktokLiveActive });
    res.json({ ok: true, tiktokLive: shared.tiktokLiveActive });
  });

  // Sidebar refresh manuel
  app.post('/api/admin/sidebar/refresh', async (req, res) => {
    try { await updateSidebarChannels(); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ═════════════════════════════════════════════════════════
  // PROJECT FUNDING — Soutien Projet Brainee
  // ═════════════════════════════════════════════════════════

  // Récupérer les données de soutien du mois courant
  app.get('/api/project/funding', async (req, res) => {
    try {
      const data = await getFundingData();
      const totalCosts = calculateTotalCosts(data);
      res.json({
        ok: true,
        costs: data.costs,
        totalCosts,
        totalDonated: data.totalDonated || 0,
        remaining: Math.max(0, totalCosts - (data.totalDonated || 0)),
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Enregistrer une contribution (admin seulement)
  app.post('/api/project/donation', async (req, res) => {
    try {
      const { amount } = req.body;
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ ok: false, error: 'amount requis (nombre positif)' });
      }
      const updated = await addDonation(amount);
      const totalCosts = calculateTotalCosts(updated);
      const msg = `Contribution +${amount}€ enregistrée`;
      pushLog('SYS', msg, 'success');
      const response = {
        ok: true,
        costs: updated.costs,
        totalCosts,
        totalDonated: updated.totalDonated || 0,
        remaining: Math.max(0, totalCosts - (updated.totalDonated || 0)),
      };
      broadcast('fundingUpdate', response);
      updateBotStatus(response.totalDonated, totalCosts).catch(() => {});
      res.json(response);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });
}

module.exports = { registerRoutes };
