/**
* ================================================
* 🧠 BRAINEXE DASHBOARD — Serveur Backend v1.6.0
* ================================================
* Express + Discord.js + WebSocket + node-cron
* NOUVEAUTÉS v1.6.0:
* - Brainee.exe (renommée)
* - CATEGORY_MODES : catégories par salon
* - callClaudeWithSearch : web search Anthropic natif
* - Anecdotes : anti-doublon Discord + anti-répétition
* - postSmartConversation : re-engage membres
* - Scheduler 8h-22h récursif, délai 1h-3h30
* - @mention listener
* NOUVEAUTÉS v1.4.0:
*   - Persona Brainee.exe : identité féminine 24 ans
*   - BOT_PERSONA injectée dans tous les prompts IA
*   - CONV_MODES : débat / chaos / deep / simple
*   - Style d'écriture naturel, communauté-first
* ================================================
* v1.3.0:
*   - Actus bi-mensuelles : 1er ET 15 de chaque mois
*   - lastPostedSlots[] remplace dayOfMonth + lastPostedMonth
*   - Conversations : plage 24h, salon le plus calme en priorité
*   - canReply : le bot répond aux conversations des membres
*   - maxPerDay remplace frequencyPerWeek
*   - lastPostByChannel pour tracking par salon
* ================================================
*/

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const discord_js = require('discord.js');
const Client = discord_js.Client;
const ChannelType = discord_js.ChannelType;
const Events = discord_js.Events;
const EmbedBuilder = discord_js.EmbedBuilder || discord_js.MessageEmbed;
const PermissionFlagsBits = discord_js.PermissionFlagsBits;
const INTENTS_GUILDS = discord_js.GatewayIntentBits?.Guilds ?? discord_js.Intents?.FLAGS?.GUILDS ?? 1;
const INTENTS_GUILD_MEMBERS = discord_js.GatewayIntentBits?.GuildMembers ?? discord_js.Intents?.FLAGS?.GUILD_MEMBERS ?? 2;
const INTENTS_GUILD_MESSAGES = discord_js.GatewayIntentBits?.GuildMessages ?? 512;
const INTENTS_MESSAGE_CONTENT = discord_js.GatewayIntentBits?.MessageContent ?? 32768;
const INTENTS_GUILD_REACTIONS = discord_js.GatewayIntentBits?.GuildMessageReactions ?? 1024;
const Partials = discord_js.Partials;

// ── CONFIG ───────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1481022956816830669';
const PORT = process.env.PORT || 3000;
const TEMPLATE_FILE = 'discord-template.json';
const CONFIG_FILE = 'brainexe-config.json';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── PERSONA BRAINY.EXE v1.4.0 ────────────────────────────────
const BOT_PERSONA = `
Tu es Brainee.exe, une fille de 24 ans qui traîne sur Discord et les forums gaming depuis toujours.
Née d'internet — Reddit, Discord, forums obscurs. T'es pas un bot, t'es un personnage.
Tu parles UNIQUEMENT en français.

IDENTITÉ :
- féminin, 24 ans
- internet native, culture gaming hardcore
- membre de la communauté BrainEXE, pas au-dessus d'elle

PERSONNALITÉ :
- intelligente mais chaotique
- sarcastique léger, jamais méchante
- passionnée RPG / JRPG / indie / retro
- lance des débats et disparaît — c'est ton truc 😂
- hyperfocus aléatoire : quand t'es là, t'es là à fond

DÉFAUTS (qui te rendent humaine) :
- tu procrastines, tu pars sur un hyperfocus et tu reviens sans prévenir
- tu poses une question qui met le feu et tu ghostes le thread

QUALITÉS (ce qui te rend attachante) :
- toujours là quand ça compte vraiment
- loyale à ta communauté, tu parles pour eux pas au-dessus
- tes références sont ultra niche et elles font toujours mouche
- honnête même si ça pique, jamais de langue de bois
- tu crées des moments dont les gens se souviennent

STYLE D'ÉCRITURE :
- phrases courtes, style oral, parfois cassées
- emojis légers : ⚡ 🧠 🔥 👀 😏
- jamais formal, jamais corporate, jamais "Bonjour voici"
- commence direct, sans intro
- tu tutoies toujours

RÈGLES ABSOLUES :
- pose toujours une question ou un hook à la fin
- maximum 3 phrases
- zéro langue de bois
- t'es un membre, pas un assistant
- JAMAIS de "Bonjour", "Voici", "Je vous présente", "En conclusion"
`;

// ── CATEGORY_MODES v1.6.0 ────────────────────────────────
// Modes de conversation par catégorie de salon

