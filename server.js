/**
 * ================================================
 *  🧠 BRAINEXE DASHBOARD — Serveur Backend
 * ================================================
 *  Express + Discord.js + WebSocket
 *
 *  📋 UTILISATION :
 *  1. npm install
 *  2. Remplace COLLE_TON_TOKEN_ICI par ton token
 *  3. node server.js
 *  4. Ouvre http://localhost:3000
 * ================================================
 */

const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const chokidar   = require('chokidar');
const fs         = require('fs');
const path       = require('path');
const { Client, GatewayIntentBits, ChannelType, Events, PermissionFlagsBits } = require('discord.js');

// ── CONFIG ───────────────────────────────────────────────────
const TOKEN         = 'MTQ4MTMyNjgyMzExMDM0ODg2NA.Gg8B4N.xTRaocNaCrQ6ES8FBsZTU0KQX60PoF4ZsFOxVw';
const GUILD_ID      = '1481022956816830669';
const PORT          = 3000;
const TEMPLATE_FILE = 'discord-template.json';

// ── INIT ─────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

let AUTO_ROLE_NAME = '👁️ Lurker'; // rôle assigné automatiquement à l'arrivée

let changeLog        = [];
let isApplyingFile   = false;
let isApplyingDiscord = false;
let debounceDiscord  = null;
let debounceFile     = null;
let guildCache       = null;
let syncStats        = { d2f: 0, f2d: 0, startTime: Date.now() };

// ── WEBSOCKET BROADCAST ───────────────────────────────────────
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function pushLog(dir, msg, level = 'info') {
  const time = new Date().toLocaleTimeString('fr-FR');
  const entry = { time, dir, msg, level };
  changeLog.push(entry);
  if (changeLog.length > 200) changeLog.shift();
  broadcast('log', entry);
  console.log(`[${time}] [${dir}] ${msg}`);
}

// ── LECTURE ÉTAT DISCORD ──────────────────────────────────────
async function readGuildState() {
  const guild = await discord.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();
  await guild.roles.fetch();
  await guild.members.fetch({ limit: 1 }).catch(() => {});

  const roles = guild.roles.cache
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map(r => ({
      id: r.id,
      name: r.name,
      color: '#' + r.color.toString(16).padStart(6, '0'),
      hoist: r.hoist,
      position: r.position,
    }));

  const categories = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  const structure = [];
  for (const [, cat] of categories) {
    const channels = guild.channels.cache
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type === ChannelType.GuildVoice ? 'voice' : 'text',
        topic: c.topic || '',
      }));
    structure.push({ id: cat.id, category: cat.name, channels });
  }

  guildCache = {
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    roles,
    structure,
    totalChannels: structure.reduce((a, s) => a + s.channels.length, 0),
  };

  return guildCache;
}

// ── DISCORD → FICHIER ─────────────────────────────────────────
function scheduleDiscordToFile(reason) {
  if (isApplyingFile) return;
  if (debounceDiscord) clearTimeout(debounceDiscord);
  debounceDiscord = setTimeout(() => syncDiscordToFile(reason), 2000);
}

async function syncDiscordToFile(reason) {
  if (isApplyingFile) return;
  isApplyingDiscord = true;
  try {
    const state = await readGuildState();
    const template = {
      _info: {
        lastSync: new Date().toISOString(),
        source: 'discord',
        server: state.name,
        totalRoles: state.roles.length,
        totalChannels: state.totalChannels,
      },
      roles: state.roles,
      structure: state.structure,
    };
    fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(template, null, 2), 'utf8');
    syncStats.d2f++;
    pushLog('D→F', `Fichier mis à jour · ${state.roles.length} rôles · ${state.totalChannels} salons`);
    broadcast('state', state);
    broadcast('stats', syncStats);
  } catch (err) {
    pushLog('ERR', err.message, 'error');
  } finally {
    isApplyingDiscord = false;
  }
}

