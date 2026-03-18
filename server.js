/**
 * ================================================
 *  🧠 BRAINEXE DASHBOARD — Serveur Backend v1.1.0
 * ================================================
 *  Express + Discord.js + WebSocket + node-cron
 * ================================================
 */

const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');
const chokidar  = require('chokidar');
const fs        = require('fs');
const path      = require('path');
const cron      = require('node-cron');
const discord_js = require('discord.js');
const Client      = discord_js.Client;
const ChannelType = discord_js.ChannelType;
const Events      = discord_js.Events;
const EmbedBuilder = discord_js.EmbedBuilder || discord_js.MessageEmbed;
const PermissionFlagsBits = discord_js.PermissionFlagsBits;
// Intents compatibles v13 et v14
const INTENTS_GUILDS        = discord_js.GatewayIntentBits?.Guilds        ?? discord_js.Intents?.FLAGS?.GUILDS        ?? 1;
const INTENTS_GUILD_MEMBERS = discord_js.GatewayIntentBits?.GuildMembers  ?? discord_js.Intents?.FLAGS?.GUILD_MEMBERS ?? 2;

// ── CONFIG ───────────────────────────────────────────────────
const TOKEN         = process.env.DISCORD_TOKEN;
const GUILD_ID      = process.env.GUILD_ID || '1481022956816830669';
const PORT          = process.env.PORT     || 3000;
const TEMPLATE_FILE = 'discord-template.json';
const CONFIG_FILE   = 'brainexe-config.json';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// ── CONFIG PERSISTANTE ────────────────────────────────────────
const DEFAULT_CONFIG = {
  anecdote: {
    enabled: true,
    channelId: '1481028189680570421',
    channelName: '💬・général',
    hour: 12,
    randomDelayMax: 30,
  },
  welcome: {
    enabled: true,
    channelId: '1481028178389635292',
    channelName: '👋・présentations',
    messages: [
      "T'inquiète, ici on a tous un cerveau un peu chaotique. T'es au bon endroit. 🧠",
      "Nouveau cerveau détecté. Initialisation en cours... 100%. Bienvenue !",
      "On sait pas encore si t'es RPG Addict ou Indie Explorer, mais on va vite le découvrir. 🎮",
      "BrainEXE t'a scanné. Résultat : tu vas te sentir chez toi ici. ✅",
      "Un de plus dans le chaos organisé. Parfait. 🎲",
      "Ton hyperfocus a enfin trouvé un serveur à sa hauteur. ⚡",
      "Loading nouvel ami... 100% — Chargement réussi !",
      "Cool tu arrives, on avait justement besoin de quelqu'un pour débattre si FF7 ou Persona 5 est meilleur.",
      "T'as trouvé la planque des cerveaux en surchauffe. Installe-toi. 🔥",
      "BrainEXE te souhaite la bienvenue. Le serveur aussi. Les memes aussi. 😂",
    ],
  },
  actus: {
    enabled: true,
    dayOfMonth: 1,
    channels: [
      { channelId: "1481028286892081183", channelName: "📰・actus-gaming",       topic: "gaming général toutes plateformes, gros titres du mois", enabled: true },
      { channelId: "1481028247415296231", channelName: "🐉・jrpg-corner",        topic: "JRPG sorties, DLC, remasters, annonces",                 enabled: true },
      { channelId: "1481028244500385946", channelName: "⚔️・rpg-général",        topic: "RPG large action-RPG, tactique, ARPG",                   enabled: true },
      { channelId: "1481028272090386584", channelName: "🌿・indie-général",       topic: "indie sorties notables et pépites du mois",              enabled: true },
      { channelId: "1481028274590322850", channelName: "🔭・à-découvrir",         topic: "kickstarters en cours et jeux annoncés à venir",         enabled: true },
      { channelId: "1481028283486175245", channelName: "🚀・next-gen-général",    topic: "PS5 Xbox Series PC actus next-gen",                      enabled: true },
      { channelId: "1481028291094904995", channelName: "🎮・game-of-the-moment",  topic: "le jeu que tout le monde joue en ce moment",             enabled: true },
      { channelId: "1481028260753051739", channelName: "🕹️・retro-général",      topic: "retro remasters, collections, anniversaires",            enabled: true },
      { channelId: "1481028304206041243", channelName: "🤖・ia-et-tools",         topic: "IA et outils devs créateurs actus du mois",              enabled: true },
    ],
  },
  conversations: {
    enabled: true,
    frequencyPerWeek: 3,
    timeStart: 14,
    timeEnd: 22,
    channels: [
      { channelId: "1481028189680570421", channelName: "💬・général",             topic: "gaming général et vie communauté",              enabled: true },
      { channelId: "1481028192088100977", channelName: "🧠・cerveau-en-feu",      topic: "hyperfocus du moment, pensées random TDAH",     enabled: true },
      { channelId: "1481028195032760531", channelName: "😂・memes-et-chaos",      topic: "humour, memes, questions fun",                  enabled: true },
      { channelId: "1481028197515788360", channelName: "🎲・off-topic",           topic: "questions insolites et random",                 enabled: true },
      { channelId: "1481028199948222584", channelName: "🖼️・partage-créations",  topic: "défi créatif et inspiration",                   enabled: true },
      { channelId: "1481028244500385946", channelName: "⚔️・rpg-général",         topic: "débats RPG, système de combat, perso préféré",  enabled: true },
      { channelId: "1481028247415296231", channelName: "🐉・jrpg-corner",         topic: "questions JRPG, OST, waifu tier list",          enabled: true },
      { channelId: "1481028250741506189", channelName: "🗺️・open-world-rpg",     topic: "exploration vs histoire, open world favori",    enabled: true },
      { channelId: "1481028254721773588", channelName: "🃏・lore-et-théories",    topic: "théorie du moment, lore deep-dive",             enabled: true },
      { channelId: "1481028260753051739", channelName: "🕹️・retro-général",      topic: "console et souvenirs de jeux retro",            enabled: true },
      { channelId: "1481028264410484837", channelName: "🏆・hidden-gems",         topic: "hidden gem à partager",                         enabled: true },
      { channelId: "1481028266830860340", channelName: "📼・nostalgie",           topic: "souvenirs de jeux et nostalgie gaming",         enabled: true },
      { channelId: "1481028272090386584", channelName: "🌿・indie-général",       topic: "indie chouchou, indie underrated",               enabled: true },
      { channelId: "1481028274590322850", channelName: "🔭・à-découvrir",         topic: "jeux attendus et futures sorties",               enabled: true },
      { channelId: "1481028277182402701", channelName: "🎨・pixel-art-love",      topic: "coup de coeur visuel, DA préférée",             enabled: true },
      { channelId: "1481028283486175245", channelName: "🚀・next-gen-général",    topic: "next-gen vs génération précédente",             enabled: true },
      { channelId: "1481028291094904995", channelName: "🎮・game-of-the-moment",  topic: "avancement dans le jeu du moment",              enabled: true },
      { channelId: "1481028228515631307", channelName: "⚡・tips-focus",          topic: "tips productivité, routine, technique focus",   enabled: true },
      { channelId: "1481028238955249796", channelName: "🎧・playlist-focus",      topic: "playlist du moment et musique de focus",        enabled: true },
      { channelId: "1481028304206041243", channelName: "🤖・ia-et-tools",         topic: "outils IA utilisés en ce moment",               enabled: true },
      { channelId: "1481028297025650771", channelName: "💻・code-talk",           topic: "question dev, langage favori, projet en cours", enabled: true },
    ],
  },
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return {
        anecdote:      { ...DEFAULT_CONFIG.anecdote,      ...(raw.anecdote      || {}) },
        welcome:       { ...DEFAULT_CONFIG.welcome,       ...(raw.welcome       || {}) },
        actus:         { ...DEFAULT_CONFIG.actus,         ...(raw.actus         || {}) },
        conversations: { ...DEFAULT_CONFIG.conversations, ...(raw.conversations || {}) },
      };
    }
  } catch (e) { console.error('Config load error:', e.message); }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2), 'utf8');
  } catch (e) { console.error('Config save error:', e.message); }
}