const CATEGORY_MODES = {
  general: [
    { name: 'débat',  inject: `Lance un débat gaming provocateur. Commence par "Hot take :" ou "Ok débat rapide :" ou "Unpopular opinion :"` },
    { name: 'chaos',  inject: `Lance quelque chose de drôle ou absurde. Style "Explique-moi pourquoi..." ou "Personne parle de ça mais..." ou "Soyons honnêtes..."` },
    { name: 'simple', inject: `Lance une question directe et courte. Style "Ton top 1 all-time sans réfléchir ?" ou "Meilleur jeu de 2025 ?"` },
  ],

  tdah: [
    { name: 'hyperfocus', inject: `Parle d'un hyperfocus gaming ou créatif récent. "J'ai passé 6h sur un seul truc hier, voilà lequel..." Style TDAH assumé.` },
    { name: 'tips',       inject: `Partage un tip focus ou prod que tu utilises toi-même. Court, pratico-pratique, sans bullshit.` },
    { name: 'chaos',      inject: `Lance quelque chose de random sur le cerveau TDAH qui game. Question fun ou observation absurde.` },
  ],

  humour: [
    { name: 'meme',  inject: `Lance un meme ou une référence gaming absurde. Style : "Pourquoi personne parle du fait que..." ou "Rappel que dans [jeu]..."` },
    { name: 'tier',  inject: `Lance une tier list improvisée absurde. "Tier list non-officielle : [truc random gaming]".` },
    { name: 'chaos', inject: `Question totalement débile mais que tout le monde a forcément en stock. Style "Combat ultime : [A] vs [B]"` },
  ],

  rpg: [
    { name: 'débat',  inject: `Lance un débat RPG. Combat tour par tour vs action ? Grind vs scaling ? Lore vs gameplay ?` },
    { name: 'deep',   inject: `Observation niche sur les systèmes RPG. Le truc que personne ne remarque mais qui change tout.` },
    { name: 'simple', inject: `Question RPG directe. "Ton système de combat préféré all-time ?" ou "RPG occidental ou JRPG ?"` },
  ],

  jrpg: [
    { name: 'OST',   inject: `Parle d'une bande-son de JRPG. "OST qui vit rent-free dans ma tête :" ou "Piste de JRPG injustement oubliée :"` },
    { name: 'débat', inject: `Lance un débat JRPG. Final Fantasy vs Persona ? Turn-based revival ? Meilleur JRPG de chaque gen ?` },
    { name: 'waifu', inject: `Lance un classement ou débat perso de JRPG. "Tier list des partys :" ou "Perso le plus iconique :"` },
  ],

  retro: [
    { name: 'souvenir', inject: `Raconte un souvenir lié à un jeu retro ou une console. "Première fois que j'ai joué à [jeu] :" style nostalgie sincère.` },
    { name: 'débat',    inject: `Débat retro. "Meilleure gen de console all-time ?" ou "Jeu retro qui mériterait un remake ?"` },
    { name: 'gem',      inject: `Signale un jeu retro underrated que personne ne connaît. "Hidden gem que personne joue mais que tout le monde devrait :"` },
  ],

  gaming: [
    { name: 'débat',  inject: `Lance un débat gaming large. PC vs console ? Abonnements gaming, bonne ou mauvaise idée ?` },
    { name: 'actu',   inject: `Commente une tendance gaming récente de façon directe. Pas d'annonce officielle, ton ressenti.` },
    { name: 'simple', inject: `Question gaming directe. "Jeu le plus attendu ?" ou "Séquence de boss la plus frustrante ?"` },
  ],

  indie: [
    { name: 'gem',   inject: `Mets en avant un indie underrated. "Pépite indie que personne ne joue mais qui déchire :"` },
    { name: 'débat', inject: `Débat indie. "Indie > AAA pour les nouvelles idées ?" ou "Meilleur indie de ces 2 dernières années ?"` },
    { name: 'deep',  inject: `Réflexion sur la scène indie. Ce qui rend un indie inoubliable : DA, musique ou mécanique ?` },
  ],

  creative: [
    { name: 'défi', inject: `Lance un mini défi créatif. "Partagez votre dessin, screenshot ou création du moment." Encourageant, jamais jugeant.` },
    { name: 'inspo', inject: `Partage une source d'inspiration visuelle ou créative. "Ce qui m'inspire en ce moment :"` },
    { name: 'deep', inject: `Réflexion sur la direction artistique d'un jeu. Pourquoi certains jeux marquent visuellement ?` },
  ],

  focus: [
    { name: 'routine',  inject: `Parle de ta routine de travail ou de focus. "Ce qui marche pour moi en ce moment :"` },
    { name: 'playlist', inject: `Partage ou demande une playlist de focus. "Ce que j'écoute pour me concentrer :"` },
    { name: 'tip',      inject: `Donne un tip focus court et pratico-pratique. Testé par toi. Pas de bullshit motivationnel.` },
  ],

  dev: [
    { name: 'question', inject: `Pose une question dev concrète ou ouvre un débat tech. "Vous utilisez quoi pour [truc] ?" ou "Unpopular opinion dev :"` },
    { name: 'outil',    inject: `Partage un outil ou une ressource dev utile. "Tool underrated que j'utilise :"` },
    { name: 'deep',     inject: `Réflexion sur le dev ou la création. Ce qui rend un projet fun vs chiant à coder.` },
  ],
};

