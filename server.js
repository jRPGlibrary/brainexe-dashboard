/**
 * ================================================
 * 🧠 BRAINEXE DASHBOARD — Serveur Backend v2.2.0
 * ================================================
 * Architecture refactorée — entry point minimal
 * Toute la logique est dans src/
 * ================================================
 */

require('dotenv').config();

const http = require('http');
const express = require('express');
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

// ── SHARED STATE ─────────────────────────────────────────────
const shared = require('./src/shared');

// ── CONFIG ────────────────────────────────────────────────────
const { TOKEN, PORT } = require('./src/config');

// ── BOT CONFIG ────────────────────────────────────────────────
const { loadConfig } = require('./src/botConfig');
shared.botConfig = loadConfig();

// ── EXPRESS + WEBSOCKET ───────────────────────────────────────
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
shared.app = app;
shared.wss = wss;

// ── DISCORD CLIENT ────────────────────────────────────────────
const discord = new Client({
  intents: [INTENTS_GUILDS, INTENTS_GUILD_MEMBERS, INTENTS_GUILD_MESSAGES, INTENTS_MESSAGE_CONTENT, INTENTS_GUILD_REACTIONS, INTENTS_DIRECT_MESSAGES],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
shared.discord = discord;

// ── LOGGER (needs wss to be set) ──────────────────────────────
const { pushLog, broadcast } = require('./src/logger');

// ── MODULES ───────────────────────────────────────────────────
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

// ── API ROUTES ────────────────────────────────────────────────
registerRoutes(app);

// ── WEBSOCKET ─────────────────────────────────────────────────
wss.on('connection', async (ws) => {
  pushLog('SYS', 'Dashboard connecté');
  try {
    const state = await readGuildState();
    ws.send(JSON.stringify({ type: 'state', data: state }));
    ws.send(JSON.stringify({ type: 'logs', data: shared.changeLog }));
    ws.send(JSON.stringify({ type: 'stats', data: shared.syncStats }));
  } catch (_) {}
});

// ── BOOT ──────────────────────────────────────────────────────
console.log('🔍 DISCORD_TOKEN:', !!TOKEN, '| MONGODB_URI:', !!process.env.MONGODB_URI);
if (!TOKEN) { console.error('❌ DISCORD_TOKEN manquant'); process.exit(1); }

discord.once('ready', async () => {
  refreshDailyMood();
  const slot = getCurrentSlot();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 🧠 BRAINEXE — Brainee v2.2.0 (audit + embeds TikTok riches + fils auto-invites)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const vibe = getDailyVibe();
  console.log(` ✅ Bot : ${discord.user.tag}`);
  console.log(` ⏰ Slot : ${slot.label} | 🎭 Humeur : ${getDailyMood()} | 🎨 Vibe : ${vibe.name}`);
  console.log(` 🌐 Dashboard : http://localhost:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  registerDiscordEvents();
  registerMessageHandlers();
  startFileWatcher();
  startAnecdoteCron();
  startActusCron();
  startConvCron();
  startTikTokLiveWatcher();
  startSidebarCron();
  startBackupInterval();

  connectMongoDB().catch(e => pushLog('ERR', `MongoDB init : ${e.message}`, 'error'));

  setTimeout(async () => {
    try {
      const data = await getFundingData();
      const totalCosts = calculateTotalCosts(data);
      updateBotStatus(data.totalDonated || 0, totalCosts);
      await ensureSupportChannel();
    } catch (e) {
      pushLog('ERR', `Funding status init : ${e.message}`, 'error');
    }
  }, 3000);

  setTimeout(async () => {
    await checkAnecdoteMissed();
    await checkActusMissed();
    pushLog('SYS', '🔍 Rattrapage vérifié');
  }, 25000);

  setTimeout(() => initChannelDirectory().catch(e =>
    pushLog('ERR', `initChannelDirectory boot: ${e.message}`, 'error')
  ), 30000);

  await syncDiscordToFile('Démarrage v2.2.0');
});

server.listen(PORT, '0.0.0.0', () => console.log(`🌐 Port ${PORT}`));
discord.login(TOKEN).then(() => console.log('✅ Login OK')).catch(e => { console.error('❌ Login échoué:', e.message); process.exit(1); });
process.on('SIGINT', () => { discord.destroy(); process.exit(0); });