let botConfig = loadConfig();

// ── INIT ─────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const discord = new Client({
  intents: [INTENTS_GUILDS, INTENTS_GUILD_MEMBERS],
});

let AUTO_ROLE_NAME    = '👁️ Lurker';
let changeLog         = [];
let isApplyingFile    = false;
let isApplyingDiscord = false;
let debounceDiscord   = null;
let debounceFile      = null;
let guildCache        = null;
let syncStats         = { d2f: 0, f2d: 0, startTime: Date.now() };

// ── WEBSOCKET BROADCAST ───────────────────────────────────────
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function pushLog(dir, msg, level = 'info') {
  const time  = new Date().toLocaleTimeString('fr-FR');
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

  const membersCollection = await guild.members.fetch().catch(() => new Map());
  const members = [...membersCollection.values()]
    .filter(m => !m.user.bot)
    .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0))
    .map(m => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName || m.user.username,
      avatar: m.user.displayAvatarURL({ size: 64, forceStatic: true }),
      roles: m.roles.cache
        .filter(r => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0') })),
      joinedAt: m.joinedAt ? m.joinedAt.toLocaleDateString('fr-FR') : '—',
    }));

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
    members,
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

    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();

    pushLog('F→D', 'Lecture du fichier JSON — application sur Discord...');

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
    if (err instanceof SyntaxError) pushLog('ERR', 'JSON invalide — vérifie la syntaxe', 'error');
    else pushLog('ERR', err.message, 'error');
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
    if (o.name !== n.name)           { pushLog('D→F', `Salon renommé : ${o.name} → ${n.name}`); scheduleDiscordToFile('rename'); }
    else if (o.topic !== n.topic)    { pushLog('D→F', `Topic modifié : ${n.name}`); scheduleDiscordToFile('topic'); }
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
      scheduleDiscordToFile('Rôle modifié');
    }
  });

  // ── AUTO-ROLE + WELCOME à l'arrivée ──────────────────────────
  discord.on(Events.GuildMemberAdd, async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    try {
      await member.guild.roles.fetch();
      const role = member.guild.roles.cache.find(r => r.name === AUTO_ROLE_NAME);
      if (!role) {
        pushLog('SYS', `Auto-role introuvable : "${AUTO_ROLE_NAME}"`, 'error');
      } else {
        await member.roles.add(role, "Auto-role à l'arrivée");
        pushLog('API', `Auto-role assigné à ${member.user.tag} : ${role.name}`, 'success');
        broadcast('autorole', { user: member.user.tag, role: role.name });
      }
      await sendWelcomeMessage(member);
    } catch (err) {
      pushLog('ERR', `Arrivée échouée pour ${member.user.tag} : ${err.message}`, 'error');
    }
  });
}