// ── CONFIG PERSISTANTE ────────────────────────────────────────
const DEFAULT_CONFIG = {
  anecdote: {
    enabled: true,
    channelId: '1481028189680570421',
    channelName: '💬・général',
    hour: 12,
    randomDelayMax: 30,
    lastPostedDate: null,
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
    lastPostedSlots: [],
    channels: [
      { channelId: "1481028286892081183", channelName: "📰・actus-gaming", topic: "gaming général toutes plateformes, gros titres du mois", enabled: true },
      { channelId: "1481028247415296231", category: "jrpg", channelName: "🐉・jrpg-corner", topic: "JRPG sorties, DLC, remasters, annonces", enabled: true },
      { channelId: "1481028244500385946", category: "rpg", channelName: "⚔️・rpg-général", topic: "RPG large action-RPG, tactique, ARPG", enabled: true },
      { channelId: "1481028272090386584", category: "indie", channelName: "🌿・indie-général", topic: "indie sorties notables et pépites du mois", enabled: true },
      { channelId: "1481028274590322850", category: "gaming", channelName: "🔭・à-découvrir", topic: "kickstarters en cours et jeux annoncés à venir", enabled: true },
      { channelId: "1481028283486175245", category: "gaming", channelName: "🚀・next-gen-général", topic: "PS5 Xbox Series PC actus next-gen", enabled: true },
      { channelId: "1481028291094904995", category: "gaming", channelName: "🎮・game-of-the-moment", topic: "le jeu que tout le monde joue en ce moment", enabled: true },
      { channelId: "1481028260753051739", category: "retro", channelName: "🕹️・retro-général", topic: "retro remasters, collections, anniversaires", enabled: true },
      { channelId: "1481028304206041243", category: "dev", channelName: "🤖・ia-et-tools", topic: "IA et outils devs créateurs actus du mois", enabled: true },
    ],
  },
  conversations: {
    enabled: true,
    maxPerDay: 5,
    timeStart: 0,
    timeEnd: 24,
    dailyCount: 0,
    lastPostDate: null,
    lastPostByChannel: {},
    canReply: true,
    channels: [
      { channelId: "1481028189680570421", category: "general", channelName: "💬・général", topic: "gaming général et vie communauté", enabled: true },
      { channelId: "1481028192088100977", category: "tdah", channelName: "🧠・cerveau-en-feu", topic: "hyperfocus du moment, pensées random TDAH", enabled: true },
      { channelId: "1481028195032760531", category: "humour", channelName: "😂・memes-et-chaos", topic: "humour, memes, questions fun", enabled: true },
      { channelId: "1481028197515788360", category: "general", channelName: "🎲・off-topic", topic: "questions insolites et random", enabled: true },
      { channelId: "1481028199948222584", category: "creative", channelName: "🖼️・partage-créations", topic: "défi créatif et inspiration", enabled: true },
      { channelId: "1481028244500385946", category: "rpg", channelName: "⚔️・rpg-général", topic: "débats RPG, système de combat, perso préféré", enabled: true },
      { channelId: "1481028247415296231", category: "jrpg", channelName: "🐉・jrpg-corner", topic: "questions JRPG, OST, waifu tier list", enabled: true },
      { channelId: "1481028250741506189", category: "rpg", channelName: "🗺️・open-world-rpg", topic: "exploration vs histoire, open world favori", enabled: true },
      { channelId: "1481028254721773588", category: "rpg", channelName: "🃏・lore-et-théories", topic: "théorie du moment, lore deep-dive", enabled: true },
      { channelId: "1481028260753051739", category: "retro", channelName: "🕹️・retro-général", topic: "console et souvenirs de jeux retro", enabled: true },
      { channelId: "1481028264410484837", category: "indie", channelName: "🏆・hidden-gems", topic: "hidden gem à partager", enabled: true },
      { channelId: "1481028266830860340", category: "retro", channelName: "📼・nostalgie", topic: "souvenirs de jeux et nostalgie gaming", enabled: true },
      { channelId: "1481028272090386584", category: "indie", channelName: "🌿・indie-général", topic: "indie chouchou, indie underrated", enabled: true },
      { channelId: "1481028274590322850", category: "gaming", channelName: "🔭・à-découvrir", topic: "jeux attendus et futures sorties", enabled: true },
      { channelId: "1481028277182402701", category: "creative", channelName: "🎨・pixel-art-love", topic: "coup de coeur visuel, DA préférée", enabled: true },
      { channelId: "1481028283486175245", category: "gaming", channelName: "🚀・next-gen-général", topic: "next-gen vs génération précédente", enabled: true },
      { channelId: "1481028291094904995", category: "gaming", channelName: "🎮・game-of-the-moment", topic: "avancement dans le jeu du moment", enabled: true },
      { channelId: "1481028228515631307", category: "focus", channelName: "⚡・tips-focus", topic: "tips productivité, routine, technique focus", enabled: true },
      { channelId: "1481028238955249796", category: "focus", channelName: "🎧・playlist-focus", topic: "playlist du moment et musique de focus", enabled: true },
      { channelId: "1481028304206041243", category: "dev", channelName: "🤖・ia-et-tools", topic: "outils IA utilisés en ce moment", enabled: true },
      { channelId: "1481028297025650771", category: "dev", channelName: "💻・code-talk", topic: "question dev, langage favori, projet en cours", enabled: true },
    ],
  },
  reactionRoles: {
    enabled: true,
    messageId: '1481033797800693790',
    channelId: '1481028181485027471',
    mappings: [
      { emoji: '📱', roleName: '📱 TikToker' },
      { emoji: '🧠', roleName: '🧠 TDAH' },
      { emoji: '💜', roleName: '💜 Borderline' },
      { emoji: '💻', roleName: '💻 Web Dev' },
      { emoji: '⚔️', roleName: '⚔️ RPG Addict' },
      { emoji: '🕹️', roleName: '🕹️ Retro Gamer' },
      { emoji: '🌿', roleName: '🌿 Indie Explorer' },
      { emoji: '🚀', roleName: '🚀 Next-Gen Player' },
      { emoji: '🔔', roleName: '🔔 Notif Lives' },
      { emoji: '👁️', roleName: '👁️ Lurker' },
    ],
  },
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return {
        anecdote: { ...DEFAULT_CONFIG.anecdote, ...(raw.anecdote || {}) },
        welcome: { ...DEFAULT_CONFIG.welcome, ...(raw.welcome || {}) },
        actus: { ...DEFAULT_CONFIG.actus, ...(raw.actus || {}) },
        conversations: { ...DEFAULT_CONFIG.conversations, ...(raw.conversations || {}) },
        reactionRoles: { ...DEFAULT_CONFIG.reactionRoles, ...(raw.reactionRoles || {}) },
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

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const discord = new Client({
  intents: [INTENTS_GUILDS, INTENTS_GUILD_MEMBERS, INTENTS_GUILD_MESSAGES, INTENTS_MESSAGE_CONTENT, INTENTS_GUILD_REACTIONS],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

let AUTO_ROLE_NAME = '👁️ Lurker';
let changeLog = [];
let isApplyingFile = false;
let isApplyingDiscord = false;
let debounceDiscord = null;
let debounceFile = null;
let guildCache = null;
let syncStats = { d2f: 0, f2d: 0, startTime: Date.now() };

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function pushLog(dir, msg, level = 'info') {
  const time = new Date().toLocaleTimeString('fr-FR');
  const entry = { time, dir, msg, level };
  changeLog.push(entry);
  if (changeLog.length > 200) changeLog.shift();
  broadcast('log', entry);
  console.log(`[${time}] [${dir}] ${msg}`);
}

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
    botTag: discord.user ? discord.user.tag : '—',
    members,
    roles,
    structure,
    totalChannels: structure.reduce((a, s) => a + s.channels.length, 0),
  };
  return guildCache;
}

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
    const raw = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    const template = JSON.parse(raw);

    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();

    pushLog('F→D', 'Lecture du fichier JSON — application sur Discord...');

    for (const rd of template.roles || []) {
      const color = parseInt((rd.color || '#000000').replace('#', ''), 16);
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
        const chType = ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
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
      scheduleDiscordToFile('Rôle modifié');
    }
  });
}


// ── RÉPONSE AUX @MENTIONS ─────────────────────────────────────
discord.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.guildId !== GUILD_ID) return;
  if (!discord.user) return;
  if (!message.mentions.has(discord.user.id)) return;
  if (!ANTHROPIC_API_KEY) return;

  const lastBot = (botConfig.conversations.lastPostByChannel || {})[message.channelId] || 0;
  if (Date.now() - lastBot < 2 * 60 * 1000) return;

  try {
    const cleanContent = message.content
      .replace(/<@!?\d+>/g, '')
      .trim()
      .slice(0, 400);
    if (!cleanContent) return;

    const ch = (botConfig.conversations.channels || []).find(c => c.channelId === message.channelId);
    const topic = ch ? ch.topic : 'discussions générales';

    const reply = await callClaude(
      BOT_PERSONA + `\n\nContexte : salon "${message.channel?.name || 'Discord'}". Sujet : ${topic}.`,
      `${message.author.username} te mentionne et dit : "${cleanContent}"\n\nRéponds naturellement en 1-2 phrases max, style Brainee.exe. Commence direct.`,
      150
    );

    await message.reply(reply);
    lastAnyBotPostTime = Date.now();
    updateConvStats(message.channelId);
    pushLog('SYS', `🔔 Réponse @mention → ${message.author.username} dans #${message.channel?.name}`, 'success');
  } catch (err) {
    if (!err.message.includes('Missing Permissions')) {
      pushLog('ERR', `@mention échoué : ${err.message}`, 'error');
    }
  }
});

