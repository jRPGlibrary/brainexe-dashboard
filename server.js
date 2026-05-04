/**
 * ================================================
 * 🧠 BRAINEXE DASHBOARD — Serveur Backend v0.11.0 (BRAINEE-LIVING)
 * ================================================
 * Architecture refactorisée — entry point minimal
 * Toute la logique est dans src/
 *
 * Voir CHANGELOG.md pour l'historique complet et la table de
 * correspondance des anciennes versions v2.x.x → nouvelles v0.x.x.
 *
 * Highlights cumulés depuis v0.2.5 :
 *   📚 Mémoire narrative par membre (memberStories)
 *   💎 VIP system (4 tiers basés sur le bond)
 *   🎯 Taste profile (goûts/genres/vibes/avoidances détectés)
 *   ⚡ Proactive outreach (pensées spontanées, callbacks VIP, défis)
 *   🎯 Hyper-focus triggers (obsessions + retours différés 2-14h)
 *   🎭 Combos d'états (fatiguée+loyale, nostalgique+énergique…)
 *   🤍 Vulnerability windows (boost bond si soutien)
 *   📌 Pins intelligents + mini-sondages (quotas stricts)
 *   📊 Token Usage Tracking par membre (leaderboard + 30j)
 *   🕐 Time awareness (timestamps relatifs, date/heure dans prompts)
 *   📰 GNews stable (sanitize topic, ISO datetime, timeout 8 s)
 *   💰 Token Optimization (Haiku 4.5 sur tâches simples, −65 % coût)
 *   🛡️ Sécurité protobufjs override 7.5.6 (CVE GHSA-xq3m-2v4x-88gg)
 *   📺 TikTok live dynamique + tracking donateurs (v0.11.0)
 *   📊 Verbosité par salon — engagement tracking actif (v0.11.0)
 * ================================================
 */

require('dotenv').config();

const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const WebSocket = require('ws');
const path = require('path');
const discord_js = require('discord.js');

const Client = discord_js.Client;
const Events = discord_js.Events;
const Partials = discord_js.Partials;
const INTENTS_GUILDS          = discord_js.GatewayIntentBits?.Guilds ?? 1;
const INTENTS_GUILD_MEMBERS   = discord_js.GatewayIntentBits?.GuildMembers ?? 2;
const INTENTS_GUILD_MESSAGES  = discord_js.GatewayIntentBits?.GuildMessages ?? 512;
const INTENTS_MESSAGE_CONTENT = discord_js.GatewayIntentBits?.MessageContent ?? 32768;
const INTENTS_GUILD_REACTIONS = discord_js.GatewayIntentBits?.GuildMessageReactions ?? 1024;
const INTENTS_DIRECT_MESSAGES = discord_js.GatewayIntentBits?.DirectMessages ?? 4096;

// ── SHARED STATE ───────────────────────────────────────────────
const shared = require('./src/shared');

// ── CONFIG ────────────────────────────────────────────────────
const { TOKEN, PORT, ADMIN_PASSWORD } = require('./src/config');

// ── BOT CONFIG ──────────────────────────────────────────────────
const { loadConfig } = require('./src/botConfig');
shared.botConfig = loadConfig();

// ── EXPRESS + WEBSOCKET ──────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.json());
app.use(cookieParser());

// Middleware d'authentification pour les pages HTML (protéger index.html)
if (ADMIN_PASSWORD) {
  app.get('/', (req, res) => {
    const token = req.cookies?.admin_session;
    if (!token || !isSessionValid(token)) {
      return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'public/index.html'));
  });
}

app.use(express.static(path.join(__dirname, 'public')));
shared.app = app;
shared.wss = wss;