// ── WATCHER FICHIER ───────────────────────────────────────────
function startFileWatcher() {
  const watcher = chokidar.watch(TEMPLATE_FILE, {
    persistent: true, ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });
  watcher.on('change', () => {
    if (isApplyingDiscord) return;
    pushLog('F→D', 'Fichier modifié → application sur Discord...');
    scheduleFileToDiscord();
  });
}

// ── ANECDOTE GAMING QUOTIDIENNE ───────────────────────────────
async function generateAnecdote() {
  if (!PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY manquante dans Railway');
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: "Tu es un expert gaming passionné qui écrit pour une communauté Discord francophone neurodivergente. Tu génères des anecdotes gaming courtes, vraies, fun et surprenantes." },
        { role: 'user',   content: "Génère UNE anecdote gaming courte et surprenante. Thèmes : JRPG, retro, indie, next-gen, easter eggs, records, bugs légendaires... FORMAT : 2 à 4 phrases maximum, punchy. Termine par une ligne vide puis : 🕹️ *[Jeu ou contexte concerné]*" },
      ],
      max_tokens: 300,
    }),
  });
  if (!response.ok) throw new Error(`Perplexity API error ${response.status}`);
  return (await response.json()).choices[0].message.content.trim();
}

async function postDailyAnecdote() {
  const cfg = botConfig.anecdote;
  if (!cfg.enabled) { pushLog('SYS', 'Anecdote désactivée — skip'); return; }
  pushLog('SYS', 'Génération de l\'anecdote gaming du jour...');
  try {
    const text    = await generateAnecdote();
    const guild   = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) { pushLog('ERR', `Anecdote : salon introuvable (ID: ${cfg.channelId})`, 'error'); return; }
    const today    = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const todayCap = today.charAt(0).toUpperCase() + today.slice(1);
    const embed    = new EmbedBuilder()
      .setColor(0x7c5cbf)
      .setTitle('🎮 Anecdote Gaming du jour')
      .setDescription(text)
      .setFooter({ text: `${todayCap} • Généré par BrainEXE` })
      .setTimestamp();
    await channel.send({ content: '**🧠 Le saviez-vous ?**', embeds: [embed] });
    pushLog('SYS', `✅ Anecdote postée dans ${cfg.channelName}`, 'success');
    broadcast('anecdote', { status: 'posted', time: new Date().toLocaleTimeString('fr-FR') });
  } catch (err) {
    pushLog('ERR', `Anecdote échouée : ${err.message}`, 'error');
    broadcast('anecdote', { status: 'error', error: err.message });
  }
}