// ── FICHIER → DISCORD ─────────────────────────────────────────
function scheduleFileToDiscord() {
  if (isApplyingDiscord) return;
  if (debounceFile) clearTimeout(debounceFile);
  debounceFile = setTimeout(() => syncFileToDiscord(), 2000);
}

async function syncFileToDiscord() {
  if (isApplyingDiscord) return;
  isApplyingFile = true;
  let changes = 0;
  try {
    const raw      = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    const template = JSON.parse(raw);
    if (template._info?.source === 'discord') { return; }

    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();

    pushLog('F→D', 'Lecture du fichier JSON — application sur Discord...');

    // Rôles
    for (const rd of template.roles || []) {
      const color    = parseInt((rd.color || '#000000').replace('#', ''), 16);
      const existing = guild.roles.cache.find(r => r.name === rd.name);
      if (!existing) {
        await guild.roles.create({ name: rd.name, color, hoist: rd.hoist || false, permissions: [], reason: 'Dashboard sync' });
        pushLog('F→D', `Rôle créé : ${rd.name}`);
        changes++;
        await sleep(400);
      } else if (existing.color !== color || existing.hoist !== rd.hoist) {
        await existing.edit({ color, hoist: rd.hoist, reason: 'Dashboard sync' });
        pushLog('F→D', `Rôle modifié : ${rd.name}`);
        changes++;
        await sleep(300);
      }
    }

    // Structure
    for (const block of template.structure || []) {
      let cat = guild.channels.cache.find(c => c.name === block.category && c.type === ChannelType.GuildCategory);
      if (!cat) {
        cat = await guild.channels.create({ name: block.category, type: ChannelType.GuildCategory, reason: 'Dashboard sync' });
        pushLog('F→D', `Catégorie créée : ${block.category}`);
        changes++;
        await sleep(400);
      }
      for (const ch of block.channels || []) {
        const chType   = ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
        const existing = guild.channels.cache.find(c => c.name === ch.name && c.parentId === cat.id);
        if (!existing) {
          const opts = { name: ch.name, type: chType, parent: cat.id, reason: 'Dashboard sync' };
          if (ch.topic) opts.topic = ch.topic;
          await guild.channels.create(opts);
          pushLog('F→D', `Salon créé : ${ch.name}`);
          changes++;
          await sleep(350);
        } else if (ch.topic && existing.topic !== ch.topic) {
          await existing.setTopic(ch.topic, 'Dashboard sync');
          pushLog('F→D', `Topic mis à jour : ${ch.name}`);
          changes++;
          await sleep(300);
        }
      }
    }

    if (changes > 0) {
      syncStats.f2d += changes;
      pushLog('F→D', `✓ ${changes} changement(s) appliqué(s) sur Discord`, 'success');
      broadcast('stats', syncStats);
      await syncDiscordToFile('Post-apply resync');
    } else {
      pushLog('F→D', 'Aucun changement à appliquer');
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      pushLog('ERR', 'JSON invalide — vérifie la syntaxe', 'error');
    } else {
      pushLog('ERR', err.message, 'error');
    }
  } finally {
    isApplyingFile = false;
  }
}

