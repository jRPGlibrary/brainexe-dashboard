const { Router } = require('express');
const { ChannelType, EmbedBuilder } = require('discord.js');
const shared = require('../../shared');
const { pushLog, broadcast } = require('../../logger');
const { GUILD_ID } = require('../../config');
const { normalizeName } = require('../../bot/messaging');
const { syncDiscordToFile, syncFileToDiscord } = require('../../discord/sync');
const { connectToTikTokLive } = require('../../features/tiktok');
const { auditLog } = require('../../audit');
const { discordActionLimiter } = require('../rateLimits');

const router = Router();

// Sync Discord ↔ fichier template
router.post('/sync/discord-to-file', async (req, res) => { await syncDiscordToFile('Forced'); res.json({ ok: true }); });
router.post('/sync/file-to-discord', async (req, res) => { await syncFileToDiscord(); res.json({ ok: true }); });

// Catégories & salons
router.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'name requis' });
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    const cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Dashboard' });
    res.json({ ok: true, id: cat.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/channels', async (req, res) => {
  const { name, type, categoryName, topic } = req.body;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const normCatName = categoryName ? normalizeName(categoryName) : '';
    const cat = normCatName ? guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && normalizeName(c.name) === normCatName) : null;
    const chType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
    const opts = { name, type: chType, reason: 'Dashboard' };
    if (cat) opts.parent = cat.id;
    if (topic) opts.topic = topic;
    const ch = await guild.channels.create(opts);
    res.json({ ok: true, id: ch.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/channels/:id', discordActionLimiter, async (req, res) => {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const ch = guild.channels.cache.get(req.params.id);
    if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    const name = ch.name;
    await ch.delete('Dashboard');
    auditLog('channel.delete', { id: req.params.id, name });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/channels/:id', async (req, res) => {
  const { name, topic } = req.body;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const ch = guild.channels.cache.get(req.params.id);
    if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    const opts = {};
    if (name) opts.name = name;
    if (topic !== undefined) opts.topic = topic;
    await ch.edit(opts, 'Dashboard');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Rôles
router.post('/roles', async (req, res) => {
  const { name, color, hoist } = req.body;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    const role = await guild.roles.create({
      name,
      color: parseInt((color || '#7c5cbf').replace('#', ''), 16),
      hoist: !!hoist,
      permissions: [],
      reason: 'Dashboard',
    });
    res.json({ ok: true, id: role.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/roles/:id', discordActionLimiter, async (req, res) => {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();
    const role = guild.roles.cache.get(req.params.id);
    if (!role) return res.status(404).json({ ok: false, error: 'Rôle introuvable' });
    const name = role.name;
    await role.delete('Dashboard');
    auditLog('role.delete', { id: req.params.id, name });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Auto-role
router.get('/autorole', (req, res) => res.json({ ok: true, roleName: shared.AUTO_ROLE_NAME }));
router.post('/autorole', (req, res) => {
  const { roleName } = req.body;
  if (!roleName) return res.status(400).json({ ok: false, error: 'roleName requis' });
  shared.AUTO_ROLE_NAME = roleName;
  pushLog('SYS', `Auto-role → "${shared.AUTO_ROLE_NAME}"`, 'success');
  auditLog('autorole.update', { roleName });
  broadcast('config', { autoRole: shared.AUTO_ROLE_NAME });
  res.json({ ok: true, roleName: shared.AUTO_ROLE_NAME });
});

// Welcome test
router.post('/welcome/test', async (req, res) => {
  const cfg = shared.botConfig.welcome;
  if (!cfg.enabled) return res.json({ ok: false, error: 'Welcome désactivé' });
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    const phrase = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
    const embed = new EmbedBuilder()
      .setColor(0x7c5cbf)
      .setTitle('👾 Bienvenue TestMembre ! [TEST]')
      .setDescription(`${phrase}\n\n📋 → <#1481028175474589827>\n🎭 → <#1481028181485027471>`)
      .setFooter({ text: 'BrainEXE • Test' })
      .setTimestamp();
    await channel.send({ content: '👋 **[TEST]**', embeds: [embed] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Test connexion TikTok
router.post('/tiktok/test', (req, res) => { connectToTikTokLive(); res.json({ ok: true }); });

// Post manuel dans un salon
router.post('/post', async (req, res) => {
  const { channelId, content, asEmbed, embedTitle } = req.body;
  if (!channelId || !content) return res.status(400).json({ ok: false, error: 'channelId + content requis' });
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    if (asEmbed) {
      const embed = new EmbedBuilder().setColor(0x7c5cbf).setDescription(content).setFooter({ text: 'BrainEXE' }).setTimestamp();
      if (embedTitle) embed.setTitle(embedTitle);
      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(content);
    }
    pushLog('API', `Post manuel → ${channel.name}`, 'success');
    auditLog('post.send', { channelId, channelName: channel.name, asEmbed: !!asEmbed, preview: String(content).slice(0, 120) });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