let anecdoteCron = null;
function startAnecdoteCron() {
  if (anecdoteCron) { try { anecdoteCron.stop(); } catch {} }
  const h = botConfig.anecdote.hour || 12;
  anecdoteCron = cron.schedule(`0 ${h} * * *`, () => {
    const delayMs  = Math.floor(Math.random() * (botConfig.anecdote.randomDelayMax || 30) * 60 * 1000);
    const delayMin = Math.round(delayMs / 60000);
    pushLog('SYS', `Anecdote planifiée dans ${delayMin} min`);
    setTimeout(postDailyAnecdote, delayMs);
  }, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron anecdote configuré à ${h}h (Europe/Paris)`);
}

// ── MESSAGE D'ACCUEIL AUTO ────────────────────────────────────
async function sendWelcomeMessage(member) {
  const cfg = botConfig.welcome;
  if (!cfg.enabled || !cfg.messages || cfg.messages.length === 0) return;
  try {
    const guild   = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) { pushLog('ERR', `Welcome : salon introuvable (ID: ${cfg.channelId})`, 'error'); return; }
    const phrase  = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
    const embed   = new EmbedBuilder()
      .setColor(0x7c5cbf)
      .setTitle(`👾 Bienvenue ${member.user.username} !`)
      .setDescription(`${phrase}\n\n📋 Lis les règles → <#1481028175474589827>\n🎭 Choisis tes rôles → <#1481028181485027471>\n💬 Présente-toi ici !`)
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setFooter({ text: 'BrainEXE • Neurodivergent Creator Hub' })
      .setTimestamp();
    await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
    pushLog('SYS', `👋 Welcome envoyé pour ${member.user.tag}`, 'success');
  } catch (err) {
    pushLog('ERR', `Welcome échoué pour ${member.user.tag} : ${err.message}`, 'error');
  }
}

// ── ACTUS MENSUELLES ─────────────────────────────────────────
async function postMonthlyActus() {
  const cfg = botConfig.actus;
  if (!cfg.enabled) { pushLog('SYS', 'Actus désactivées — skip'); return; }
  const active = cfg.channels.filter(c => c.enabled);
  pushLog('SYS', `Actus mensuelles — ${active.length} salons ciblés`);
  const guild = await discord.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();
  const month    = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
  for (const ch of active) {
    try {
      const channel = guild.channels.cache.get(ch.channelId);
      if (!channel) { pushLog('ERR', `Actus : ${ch.channelName} introuvable`, 'error'); continue; }
      if (!PERPLEXITY_API_KEY) { pushLog('ERR', 'PERPLEXITY_API_KEY manquante', 'error'); break; }
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: "Tu es un expert gaming qui résume les actualités récentes pour une communauté Discord francophone. Tu utilises des données réelles et récentes." },
            { role: 'user',   content: `Génère un récapitulatif des actualités de ${monthCap} pour un salon dédié à : ${ch.topic}. Format : 4 à 6 actus concrètes avec dates. Style : emojis, punchy. Commence directement par les actus.` },
          ],
          max_tokens: 600,
        }),
      });
      if (!response.ok) throw new Error(`Perplexity error ${response.status}`);
      const content = (await response.json()).choices[0].message.content.trim();
      const embed   = new EmbedBuilder()
        .setColor(0x5b7fff)
        .setTitle(`📅 Actus ${monthCap}`)
        .setDescription(content)
        .setFooter({ text: `${ch.channelName} • Généré par BrainEXE` })
        .setTimestamp();
      await channel.send({ embeds: [embed] });
      pushLog('SYS', `✅ Actus postées dans ${ch.channelName}`, 'success');
      await sleep(2000);
    } catch (err) {
      pushLog('ERR', `Actus échouées pour ${ch.channelName} : ${err.message}`, 'error');
    }
  }
}