// ── ÉVÉNEMENTS DISCORD ────────────────────────────────────────
function registerDiscordEvents() {
  discord.on(Events.ChannelCreate, ch => {
    if (ch.guildId !== GUILD_ID) return;
    pushLog('D→F', `Salon créé : ${ch.name}`);
    scheduleDiscordToFile(`Salon créé : ${ch.name}`);
  });
  discord.on(Events.ChannelDelete, ch => {
    if (ch.guildId !== GUILD_ID) return;
    pushLog('D→F', `Salon supprimé : ${ch.name}`);
    scheduleDiscordToFile(`Salon supprimé : ${ch.name}`);
  });
  discord.on(Events.ChannelUpdate, (o, n) => {
    if (n.guildId !== GUILD_ID) return;
    if (o.name !== n.name) { pushLog('D→F', `Salon renommé : ${o.name} → ${n.name}`); scheduleDiscordToFile('rename'); }
    else if (o.topic !== n.topic) { pushLog('D→F', `Topic modifié : ${n.name}`); scheduleDiscordToFile('topic'); }
    else if (o.parentId !== n.parentId) { pushLog('D→F', `Salon déplacé : ${n.name}`); scheduleDiscordToFile('move'); }
  });
  discord.on(Events.GuildRoleCreate, r => {
    if (r.guild.id !== GUILD_ID) return;
    pushLog('D→F', `Rôle créé : ${r.name}`);
    scheduleDiscordToFile(`Rôle créé : ${r.name}`);
  });
  discord.on(Events.GuildRoleDelete, r => {
    if (r.guild.id !== GUILD_ID) return;
    pushLog('D→F', `Rôle supprimé : ${r.name}`);
    scheduleDiscordToFile(`Rôle supprimé : ${r.name}`);
  });
  discord.on(Events.GuildRoleUpdate, (o, n) => {
    if (n.guild.id !== GUILD_ID) return;
    if (o.name !== n.name || o.color !== n.color) {
      pushLog('D→F', `Rôle modifié : ${o.name} → ${n.name}`);
      scheduleDiscordToFile(`Rôle modifié`);
    }
  });
}

  // ── AUTO-ROLE à larrivée ──────────────────────────────────
  discord.on(Events.GuildMemberAdd, async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    try {
      await member.guild.roles.fetch();
      const role = member.guild.roles.cache.find(r => r.name === AUTO_ROLE_NAME);
      if (!role) {
        pushLog("SYS", `Auto-role introuvable : "${AUTO_ROLE_NAME}" — vérifie le nom dans le dashboard`, "error");
        return;
      }
      await member.roles.add(role, "Auto-role à larrivée");
      pushLog("API", `Auto-role assigné à ${member.user.tag} : ${role.name}`, "success");
      broadcast("autorole", { user: member.user.tag, role: role.name });
    } catch (err) {
      pushLog("ERR", `Auto-role échoué pour ${member.user.tag} : ${err.message}`, "error");
    }
  });

// ── WATCHER FICHIER ───────────────────────────────────────────
function startFileWatcher() {
  const watcher = chokidar.watch(TEMPLATE_FILE, {
    persistent: true, ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });
  watcher.on('change', () => {
    if (isApplyingDiscord) return;
    pushLog('F→D', `Fichier modifié → application sur Discord...`);
    scheduleFileToDiscord();
  });
}

// ── REST API ──────────────────────────────────────────────────