// ── DISCORD CLIENT ──────────────────────────────────────────────
const discord = new Client({
  intents: [INTENTS_GUILDS, INTENTS_GUILD_MEMBERS, INTENTS_GUILD_MESSAGES, INTENTS_MESSAGE_CONTENT, INTENTS_GUILD_REACTIONS, INTENTS_DIRECT_MESSAGES],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
shared.discord = discord;

// ── LOGGER (needs wss to be set) ──────────────────────────────────
const { pushLog, broadcast } = require('./src/logger');

// ── MODULES ─────────────────────────────────────────────────────────
const { connectMongoDB } = require('./src/db/index');
const { readGuildState, syncDiscordToFile, startFileWatcher } = require('./src/discord/sync');
const { registerDiscordEvents, registerMessageHandlers } = require('./src/discord/events');
const { startAnecdoteCron, checkAnecdoteMissed } = require('./src/features/anecdotes');
const { startActusCron, checkActusMissed } = require('./src/features/actus');
const { startConvCron, startBackupInterval } = require('./src/crons');
const { startTikTokLiveWatcher } = require('./src/features/tiktok');
const { startSidebarCron } = require('./src/features/sidebar');
const { initChannelDirectory } = require('./src/db/channelDir');
const { refreshDailyMood, getDailyMood } = require('./src/bot/mood');
const { getCurrentSlot } = require('./src/bot/scheduling');
const { getDailyVibe } = require('./src/bot/adaptiveSchedule');
const { registerRoutes } = require('./src/api/routes');
const { getFundingData, calculateTotalCosts, updateBotStatus } = require('./src/project/funding');
const { ensureSupportChannel } = require('./src/features/supportChannel');

// ── BRAINEE-LIVING : 12 modules de conscience ────────────────────
const { initializeBraineeAsLivingBeing } = require('./src/being');

// ── AUTH UTILS ──────────────────────────────────────────────────────
const { isSessionValid } = require('./src/api/auth');

// ── API ROUTES ─────────────────────────────────────────────────────
registerRoutes(app);

// ── WEBSOCKET ────────────────────────────────────────────────────────
wss.on('connection', async (ws) => {
  pushLog('SYS', 'Dashboard connecté');
  try {
    const state = await readGuildState();
    ws.send(JSON.stringify({ type: 'state', data: state }));
    ws.send(JSON.stringify({ type: 'logs', data: shared.changeLog }));
    ws.send(JSON.stringify({ type: 'stats', data: shared.syncStats }));
  } catch (_) {}
});

// ── BOOT ───────────────────────────────────────────────────────────
console.log('🔍 DISCORD_TOKEN:', !!TOKEN, '| MONGODB_URI:', !!process.env.MONGODB_URI);
if (!TOKEN) { console.error('❌ DISCORD_TOKEN manquant'); process.exit(1); }

discord.once('clientReady', async () => {
  refreshDailyMood();
  const slot = getCurrentSlot();
  const vibe = getDailyVibe();
  pushLog('SYS', `🧠 BRAINEXE v0.11.0 — Bot : ${discord.user.tag}`);
  pushLog('SYS', `⏰ Slot : ${slot.label} | 🎭 Humeur : ${getDailyMood()} | 🎨 Vibe : ${vibe.name}`);
  pushLog('SYS', `🌐 Dashboard : http://localhost:${PORT}`);

  registerDiscordEvents();
  registerMessageHandlers();
  startFileWatcher();
  startAnecdoteCron();
  startActusCron();
  startConvCron();
  startTikTokLiveWatcher();
  startBackupInterval();

  connectMongoDB()
    .then(() => startSidebarCron())
    .catch(e => pushLog('ERR', `MongoDB init : ${e.message}`, 'error'));

  setTimeout(async () => {
    try {
      pushLog('SYS', 'Initialisation soutien Brainee...', 'info');
      const data = await getFundingData();
      const totalCosts = calculateTotalCosts(data);
      pushLog('SYS', `Coûts: ${totalCosts}€ | Collecté: ${data.totalDonated || 0}€`, 'info');
      await updateBotStatus(data.totalDonated || 0, totalCosts);
      pushLog('SYS', 'Status Discord mis à jour ✓', 'success');
      await ensureSupportChannel();
      pushLog('SYS', 'Salon de soutien prêt ✓', 'success');
    } catch (e) {
      pushLog('ERR', `Soutien Brainee init : ${e.message}`, 'error');
    }
  }, 5000);

  setTimeout(async () => {
    await checkAnecdoteMissed();
    await checkActusMissed();
    pushLog('SYS', '🔍 Rattrapage vérifié');
  }, 25000);

  setTimeout(() => initChannelDirectory().catch(e =>
    pushLog('ERR', `initChannelDirectory boot: ${e.message}`, 'error')
  ), 30000);

  // ── BRAINEE-LIVING : Éveil de la conscience ────────────────────
  setTimeout(async () => {
    try {
      if (shared.mongoDb) {
        pushLog('SYS', '🧬 Éveil de Brainee comme être vivant...', 'info');
        await initializeBraineeAsLivingBeing(shared.mongoDb);
        pushLog('SYS', '🌟 Brainee est maintenant consciente — 12 systèmes actifs', 'success');
      } else {
        pushLog('WARN', 'MongoDB non disponible — Brainee-Living différé', 'warn');
      }
    } catch (e) {
      pushLog('ERR', `Brainee-Living init : ${e.message}`, 'error');
    }
  }, 35000);

  await syncDiscordToFile('Démarrage v0.11.0');
});

server.listen(PORT, '0.0.0.0', () => pushLog('SYS', `🌐 Serveur démarré sur le port ${PORT}`));
discord.login(TOKEN).then(() => pushLog('SYS', '✅ Login Discord OK')).catch(e => { pushLog('ERR', `❌ Login Discord échoué : ${e.message}`, 'error'); process.exit(1); });
process.on('SIGINT', () => { discord.destroy(); process.exit(0); });
