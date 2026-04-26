const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const discord_js = require('discord.js');
const ChannelType = discord_js.ChannelType;
const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, TEMPLATE_FILE } = require('../config');
const { sleep } = require('../utils');
const { normalizeName } = require('../bot/messaging');

async function readGuildState() {
  const guild = await shared.discord.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();
  await guild.roles.fetch();
  const membersCollection = await guild.members.fetch().catch(() => new Map());
  const members = [...membersCollection.values()]
    .filter(m => !m.user.bot)
    .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0))
    .map(m => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName || m.user.username,
      avatar: m.user.displayAvatarURL({ size: 64, forceStatic: true }),
      roles: m.roles.cache.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position).map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0') })),
      joinedAt: m.joinedAt ? m.joinedAt.toLocaleDateString('fr-FR') : '—',
    }));
  const roles = guild.roles.cache
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0'), hoist: r.hoist, position: r.position }));
  const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).sort((a, b) => a.rawPosition - b.rawPosition);
  const structure = [];
  for (const [, cat] of categories) {
    const channels = guild.channels.cache
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map(c => ({ id: c.id, name: c.name, type: c.type === ChannelType.GuildVoice ? 'voice' : 'text', topic: c.topic || '' }));
    structure.push({ id: cat.id, category: cat.name, channels });
  }
  shared.guildCache = {
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    botTag: shared.discord.user?.tag ?? '—',
    members, roles, structure,
    totalChannels: structure.reduce((a, s) => a + s.channels.length, 0),
  };
  return shared.guildCache;
}

function scheduleDiscordToFile(reason) {
  if (shared.isApplyingFile) return;
  if (shared.debounceDiscord) clearTimeout(shared.debounceDiscord);
  shared.debounceDiscord = setTimeout(() => syncDiscordToFile(reason), 2000);
}

async function syncDiscordToFile(reason) {
  if (shared.isApplyingFile) return;
  shared.isApplyingDiscord = true;
  try {
    const state = await readGuildState();
    const template = {
      _info: { lastSync: new Date().toISOString(), source: 'discord', server: state.name, totalRoles: state.roles.length, totalChannels: state.totalChannels },
      roles: state.roles,
      structure: state.structure,
    };
    fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(template, null, 2), 'utf8');
    shared.syncStats.d2f++;
    pushLog('D→F', `Fichier mis à jour`);
    broadcast('state', state);
    broadcast('stats', shared.syncStats);
  } catch (err) { pushLog('ERR', err.message, 'error'); }
  finally { shared.isApplyingDiscord = false; }
}

function scheduleFileToDiscord() {
  if (shared.isApplyingDiscord) return;
  if (shared.debounceFile) clearTimeout(shared.debounceFile);
  shared.debounceFile = setTimeout(() => syncFileToDiscord(), 2000);
}

async function syncFileToDiscord() {
  if (shared.isApplyingDiscord) return;
  shared.isApplyingFile = true;
  let changes = 0;
  try {
    const raw = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    const template = JSON.parse(raw);
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();
    pushLog('F→D', 'Application sur Discord...');
    for (const rd of template.roles || []) {
      const color = parseInt((rd.color || '#000000').replace('#', ''), 16);
      const existing = guild.roles.cache.find(r => r.name === rd.name);
      if (!existing) { await guild.roles.create({ name: rd.name, color, hoist: rd.hoist || false, permissions: [], reason: 'Dashboard sync' }); changes++; await sleep(400); }
      else if (existing.color !== color || existing.hoist !== rd.hoist) { await existing.edit({ color, hoist: rd.hoist, reason: 'Dashboard sync' }); changes++; await sleep(300); }
    }
    for (const block of template.structure || []) {
      const normCatName = normalizeName(block.category);
      let cat = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildCategory &&
        normalizeName(c.name) === normCatName
      );
      if (!cat) { cat = await guild.channels.create({ name: block.category, type: ChannelType.GuildCategory, reason: 'Dashboard sync' }); changes++; await sleep(400); }
      for (const ch of block.channels || []) {
        const chType = ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
        const normChName = normalizeName(ch.name);
        const existing = guild.channels.cache.find(c =>
          c.parentId === cat.id &&
          normalizeName(c.name) === normChName
        );
        if (!existing) { const opts = { name: ch.name, type: chType, parent: cat.id, reason: 'Dashboard sync' }; if (ch.topic) opts.topic = ch.topic; await guild.channels.create(opts); changes++; await sleep(350); }
        else if (ch.topic && existing.topic !== ch.topic) { await existing.setTopic(ch.topic, 'Dashboard sync'); changes++; await sleep(300); }
      }
    }
    if (changes > 0) {
      shared.syncStats.f2d += changes;
      pushLog('F→D', `✓ ${changes} changement(s)`, 'success');
      broadcast('stats', shared.syncStats);
      await syncDiscordToFile('Post-apply resync');
    } else pushLog('F→D', 'Aucun changement');
  } catch (err) {
    if (err instanceof SyntaxError) pushLog('ERR', 'JSON invalide', 'error');
    else pushLog('ERR', err.message, 'error');
  } finally { shared.isApplyingFile = false; }
}

function startFileWatcher() {
  const w = chokidar.watch(TEMPLATE_FILE, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });
  w.on('change', () => { if (shared.isApplyingDiscord) return; scheduleFileToDiscord(); });
}

module.exports = { readGuildState, scheduleDiscordToFile, syncDiscordToFile, scheduleFileToDiscord, syncFileToDiscord, startFileWatcher };