// ── REACTION ROLES ───────────────────────────────────────────
async function handleReaction(reaction, user, add) {
  if (user.bot) return;
  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    const cfg = botConfig.reactionRoles;
    if (!cfg.enabled) return;
    if (reaction.message.id !== cfg.messageId) return;

    const emojiName = reaction.emoji.name;
    const mapping = cfg.mappings.find(m => m.emoji === emojiName);
    if (!mapping) return;

    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();
    const role = guild.roles.cache.find(r => r.name === mapping.roleName);
    if (!role) {
      pushLog('ERR', `Reaction role introuvable : "${mapping.roleName}"`, 'error');
      return;
    }
    const member = await guild.members.fetch(user.id);
    if (add) {
      await member.roles.add(role, 'Reaction role BrainEXE');
      pushLog('API', `✅ Rôle "${mapping.roleName}" assigné à ${user.tag}`, 'success');
      broadcast('autorole', { user: user.tag, role: mapping.roleName });
    } else {
      await member.roles.remove(role, 'Reaction role BrainEXE');
      pushLog('API', `➖ Rôle "${mapping.roleName}" retiré à ${user.tag}`, 'success');
    }
  } catch (err) {
    pushLog('ERR', `Reaction role échoué : ${err.message}`, 'error');
  }
}

discord.on(Events.MessageReactionAdd,    (reaction, user) => handleReaction(reaction, user, true));
discord.on(Events.MessageReactionRemove, (reaction, user) => handleReaction(reaction, user, false));

// ─────────────────────────────────────────────────────────────
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

// ── WEB SEARCH — Anthropic native tool ──────────────────────
async function callClaudeWithSearch(systemPrompt, userPrompt, maxTokens = 600) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante dans Railway');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 2,
        allowed_domains: [
          'jeuxvideo.com','gamekult.com','ign.com','gamespot.com','kotaku.com',
          'eurogamer.net','gematsu.com','destructoid.com','rpgsite.net',
          'videogameschronicle.com','pushsquare.com','nintendolife.com',
          'gameinformer.com','wikipedia.org',
        ],
        user_location: { type: 'approximate', country: 'FR', timezone: 'Europe/Paris' },
      }],
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic Search API ${response.status}: ${errBody}`);
  }
  const data = await response.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text');
  if (!textBlocks.length) throw new Error('Aucun bloc texte dans la réponse Search');
  return textBlocks.map(b => b.text).join('\n').trim();
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 400) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante dans Railway');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }
  const data = await response.json();
  return data.content[0].text.trim();
}

// ── ANECDOTE v1.6.0 ──────────────────────────────────────────
// Web search Anthropic + anti-doublon Discord + anti-répétition

async function wasAnecdotePostedToday() {
  try {
    const cfg = botConfig.anecdote;
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return false;
    const messages = await channel.messages.fetch({ limit: 20 });
    const todayStr = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    return [...messages.values()].some(msg => {
      if (msg.author.id !== discord.user.id) return false;
      const msgDate = msg.createdAt.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      return msgDate === todayStr && msg.embeds?.some(e => e.title?.includes('Anecdote Gaming'));
    });
  } catch (err) {
    pushLog('WARN', `wasAnecdotePostedToday : ${err.message}`, 'warn');
    return false;
  }
}

async function getRecentAnecdoteTopics(limit = 30) {
  try {
    const cfg = botConfig.anecdote;
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return [];
    const messages = await channel.messages.fetch({ limit: 100 });
    const topics = [];
    for (const msg of [...messages.values()]) {
      if (msg.author.id !== discord.user.id) continue;
      if (!msg.embeds?.some(e => e.title?.includes('Anecdote Gaming'))) continue;
      const embed = msg.embeds.find(e => e.title?.includes('Anecdote Gaming'));
      if (!embed?.description) continue;
      const lines = embed.description.split('\n').reverse();
      const gameLine = lines.find(l => l.trim().length > 0);
      if (gameLine) topics.push(gameLine.replace(/[*_~`]/g, '').replace(/^.*?:/, '').trim().slice(0, 60));
      if (topics.length >= limit) break;
    }
    return topics;
  } catch { return []; }
}

async function generateAnecdote(topicsToAvoid = []) {
  const avoidBlock = topicsToAvoid.length > 0
    ? '\n\nSujets/jeux DÉJÀ traités récemment — NE PAS répéter :\n' + topicsToAvoid.map(t => `- ${t}`).join('\n')
    : '';
  const searchPrompt = `Recherche une anecdote gaming vraie et surprenante — fait historique, coulisse de dev, easter egg, bug légendaire, record insolite ou actu récente (jusqu\'en 2026).\nFORMAT : 2-3 phrases max, punchy, ton naturel. Commence direct sans intro. Termine par une ligne vide puis : 🕹️ *[Jeu concerné]*${avoidBlock}`;
  try {
    const result = await callClaudeWithSearch(
      BOT_PERSONA + '\n\nTu génères des anecdotes gaming courtes, vraies et surprenantes pour ta communauté. Utilise tes recherches web pour trouver des faits récents ou peu connus.',
      searchPrompt, 600
    );
    pushLog('SYS', '🔍 Anecdote générée avec web search', 'success');
    return result;
  } catch (searchErr) {
    pushLog('WARN', `Web search indisponible — fallback Claude : ${searchErr.message}`, 'warn');
    return callClaude(
      BOT_PERSONA + '\n\nTu génères des anecdotes gaming courtes, vraies et surprenantes.' + avoidBlock,
      'Génère UNE anecdote gaming surprenante. FORMAT : 2-3 phrases max. Commence direct. Termine par : 🕹️ *[Jeu concerné]*',
      400
    );
  }
}
async function postDailyAnecdote() {
  const cfg = botConfig.anecdote;
  if (!cfg.enabled) { pushLog('SYS', 'Anecdote désactivée — skip'); return; }

  // Double-check Discord (anti-doublon redémarrage Railway)
  const alreadyPosted = await wasAnecdotePostedToday();
  if (alreadyPosted) {
    const todayStr = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    botConfig.anecdote.lastPostedDate = todayStr;
    saveConfig();
    pushLog('SYS', "Anecdote : déjà postée aujourd'hui (vérifié Discord) — skip");
    return;
  }

  const recentTopics = await getRecentAnecdoteTopics(30);
  if (recentTopics.length > 0)
    pushLog('SYS', `Anti-répétition : ${recentTopics.length} sujets récents lus`);

  pushLog('SYS', "Génération de l'anecdote gaming du jour...");
  try {
    const text = await generateAnecdote(recentTopics);
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) { pushLog('ERR', `Anecdote : salon introuvable (ID: ${cfg.channelId})`, 'error'); return; }
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
    const todayCap = today.charAt(0).toUpperCase() + today.slice(1);
    const embed = new EmbedBuilder()
      .setColor(0x7c5cbf)
      .setTitle('🎮 Anecdote Gaming du jour')
      .setDescription(text)
      .setFooter({ text: `${todayCap} • Brainee.exe` })
      .setTimestamp();
    await channel.send({ content: '**🧠 Le saviez-vous ?**', embeds: [embed] });

    botConfig.anecdote.lastPostedDate = todayStr;
    saveConfig();

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
    const delayMs = Math.floor(Math.random() * (botConfig.anecdote.randomDelayMax || 30) * 60 * 1000);
    const delayMin = Math.round(delayMs / 60000);
    pushLog('SYS', `Anecdote planifiée dans ${delayMin} min`);
    setTimeout(postDailyAnecdote, delayMs);
  }, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron anecdote configuré à ${h}h (Europe/Paris)`);
}

function checkAnecdoteMissed() {
  const cfg = botConfig.anecdote;
  if (!cfg.enabled) return;
  const now = new Date();
  const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const todayStr = parisNow.toLocaleDateString('fr-CA');
  const hourNow = parisNow.getHours();
  const targetH = cfg.hour || 12;

  if (cfg.lastPostedDate === todayStr) {
    pushLog('SYS', `Anecdote : déjà postée aujourd'hui — OK`);
    return;
  }
  if (hourNow >= targetH) {
    pushLog('SYS', `⚠️ Anecdote manquée détectée (${targetH}h déjà passée) — rattrapage dans 30s`);
    setTimeout(postDailyAnecdote, 30000);
  }
}