let actusCron = null;
function startActusCron() {
  if (actusCron) { try { actusCron.stop(); } catch {} }
  const day = botConfig.actus.dayOfMonth || 1;
  actusCron = cron.schedule(`0 10 ${day} * *`, postMonthlyActus, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron actus configuré au ${day} du mois à 10h`);
}

// ── LANCE-CONVERSATIONS ALÉATOIRES ───────────────────────────
async function postRandomConversation() {
  const cfg = botConfig.conversations;
  if (!cfg.enabled) return;
  const active = cfg.channels.filter(c => c.enabled);
  if (active.length === 0) return;
  const ch = active[Math.floor(Math.random() * active.length)];
  try {
    const guild   = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel || !PERPLEXITY_API_KEY) return;
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: "Tu écris pour une communauté Discord francophone neurodivergente passionnée de gaming. Tu lances des conversations naturelles et engageantes." },
          { role: 'user',   content: `Génère UN message court pour lancer une conversation dans un salon dédié à : ${ch.topic}. Maximum 3 phrases, ton décontracté, une question ouverte à la fin. Pas de titre, commence directement.` },
        ],
        max_tokens: 150,
      }),
    });
    if (!response.ok) return;
    const content = (await response.json()).choices[0].message.content.trim();
    await channel.send(content);
    pushLog('SYS', `💬 Lance-conversation posté dans ${ch.channelName}`, 'success');
    broadcast('conversation', { channel: ch.channelName, time: new Date().toLocaleTimeString('fr-FR') });
  } catch (err) {
    pushLog('ERR', `Lance-conversation échoué : ${err.message}`, 'error');
  }
}

let convCron = null;
function startConvCron() {
  if (convCron) { try { convCron.stop(); } catch {} }
  convCron = cron.schedule('0 * * * *', () => {
    const cfg  = botConfig.conversations;
    if (!cfg.enabled) return;
    const hour = new Date().getHours();
    if (hour < cfg.timeStart || hour >= cfg.timeEnd) return;
    const activeHours = Math.max(1, cfg.timeEnd - cfg.timeStart);
    const prob = cfg.frequencyPerWeek / (7 * activeHours);
    if (Math.random() < prob) postRandomConversation();
  }, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron conversations configuré (${botConfig.conversations.frequencyPerWeek}x/semaine, ${botConfig.conversations.timeStart}h-${botConfig.conversations.timeEnd}h)`);
}

// ── BACKUP AUTO 6H ───────────────────────────────────────────
setInterval(async () => {
  try {
    const state    = await readGuildState();
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(filename, JSON.stringify(state, null, 2), 'utf8');
    pushLog('SYS', `📦 Backup auto : ${filename}`, 'success');
    const files = fs.readdirSync('.').filter(f => f.startsWith('backup_') && f.endsWith('.json'));
    if (files.length > 10) {
      files.sort().slice(0, files.length - 10).forEach(f => { try { fs.unlinkSync(f); } catch {} });
    }
  } catch (err) {
    pushLog('ERR', `Backup auto échoué : ${err.message}`, 'error');
  }
}, 6 * 60 * 60 * 1000);

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

// GET config
app.get('/api/config', (req, res) => {
  res.json({ ok: true, config: botConfig });
});