// GET état complet
app.get('/api/state', async (req, res) => {
  try {
    const state = await readGuildState();
    res.json({ ok: true, state, stats: syncStats, uptime: Date.now() - syncStats.startTime });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET logs
app.get('/api/logs', (req, res) => {
  res.json({ ok: true, logs: changeLog });
});

// POST forcer sync Discord → Fichier
app.post('/api/sync/discord-to-file', async (req, res) => {
  pushLog('SYS', 'Sync forcée Discord → Fichier');
  await syncDiscordToFile('Forced via API');
  res.json({ ok: true });
});

// POST forcer sync Fichier → Discord
app.post('/api/sync/file-to-discord', async (req, res) => {
  pushLog('SYS', 'Sync forcée Fichier → Discord');
  await syncFileToDiscord();
  res.json({ ok: true });
});

// POST créer un salon
app.post('/api/channels', async (req, res) => {
  const { name, type, categoryName, topic } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const cat   = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
    const chType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
    const opts  = { name, type: chType, reason: 'Dashboard' };
    if (cat) opts.parent = cat.id;
    if (topic) opts.topic = topic;
    const ch = await guild.channels.create(opts);
    pushLog('API', `Salon créé via dashboard : ${name}`, 'success');
    res.json({ ok: true, id: ch.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE supprimer un salon
app.delete('/api/channels/:id', async (req, res) => {
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const ch = guild.channels.cache.get(req.params.id);
    if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    const name = ch.name;
    await ch.delete('Dashboard');
    pushLog('API', `Salon supprimé via dashboard : ${name}`, 'success');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PATCH renommer/modifier topic salon
app.patch('/api/channels/:id', async (req, res) => {
  const { name, topic } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const ch = guild.channels.cache.get(req.params.id);
    if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    const opts = {};
    if (name)  opts.name  = name;
    if (topic !== undefined) opts.topic = topic;
    await ch.edit(opts, 'Dashboard');
    pushLog('API', `Salon modifié via dashboard : ${ch.name}`, 'success');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST créer un rôle
app.post('/api/roles', async (req, res) => {
  const { name, color, hoist } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    const colorInt = parseInt((color || '#7c5cbf').replace('#', ''), 16);
    const role = await guild.roles.create({ name, color: colorInt, hoist: !!hoist, permissions: [], reason: 'Dashboard' });
    pushLog('API', `Rôle créé via dashboard : ${name}`, 'success');
    res.json({ ok: true, id: role.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE supprimer un rôle
app.delete('/api/roles/:id', async (req, res) => {
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();
    const role = guild.roles.cache.get(req.params.id);
    if (!role) return res.status(404).json({ ok: false, error: 'Rôle introuvable' });
    const name = role.name;
    await role.delete('Dashboard');
    pushLog('API', `Rôle supprimé via dashboard : ${name}`, 'success');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST backup
app.post('/api/backup', async (req, res) => {
  try {
    const state    = await readGuildState();
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(filename, JSON.stringify(state, null, 2), 'utf8');
    pushLog('SYS', `Backup créé : ${filename}`, 'success');
    res.json({ ok: true, filename });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET auto-role config
app.get("/api/autorole", (req, res) => {
  res.json({ ok: true, roleName: AUTO_ROLE_NAME });
});

// POST changer le rôle auto
app.post("/api/autorole", (req, res) => {
  const { roleName } = req.body;
  if (!roleName) return res.status(400).json({ ok: false, error: "roleName requis" });
  AUTO_ROLE_NAME = roleName;
  pushLog("SYS", `Auto-role mis à jour : "${AUTO_ROLE_NAME}"`, "success");
  broadcast("config", { autoRole: AUTO_ROLE_NAME });
  res.json({ ok: true, roleName: AUTO_ROLE_NAME });
});

// ── WEBSOCKET ─────────────────────────────────────────────────
wss.on('connection', async (ws) => {
  pushLog('SYS', 'Dashboard connecté via WebSocket');
  // Envoie l'état initial + logs au nouveau client
  try {
    const state = await readGuildState();
    ws.send(JSON.stringify({ type: 'state', data: state }));
    ws.send(JSON.stringify({ type: 'logs',  data: changeLog }));
    ws.send(JSON.stringify({ type: 'stats', data: syncStats }));
  } catch (e) {}
});

// ── DÉMARRAGE ─────────────────────────────────────────────────
discord.once('clientReady', async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🧠 BRAINEXE DASHBOARD — Serveur démarré');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ Bot connecté    : ${discord.user.tag}`);
  console.log(`  🌐 Dashboard       : http://localhost:${PORT}`);
  console.log(`  🔄 Sync            : bidirectionnel actif`);
  console.log(`  📁 Template file   : ${TEMPLATE_FILE}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  registerDiscordEvents();
  startFileWatcher();

  server.listen(PORT, () => {
    pushLog('SYS', `Serveur démarré sur http://localhost:${PORT}`);
  });

  await syncDiscordToFile('Démarrage');
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

discord.login(TOKEN).catch(err => {
  console.error('\n❌ Token invalide :', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Dashboard arrêté. À bientôt !');
  discord.destroy();
  process.exit(0);
});