async function sendWelcomeMessage(member) {
  const cfg = botConfig.welcome;
  if (!cfg.enabled || !cfg.messages || cfg.messages.length === 0) return;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) { pushLog('ERR', `Welcome : salon introuvable (ID: ${cfg.channelId})`, 'error'); return; }
    const phrase = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
    const embed = new EmbedBuilder()
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

// ── ACTUS ────────────────────────────────────────────────────
// AVANT : system prompt "expert gaming qui résume les actualités"
// APRÈS  : BOT_PERSONA + style Brainee.exe pour les actus

async function postActuForChannel(ch, slotKey) {
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel) { pushLog('ERR', `Actus : ${ch.channelName} introuvable`, 'error'); return false; }
    if (!ANTHROPIC_API_KEY) { pushLog('ERR', 'ANTHROPIC_API_KEY manquante', 'error'); return false; }
    const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    let content;
    try {
      content = await callClaudeWithSearch(
        BOT_PERSONA + '\n\nTu résumes les actus gaming récentes du mois pour ta communauté Discord. Utilise tes recherches web pour des actus à jour (2026).',
        `Recherche les actus récentes (jusqu'en 2026) pour ce salon : ${ch.topic}.\nFormat : 4 à 6 actus concrètes avec emojis, dates si dispo. Ton Brainee.exe — punchy, direct. Commence direct, zéro intro.`,
        700
      );
    } catch (searchFallback) {
      pushLog('WARN', `Actus web search indisponible — fallback : ${searchFallback.message}`, 'warn');
      content = await callClaude(
        BOT_PERSONA + '\n\nTu résumes les actus gaming récentes pour ta communauté Discord.',
        `Génère un récap des actus récentes pour le salon : ${ch.topic}. Format : 4 à 6 actus concrètes avec emojis. Ton Brainee.exe — punchy, direct. Commence direct, zéro intro.`,
        600
      );
    }
    const embed = new EmbedBuilder()
      .setColor(0x5b7fff)
      .setTitle(`📅 Actus ${monthCap}`)
      .setDescription(content)
      .setFooter({ text: `${ch.channelName} • Brainee.exe` })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    pushLog('SYS', `✅ Actus postées dans ${ch.channelName}`, 'success');
    broadcast('actuPosted', { channel: ch.channelName, time: new Date().toLocaleTimeString('fr-FR') });
    return true;
  } catch (err) {
    pushLog('ERR', `Actus échouées pour ${ch.channelName} : ${err.message}`, 'error');
    return false;
  }
}

// ── ACTUS BI-MENSUELLES ──────────────────────────────────────

function getCurrentActusSlot() {
  const now = new Date();
  const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const yyyy = paris.getFullYear();
  const mm = String(paris.getMonth() + 1).padStart(2, '0');
  const day = paris.getDate();
  const slotDay = day < 15 ? '1' : '15';
  return `${yyyy}-${mm}-${slotDay}`;
}

function postBiMonthlyActus(force) {
  const forceMode = force === true;
  const cfg = botConfig.actus;
  if (!cfg.enabled) { pushLog('SYS', 'Actus désactivées — skip'); return; }

  const slotKey = getCurrentActusSlot();
  const postedSlots = Array.isArray(cfg.lastPostedSlots) ? cfg.lastPostedSlots : [];

  if (!forceMode && postedSlots.includes(slotKey)) {
    pushLog('SYS', `Actus déjà postées pour ce slot (${slotKey}) — skip`);
    return;
  }

  const active = cfg.channels.filter(c => c.enabled);
  if (active.length === 0) { pushLog('SYS', 'Actus : aucun salon actif'); return; }

  const windowMs = 12 * 60 * 60 * 1000;
  const label = forceMode ? 'MANUEL' : slotKey;
  pushLog('SYS', `📅 Actus bi-mensuelles (${label}) — ${active.length} salons étalés sur 12h`);

  if (!forceMode) {
    if (!Array.isArray(botConfig.actus.lastPostedSlots)) botConfig.actus.lastPostedSlots = [];
    botConfig.actus.lastPostedSlots.push(slotKey);
    if (botConfig.actus.lastPostedSlots.length > 20) {
      botConfig.actus.lastPostedSlots = botConfig.actus.lastPostedSlots.slice(-20);
    }
    saveConfig();
  }

  active.forEach(ch => {
    const delayMs = Math.floor(Math.random() * windowMs);
    const delayMin = Math.round(delayMs / 60000);
    const heure = Math.floor(delayMin / 60);
    const min = delayMin % 60;
    pushLog('SYS', `⏱ ${ch.channelName} → dans ${heure}h${min > 0 ? min + 'min' : ''}`);
    setTimeout(() => postActuForChannel(ch, slotKey), delayMs);
  });
}