// POST sauvegarder config
app.post('/api/config', (req, res) => {
  try {
    const { section, data } = req.body;
    if (!section || !data) return res.status(400).json({ ok: false, error: 'section + data requis' });
    if (!botConfig[section]) return res.status(400).json({ ok: false, error: `Section inconnue : ${section}` });
    botConfig[section] = { ...botConfig[section], ...data };
    saveConfig();
    if (section === 'anecdote')      startAnecdoteCron();
    if (section === 'actus')         startActusCron();
    if (section === 'conversations') startConvCron();
    pushLog('SYS', `Config "${section}" mise à jour via dashboard`, 'success');
    broadcast('configUpdate', { section, data: botConfig[section] });
    res.json({ ok: true, config: botConfig[section] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST sync Discord → Fichier
app.post('/api/sync/discord-to-file', async (req, res) => {
  pushLog('SYS', 'Sync forcée Discord → Fichier');
  await syncDiscordToFile('Forced via API');
  res.json({ ok: true });
});

// POST sync Fichier → Discord
app.post('/api/sync/file-to-discord', async (req, res) => {
  pushLog('SYS', 'Sync forcée Fichier → Discord');
  await syncFileToDiscord();
  res.json({ ok: true });
});

// POST créer un salon
app.post('/api/channels', async (req, res) => {
  const { name, type, categoryName, topic } = req.body;
  try {
    const guild  = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const cat    = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
    const chType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
    const opts   = { name, type: chType, reason: 'Dashboard' };
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

// PATCH modifier un salon
app.patch('/api/channels/:id', async (req, res) => {
  const { name, topic } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const ch = guild.channels.cache.get(req.params.id);
    if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    const opts = {};
    if (name) opts.name = name;
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
    const guild    = await discord.guilds.fetch(GUILD_ID);
    const colorInt = parseInt((color || '#7c5cbf').replace('#', ''), 16);
    const role     = await guild.roles.create({ name, color: colorInt, hoist: !!hoist, permissions: [], reason: 'Dashboard' });
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

// POST backup manuel
app.post('/api/backup', async (req, res) => {
  try {
    const state    = await readGuildState();
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(filename, JSON.stringify(state, null, 2), 'utf8');
    pushLog('SYS', `Backup créé : ${filename}`, 'success');
    res.json({ ok: true, filename });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET auto-role
app.get('/api/autorole', (req, res) => {
  res.json({ ok: true, roleName: AUTO_ROLE_NAME });
});

// POST changer auto-role
app.post('/api/autorole', (req, res) => {
  const { roleName } = req.body;
  if (!roleName) return res.status(400).json({ ok: false, error: 'roleName requis' });
  AUTO_ROLE_NAME = roleName;
  pushLog('SYS', `Auto-role mis à jour : "${AUTO_ROLE_NAME}"`, 'success');
  broadcast('config', { autoRole: AUTO_ROLE_NAME });
  res.json({ ok: true, roleName: AUTO_ROLE_NAME });
});

// POST déclencher anecdote manuellement
app.post('/api/anecdote', async (req, res) => {
  pushLog('SYS', 'Anecdote déclenchée manuellement');
  postDailyAnecdote();
  res.json({ ok: true, message: 'Génération en cours...' });
});

// POST tester welcome
app.post('/api/welcome/test', async (req, res) => {
  const cfg = botConfig.welcome;
  if (!cfg.enabled) return res.json({ ok: false, error: 'Welcome désactivé' });
  try {
    const guild   = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    const phrase  = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
    const embed   = new EmbedBuilder()
      .setColor(0x7c5cbf)
      .setTitle('👾 Bienvenue TestMembre ! [TEST]')
      .setDescription(`${phrase}\n\n📋 Lis les règles → <#1481028175474589827>\n🎭 Choisis tes rôles → <#1481028181485027471>\n💬 Présente-toi ici !`)
      .setFooter({ text: 'BrainEXE • Test welcome message' })
      .setTimestamp();
    await channel.send({ content: '👋 **[TEST]** — Voilà à quoi ressemble le message de bienvenue :', embeds: [embed] });
    pushLog('SYS', `Test welcome posté dans ${cfg.channelName}`, 'success');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST déclencher actus manuellement
app.post('/api/actus', async (req, res) => {
  pushLog('SYS', 'Actus déclenchées manuellement');
  postMonthlyActus();
  res.json({ ok: true, message: 'Actus en cours de génération...' });
});

// POST déclencher lance-conversation manuellement
app.post('/api/conversation', async (req, res) => {
  pushLog('SYS', 'Lance-conversation déclenché manuellement');
  postRandomConversation();
  res.json({ ok: true, message: 'Lance-conversation en cours...' });
});

// GET membres
app.get('/api/members', async (req, res) => {
  try {
    const state = guildCache || await readGuildState();
    res.json({ ok: true, members: state.members || [] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── WEBSOCKET ─────────────────────────────────────────────────
wss.on('connection', async (ws) => {
  pushLog('SYS', 'Dashboard connecté via WebSocket');
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
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  registerDiscordEvents();
  startFileWatcher();
  startAnecdoteCron();
  startActusCron();
  startConvCron();

  await syncDiscordToFile('Démarrage');
});

// Démarrer le serveur HTTP immédiatement (pas d'attente du bot)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Serveur HTTP démarré sur le port ${PORT}`);
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

discord.login(TOKEN).catch(err => {
  console.error('\n❌ Token invalide :', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Dashboard arrêté. À bientôt !');
  discord.destroy();
  process.exit(0);
});