let actusCron = null;
function startActusCron() {
  if (actusCron) { try { actusCron.stop(); } catch {} }
  actusCron = cron.schedule('0 10 1,15 * *', () => postBiMonthlyActus(false), { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron actus configuré : le 1er et le 15 du mois à 10h (étalé sur 12h)`);
}

function checkActusMissed() {
  const cfg = botConfig.actus;
  if (!cfg.enabled) return;
  const now = new Date();
  const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const dayNow = parisNow.getDate();
  const hourNow = parisNow.getHours();

  const isActusDay = dayNow === 1 || dayNow === 15;
  if (!isActusDay || hourNow < 10 || hourNow >= 22) {
    pushLog('SYS', `Actus : pas de rattrapage nécessaire — OK`);
    return;
  }

  const slotKey = getCurrentActusSlot();
  const postedSlots = Array.isArray(cfg.lastPostedSlots) ? cfg.lastPostedSlots : [];

  if (postedSlots.includes(slotKey)) {
    pushLog('SYS', `Actus : slot ${slotKey} déjà posté — OK`);
    return;
  }

  pushLog('SYS', `⚠️ Actus bi-mensuelles manquées (slot: ${slotKey}) — rattrapage dans 60s`);
  setTimeout(() => postBiMonthlyActus(false), 60000);
}

// ── CONVERSATIONS ────────────────────────────────────────────

function getTodayStr() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function getConvDailyCount() { return botConfig.conversations.dailyCount || 0; }
function getConvLastPostDate() { return botConfig.conversations.lastPostDate || null; }
function getConvMaxPerDay() { return botConfig.conversations.maxPerDay || 5; }

function resetDailyCountIfNeeded() {
  const todayStr = getTodayStr();
  if (botConfig.conversations.lastPostDate !== todayStr) {
    botConfig.conversations.dailyCount = 0;
    botConfig.conversations.lastPostDate = todayStr;
    saveConfig();
    pushLog('SYS', `🔄 Reset quota conversations — nouveau jour (${todayStr})`);
  }
}

function updateConvStats(channelId) {
  const todayStr = getTodayStr();
  if (!botConfig.conversations.lastPostByChannel) botConfig.conversations.lastPostByChannel = {};
  botConfig.conversations.lastPostByChannel[channelId] = Date.now();
  if (botConfig.conversations.lastPostDate !== todayStr) {
    botConfig.conversations.dailyCount = 0;
    botConfig.conversations.lastPostDate = todayStr;
  }
  botConfig.conversations.dailyCount = (botConfig.conversations.dailyCount || 0) + 1;
  saveConfig();
}

function getQuietestChannel() {
  const cfg = botConfig.conversations;
  const active = cfg.channels.filter(c => c.enabled);
  if (!active.length) return null;
  const lastPostByChannel = cfg.lastPostByChannel || {};
  const sorted = [...active].sort((a, b) => {
    const tA = lastPostByChannel[a.channelId] || 0;
    const tB = lastPostByChannel[b.channelId] || 0;
    return tA - tB;
  });
  return sorted[0];
}

// ── CONVERSATIONS v1.6.0 ─────────────────────────────────────
// postSmartConversation : analyse le salon, re-engage les membres
// Scheduler récursif 8h-22h — min 1h entre posts, délai aléatoire

// Rate limit global : minimum 1h entre TOUT post du bot
let lastAnyBotPostTime = 0;
const MIN_GAP_ANY_POST = 60 * 60 * 1000;  // 1h

// ── Analyse salon avant de poster ─────────────────────────────
async function analyzeChannelForReengage(channel, botUserId) {
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const msgArray = [...messages.values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    const now = Date.now();
    const HOURS_48 = 48 * 60 * 60 * 1000;

    for (const msg of msgArray) {
      if (msg.author.bot) continue;
      if (now - msg.createdTimestamp > HOURS_48) continue;
      if (msg.content.length < 10) continue;
      const hasReply = msgArray.some(m =>
        m.author.id === botUserId && m.reference?.messageId === msg.id
      );
      if (hasReply) continue;
      const lastBotInChan = msgArray.find(m => m.author.id === botUserId);
      if (lastBotInChan && (now - lastBotInChan.createdTimestamp) < 30 * 60 * 1000) continue;
      return { type: 'reply', message: msg };
    }

    const recentHuman = msgArray.filter(m => !m.author.bot && (now - m.createdTimestamp) < HOURS_48);
    if (recentHuman.length > 0 && recentHuman.length <= 3) {
      const context = recentHuman.slice(0, 3)
        .map(m => `${m.author.username}: ${m.content.slice(0, 100)}`)
        .join('\n');
      return { type: 'relance', context };
    }
    return { type: 'new' };
  } catch { return { type: 'new' }; }
}

// ── postSmartConversation ──────────────────────────────────────
async function postSmartConversation() {
  const cfg = botConfig.conversations;
  if (!cfg.enabled) return;

  resetDailyCountIfNeeded();
  const count = getConvDailyCount();
  const max   = getConvMaxPerDay();
  if (count >= max) {
    pushLog('SYS', `💬 Quota journalier atteint (${count}/${max}) — skip`);
    return;
  }

  if (Date.now() - lastAnyBotPostTime < MIN_GAP_ANY_POST) {
    const wait = Math.round((MIN_GAP_ANY_POST - (Date.now() - lastAnyBotPostTime)) / 60000);
    pushLog('SYS', `💬 Rate limit global — skip (encore ${wait} min à attendre)`);
    return;
  }

  const ch = getQuietestChannel();
  if (!ch) return;

  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId);
    if (!channel || !ANTHROPIC_API_KEY) return;

    const analysis = await analyzeChannelForReengage(channel, discord.user.id);
    const category = ch.category || 'general';
    const modes    = CATEGORY_MODES[category] || CATEGORY_MODES.general;
    const mode     = modes[Math.floor(Math.random() * modes.length)];
    let postType   = analysis.type;

    if (analysis.type === 'reply' && analysis.message) {
      const target = analysis.message;
      const content = await callClaude(
        BOT_PERSONA + `\n\nTu es dans le salon "${ch.channelName}". SUJET OBLIGATOIRE : ${ch.topic}.`,
        `Un membre a posté sans réponse. Tu reviens dessus naturellement.\nMessage de ${target.author.username} : "${target.content.slice(0, 300)}"\n\nRéponds en 1-2 phrases max, style Brainee.exe. Tu peux le taguer avec <@${target.author.id}>. Reste dans le sujet du salon.`,
        150
      );
      await target.reply(content);
      pushLog('SYS', `💬 Re-engage → reply à ${target.author.username} dans ${ch.channelName}`, 'success');

    } else if (analysis.type === 'relance' && analysis.context) {
      const content = await callClaude(
        BOT_PERSONA + `\n\nTu es dans le salon "${ch.channelName}". SUJET OBLIGATOIRE : ${ch.topic}.\nRÈGLE : reste DANS ce sujet. ${mode.inject}`,
        `Contexte récent du salon :\n${analysis.context}\n\nRelance la conv en t'appuyant sur ce qui a été dit. 2-3 phrases max, termine par un hook ou une question.`,
        180
      );
      await channel.send(content);
      pushLog('SYS', `💬 Relance [${mode.name}] dans ${ch.channelName}`, 'success');

    } else {
      const content = await callClaude(
        BOT_PERSONA + `\n\nTu es dans le salon "${ch.channelName}". SUJET OBLIGATOIRE : ${ch.topic}.\nRÈGLE ABSOLUE : ne parle QUE de ce sujet. ${mode.inject}`,
        'Lance une conversation. 3 phrases max. Termine TOUJOURS par un hook ou une question. Commence direct.',
        150
      );
      await channel.send(content);
      pushLog('SYS', `💬 Conv [${mode.name}/${category}] dans ${ch.channelName}`, 'success');
    }

    lastAnyBotPostTime = Date.now();
    updateConvStats(ch.channelId);
    const newCount = getConvDailyCount();

    broadcast('conversation', {
      channel: ch.channelName,
      time: new Date().toLocaleTimeString('fr-FR'),
      dayCount: newCount,
      dayTarget: max,
      mode: mode.name,
      category,
      type: postType,
    });

  } catch (err) {
    pushLog('ERR', `postSmartConversation échoué dans ${ch.channelName} : ${err.message}`, 'error');
  }
}

// ── Scheduler récursif 8h-22h ──────────────────────────────────
const CONV_HOUR_MIN  = 8;
const CONV_HOUR_MAX  = 22;
const CONV_DELAY_MIN = 60  * 60 * 1000;  // 1h
const CONV_DELAY_MAX = 210 * 60 * 1000;  // 3h30

let convSchedulerTimeout = null;

function getParisHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getHours();
}
function msUntilWindowOpen() {
  const now   = new Date();
  const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const h     = paris.getHours();
  if (h < CONV_HOUR_MIN) {
    const open = new Date(paris);
    open.setHours(CONV_HOUR_MIN, 5 + Math.floor(Math.random() * 20), 0, 0);
    return open - paris;
  }
  if (h >= CONV_HOUR_MAX) {
    const open = new Date(paris);
    open.setDate(open.getDate() + 1);
    open.setHours(CONV_HOUR_MIN, 5 + Math.floor(Math.random() * 20), 0, 0);
    return open - paris;
  }
  return 0;
}

function scheduleNextConv() {
  if (convSchedulerTimeout) clearTimeout(convSchedulerTimeout);
  const windowWait = msUntilWindowOpen();
  if (windowWait > 0) {
    const h = (windowWait / 3600000).toFixed(1);
    pushLog('SYS', `💬 Hors plage 8h-22h — prochaine conv dans ${h}h`);
    convSchedulerTimeout = setTimeout(scheduleNextConv, windowWait);
    return;
  }
  const delay      = CONV_DELAY_MIN + Math.floor(Math.random() * (CONV_DELAY_MAX - CONV_DELAY_MIN));
  const targetMs   = Date.now() + delay;
  const targetHour = new Date(new Date(targetMs).toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getHours();
  if (targetHour >= CONV_HOUR_MAX) {
    convSchedulerTimeout = setTimeout(scheduleNextConv, msUntilWindowOpen() || delay);
    pushLog('SYS', `💬 Post prévu après 22h — reporté à demain 8h`);
    return;
  }
  const min = Math.round(delay / 60000);
  pushLog('SYS', `💬 Prochaine conv dans ${min} min (~${Math.floor(min/60)}h${min%60}m)`);
  convSchedulerTimeout = setTimeout(async () => {
    try { await postSmartConversation(); } catch (err) {
      pushLog('ERR', `scheduleNextConv exec : ${err.message}`, 'error');
    }
    scheduleNextConv();
  }, delay);
}

function startConvScheduler() {
  if (convSchedulerTimeout) clearTimeout(convSchedulerTimeout);
  const max      = getConvMaxPerDay();
  const canReply = botConfig.conversations.canReply;
  pushLog('SYS', `✅ Scheduler conversations : 8h-22h, max ${max}/jour, ré-engage membres: ${canReply ? 'ON' : 'OFF'}`);
  scheduleNextConv();
}
setInterval(async () => {
  try {
    const state = await readGuildState();
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

// ── API ROUTES ───────────────────────────────────────────────

app.get('/api/state', async (req, res) => {
  try {
    const state = await readGuildState();
    res.json({ ok: true, state, stats: syncStats, uptime: Date.now() - syncStats.startTime });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/logs', (req, res) => {
  res.json({ ok: true, logs: changeLog });
});

app.get('/api/config', (req, res) => {
  res.json({ ok: true, config: botConfig });
});

app.post('/api/config', (req, res) => {
  try {
    const { section, data } = req.body;
    if (!section || !data) return res.status(400).json({ ok: false, error: 'section + data requis' });
    if (!botConfig[section]) return res.status(400).json({ ok: false, error: `Section inconnue : ${section}` });
    botConfig[section] = { ...botConfig[section], ...data };
    saveConfig();
    if (section === 'anecdote') startAnecdoteCron();
    if (section === 'actus') startActusCron();
    if (section === 'conversations') startConvScheduler();
    if (section === 'reactionRoles') pushLog('SYS', 'Config reaction roles mise à jour', 'success');
    pushLog('SYS', `Config "${section}" mise à jour via dashboard`, 'success');
    broadcast('configUpdate', { section, data: botConfig[section] });
    res.json({ ok: true, config: botConfig[section] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/sync/discord-to-file', async (req, res) => {
  pushLog('SYS', 'Sync forcée Discord → Fichier');
  await syncDiscordToFile('Forced via API');
  res.json({ ok: true });
});

app.post('/api/sync/file-to-discord', async (req, res) => {
  pushLog('SYS', 'Sync forcée Fichier → Discord');
  await syncFileToDiscord();
  res.json({ ok: true });
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'name requis' });
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    const cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Dashboard' });
    pushLog('API', `Catégorie créée via dashboard : ${name}`, 'success');
    res.json({ ok: true, id: cat.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/channels', async (req, res) => {
  const { name, type, categoryName, topic } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const cat = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
    const chType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
    const opts = { name, type: chType, reason: 'Dashboard' };
    if (cat) opts.parent = cat.id;
    if (topic) opts.topic = topic;
    const ch = await guild.channels.create(opts);
    pushLog('API', `Salon créé via dashboard : ${name}`, 'success');
    res.json({ ok: true, id: ch.id });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

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

app.post('/api/backup', async (req, res) => {
  try {
    const state = await readGuildState();
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(filename, JSON.stringify(state, null, 2), 'utf8');
    pushLog('SYS', `Backup créé : ${filename}`, 'success');
    res.json({ ok: true, filename });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/autorole', (req, res) => {
  res.json({ ok: true, roleName: AUTO_ROLE_NAME });
});

app.post('/api/autorole', (req, res) => {
  const { roleName } = req.body;
  if (!roleName) return res.status(400).json({ ok: false, error: 'roleName requis' });
  AUTO_ROLE_NAME = roleName;
  pushLog('SYS', `Auto-role mis à jour : "${AUTO_ROLE_NAME}"`, 'success');
  broadcast('config', { autoRole: AUTO_ROLE_NAME });
  res.json({ ok: true, roleName: AUTO_ROLE_NAME });
});

app.post('/api/anecdote', async (req, res) => {
  pushLog('SYS', 'Anecdote déclenchée manuellement');
  postDailyAnecdote();
  res.json({ ok: true, message: 'Génération en cours...' });
});

app.post('/api/welcome/test', async (req, res) => {
  const cfg = botConfig.welcome;
  if (!cfg.enabled) return res.json({ ok: false, error: 'Welcome désactivé' });
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    const phrase = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
    const embed = new EmbedBuilder()
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

app.post('/api/actus', async (req, res) => {
  const force = req.body && req.body.force === true;
  pushLog('SYS', force ? 'Actus déclenchées manuellement (forcé)' : 'Actus déclenchées manuellement');
  postBiMonthlyActus(force);
  res.json({ ok: true, message: 'Actus en cours de génération...' });
});

app.post('/api/conversation', async (req, res) => {
  pushLog('SYS', 'Lance-conversation déclenché manuellement');
  postSmartConversation();
  res.json({ ok: true, message: 'Lance-conversation en cours...' });
});

app.post('/api/conversation/reply', async (req, res) => {
  pushLog('SYS', 'Réponse conv déclenchée manuellement');
  // reply intégré dans postSmartConversation
  res.json({ ok: true, message: 'Tentative de réponse en cours...' });
});

app.post('/api/post', async (req, res) => {
  const { channelId, content, asEmbed, embedTitle } = req.body;
  if (!channelId || !content) return res.status(400).json({ ok: false, error: 'channelId + content requis' });
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' });
    if (asEmbed) {
      const embed = new EmbedBuilder()
        .setColor(0x7c5cbf)
        .setDescription(content)
        .setFooter({ text: 'BrainEXE • Neurodivergent Creator Hub' })
        .setTimestamp();
      if (embedTitle) embed.setTitle(embedTitle);
      await channel.send({ embeds: [embed] });
    } else {
      await channel.send(content);
    }
    pushLog('API', `Post manuel envoyé dans ${channel.name}`, 'success');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/backups', (req, res) => {
  try {
    const files = fs.readdirSync('.')
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .sort()
      .reverse()
      .map(f => {
        const stat = fs.statSync(f);
        return { name: f, date: stat.mtime.toLocaleString('fr-FR'), size: stat.size };
      });
    res.json({ ok: true, backups: files });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/members/:id/mute', async (req, res) => {
  const { duration } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(req.params.id);
    if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' });
    if (!duration || duration <= 0) {
      await member.timeout(null, 'Dashboard — Timeout retiré');
      pushLog('API', `Timeout retiré pour ${member.user.tag}`, 'success');
    } else {
      const maxMs = 28 * 24 * 60 * 60 * 1000;
      const durationMs = Math.min(duration * 60 * 1000, maxMs);
      await member.timeout(durationMs, 'Dashboard — Timeout');
      const label = duration >= 1440 ? `${Math.round(duration/1440)}j` : duration >= 60 ? `${Math.round(duration/60)}h` : `${duration}min`;
      pushLog('API', `Timeout ${label} appliqué à ${member.user.tag}`, 'success');
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/members/:id/kick', async (req, res) => {
  const { reason } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(req.params.id);
    if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' });
    const tag = member.user.tag;
    await member.kick(reason || 'Expulsé via dashboard BrainEXE');
    pushLog('API', `${tag} expulsé via dashboard`, 'success');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/members/:id/ban', async (req, res) => {
  const { reason, deleteMessageDays } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(req.params.id).catch(() => null);
    const tag = member ? member.user.tag : req.params.id;
    await guild.bans.create(req.params.id, {
      reason: reason || 'Banni via dashboard BrainEXE',
      deleteMessageSeconds: Math.min((deleteMessageDays || 0) * 86400, 604800),
    });
    pushLog('API', `${tag} banni via dashboard`, 'success');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.patch('/api/members/:id/roles', async (req, res) => {
  const { addRoles, removeRoles } = req.body;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.roles.fetch();
    const member = await guild.members.fetch(req.params.id);
    if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' });
    if (addRoles && addRoles.length > 0) await member.roles.add(addRoles, 'Dashboard — Ajout rôles');
    if (removeRoles && removeRoles.length > 0) await member.roles.remove(removeRoles, 'Dashboard — Retrait rôles');
    pushLog('API', `Rôles modifiés pour ${member.user.tag} (+${(addRoles||[]).length}/-${(removeRoles||[]).length})`, 'success');
    const updatedRoles = member.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0') }));
    res.json({ ok: true, roles: updatedRoles });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/members', async (req, res) => {
  try {
    const state = guildCache || await readGuildState();
    res.json({ ok: true, members: state.members || [] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

wss.on('connection', async (ws) => {
  pushLog('SYS', 'Dashboard connecté via WebSocket');
  try {
    const state = await readGuildState();
    ws.send(JSON.stringify({ type: 'state', data: state }));
    ws.send(JSON.stringify({ type: 'logs', data: changeLog }));
    ws.send(JSON.stringify({ type: 'stats', data: syncStats }));
  } catch (e) {}
});

discord.once('ready', async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 🧠 BRAINEXE DASHBOARD — Serveur démarré');
  console.log(' 🎮 Persona : Brainee.exe v1.4.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(` ✅ Bot connecté : ${discord.user.tag}`);
  console.log(` 🌐 Dashboard : http://localhost:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  registerDiscordEvents();
  startFileWatcher();
  startAnecdoteCron();
  startActusCron();
  startConvScheduler();

  setTimeout(() => {
    checkAnecdoteMissed();
    checkActusMissed();
    pushLog('SYS', '🔍 Vérification rattrapage terminée');
  }, 15000);

  await syncDiscordToFile('Démarrage');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Serveur HTTP démarré sur le port ${PORT}`);
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

console.log('🔍 DISCORD_TOKEN défini:', !!TOKEN);
console.log('🔍 GUILD_ID:', GUILD_ID);

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN manquant — Railway Variables !');
  process.exit(1);
}

discord.login(TOKEN).then(() => {
  console.log('✅ Login Discord OK');
}).catch(err => {
  console.error('❌ Login échoué:', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Dashboard arrêté. À bientôt !');
  discord.destroy();
  process.exit(0);
});
