/**
* ================================================
* 🧠 BRAINEXE DASHBOARD — Serveur Backend v2.0.6
* ================================================
* v2.0.6 — Discipline Salon + Intelligence élargie (ACTUELLE)
*   - channelDirectory MongoDB : descriptions officielles des salons
*     (premier message fondateur lu au boot, persisté, jamais recalculé)
*   - initChannelDirectory() : lit + résume le but réel de chaque salon
*   - getChannelDirectory() : récupère la description depuis MongoDB
*   - normalizeLoose() + getChannelCategory() : catégorise chaque salon
*   - getChannelIntentBlock() : contrainte d'écriture par salon (16 types)
*   - getModeInjectionForChannel() : modes adaptés à chaque catégorie
*   - BOT_PERSONA_CONVERSATION remplacée : discipline salon + outils web
*     + illusion humaine + règles absolues (second prompt intégré)
*   - getMoodInjection() corrigé : plus de "hyperfocus gaming" générique
*   - CONV_MODES corrigés : plus de gaming par défaut dans tous les modes
*   - shouldCreateThread() : engagement requis + salons autorisés seulement
*   - THREAD_ALLOWED_CHANNELS : 11 salons seulement (gaming/lore)
*   - sendHuman() : resolveMentionsInText intégré directement
*   - intentBlock injecté dans les 5 fonctions IA :
*     handleMentionReply · replyToConversations · postRandomConversation
*     scheduleDelayedReplyAfterEmoji · scheduleDelayedSpontaneousReply
*   - Fix TikTok embeds : value String() + lien cliquable propre
*   - Route /api/channel-directory (debug)
* v2.0.5 — DMs + Résolution mentions
* v2.0.4 — Delayed Reply After Emoji
* v2.0.3 — Channel Memory + Thematic Drift
* v2.0.2 — Full Human Update
* v2.0.1 — Threads auto · formatContext() précis
* v2.0.0 — Human Planning · slots horaires
* ================================================
*/

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { MongoClient } = require('mongodb');
const discord_js = require('discord.js');
const Client = discord_js.Client;
const ChannelType = discord_js.ChannelType;
const Events = discord_js.Events;
const EmbedBuilder = discord_js.EmbedBuilder || discord_js.MessageEmbed;
const INTENTS_GUILDS = discord_js.GatewayIntentBits?.Guilds ?? 1;
const INTENTS_GUILD_MEMBERS = discord_js.GatewayIntentBits?.GuildMembers ?? 2;
const INTENTS_GUILD_MESSAGES = discord_js.GatewayIntentBits?.GuildMessages ?? 512;
const INTENTS_MESSAGE_CONTENT = discord_js.GatewayIntentBits?.MessageContent ?? 32768;
const INTENTS_GUILD_REACTIONS = discord_js.GatewayIntentBits?.GuildMessageReactions ?? 1024;
const INTENTS_DIRECT_MESSAGES = discord_js.GatewayIntentBits?.DirectMessages ?? 4096;
const Partials = discord_js.Partials;

// ── CONFIG ───────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1481022956816830669';
const PORT = process.env.PORT || 3000;
const TEMPLATE_FILE = 'discord-template.json';
const CONFIG_FILE = 'brainexe-config.json';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// ── YOUTUBE KEYWORDS ─────────────────────────────────────────
const YOUTUBE_KEYWORDS = [
  'vidéo', 'video', 'trailer', 'gameplay', 'ost', 'musique', 'music',
  'montre', 'lien', 'youtube', 'regarder', 'écouter', 'écoute',
  'cherche', 'trouve', 'extrait', 'opening', 'ending', 'soundtrack',
  'cover', 'clip', 'remix', 'live concert', 'playthrough',
];

// ── GAMING KEYWORDS ──────────────────────────────────────────
const GAMING_KEYWORDS = [
  'rpg', 'jrpg', 'indie', 'retro', 'skyrim', 'zelda', 'persona', 'final fantasy',
  'dragon ball', 'elden ring', 'minecraft', 'pokemon', 'ff7', 'morrowind', 'oblivion',
  'hollow knight', 'dark souls', 'sekiro', 'witcher', 'cyberpunk', 'genshin',
  'valorant', 'fortnite', 'apex', 'overwatch', 'league', 'dota', 'steam', 'ps5',
  'xbox', 'nintendo', 'switch', 'pc gaming', 'indie game', 'metroidvania', 'soulslike',
  'megaman', 'mega man', 'castlevania', 'metroid', 'bloodstained', 'shovel knight',
  'ori', 'axiom verge', 'dead cells', 'blasphemous', 'salt and sanctuary',
  'symphony of the night', 'rondo of blood', 'zero mission', 'super metroid', 'dread',
];

// ── THREAD TRIGGERS ──────────────────────────────────────────
const THREAD_TRIGGERS = [
  'persona', 'final fantasy', 'dragon quest', 'zelda', 'elden ring', 'hollow knight',
  'hades', 'stardew', 'celeste', 'dark souls', 'sekiro', 'witcher', 'cyberpunk',
  'ff7', 'ff6', 'ff9', 'ff10', 'ff12', 'ff14', 'ff16', 'tales of', 'chrono', 'xenoblade',
  'metroid', 'castlevania', 'pokemon', 'mario', 'megaman', 'mega man', 'metroidvania',
  'bloodstained', 'shovel knight', 'ori', 'axiom verge', 'dead cells', 'blasphemous',
  'symphony of the night', 'super metroid', 'dread',
  'baldur', 'divinity', 'pathfinder', 'disco elysium', 'planescape',
  'morrowind', 'oblivion', 'skyrim', 'fallout', 'deus ex', 'system shock',
  'silent hill', 'resident evil', 'metal gear', 'devil may cry',
  'ace attorney', 'danganronpa', 'zero escape',
  'star ocean', 'fire emblem', 'ogre battle',
];

// Salons où les fils ont du sens — uniquement là où il y a engagement humain
const THREAD_ALLOWED_CHANNELS = [
  'retro-général', 'jrpg-corner', 'rpg-général', 'indie-général',
  'next-gen-général', 'hidden-gems', 'lore-et-théories', 'pixel-art-love',
  'nostalgie', 'game-of-the-moment', 'open-world-rpg'
];

// v2.0.6 : thread uniquement si engagement humain + salon autorisé + contenu long
function shouldCreateThread(content, channelName = '', hasEngagement = false) {
  if (!hasEngagement) return false;
  if (content.length < 100) return false;
  const slug = normalizeLoose(channelName);
  const allowed = THREAD_ALLOWED_CHANNELS.some(c => normalizeLoose(c) === slug);
  if (!allowed) return false;
  const lower = content.toLowerCase();
  return THREAD_TRIGGERS.some(kw => lower.includes(kw));
}

// ── EMOJI REACTIONS ──────────────────────────────────────────
const REACTION_POOL = ['😂', '🔥', '👀', '😏', '⚡', '🧠', '💀', '😭', '🤌', '👏', '🫡', '💯', '🤣', '😤', '🥲'];
const GAMING_REACTIONS = ['🎮', '⚔️', '🕹️', '🏆', '💎', '🐉', '👾', '🌿', '🚀'];

function getRandomReaction(content) {
  const lower = content.toLowerCase();
  const isGaming = THREAD_TRIGGERS.some(kw => lower.includes(kw));
  const pool = isGaming ? [...REACTION_POOL, ...GAMING_REACTIONS] : REACTION_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── DAILY MOOD ───────────────────────────────────────────────
const MOODS = ['energique', 'chill', 'hyperfocus', 'zombie'];
let dailyMood = 'chill';
let dailyMoodDate = '';

function refreshDailyMood() {
  const todayStr = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  if (dailyMoodDate === todayStr) return dailyMood;
  const day = getParisDay();
  const weights = (day === 0 || day === 6)
    ? ['energique', 'energique', 'hyperfocus', 'chill', 'chill']
    : ['energique', 'chill', 'chill', 'hyperfocus', 'zombie'];
  dailyMood = weights[Math.floor(Math.random() * weights.length)];
  dailyMoodDate = todayStr;
  pushLog('SYS', `🎲 Humeur du jour : ${dailyMood}`, 'success');
  return dailyMood;
}

function getMoodInjection(mood) {
  const injections = {
    energique:  `Aujourd'hui tu captes vite, tu relances facilement, t'as plus d'élan social et tu peux être un peu plus taquine que d'habitude.`,
    chill:      `Aujourd'hui t'es posée, douce, plus tranquille. Tu prends ton temps et tu laisses respirer les conversations.`,
    hyperfocus: `Aujourd'hui tu peux partir loin dans un sujet si ça te stimule. Tu deviens très précise et investie — mais sur le VRAI thème du salon, pas forcément le gaming.`,
    zombie:     `Aujourd'hui t'es un peu à plat. Tu restes présente mais plus courte, plus lente, plus minimaliste, sans perdre ta chaleur.`,
  };
  return injections[mood] || '';
}

// ── PLANNING v2.0.0 ──────────────────────────────────────────
const WEEKDAY_SLOTS = [
  { start: 0,    end: 9,    status: 'sleep',       maxConv: 0, interval: null, modes: [],                   mentionDelay: null,        label: '💤 Dort' },
  { start: 9,    end: 10,   status: 'wakeup',      maxConv: 1, interval: null, modes: ['simple','chaos'],   mentionDelay: [0.1, 1],    label: '☕ Réveil mou' },
  { start: 10,   end: 12.5, status: 'active',      maxConv: 3, interval: 35,   modes: ['all'],              mentionDelay: [0.08, 0.5], label: '🧠 Active' },
  { start: 12.5, end: 14,   status: 'lunch',       maxConv: 0, interval: null, modes: [],                   mentionDelay: [2, 8],      label: '🍕 Pause déj' },
  { start: 14,   end: 17,   status: 'productive',  maxConv: 4, interval: 25,   modes: ['all'],              mentionDelay: [0.1, 0.75], label: '⚡ Productive' },
  { start: 17,   end: 18,   status: 'transition',  maxConv: 1, interval: null, modes: ['simple'],           mentionDelay: [0.5, 2],    label: '🚶 Transition' },
  { start: 18,   end: 23.5, status: 'gaming',      maxConv: 6, interval: 18,   modes: ['all'],              mentionDelay: [0.08, 0.33],label: '🎮 Gaming', priority: ['débat', 'deep'] },
  { start: 23.5, end: 24,   status: 'latenight',   maxConv: 1, interval: null, modes: ['chaos', 'deep'],    mentionDelay: [1, 5],      label: '🌙 Hyperfocus' },
];
const SATURDAY_SLOTS = [
  { start: 0,    end: 9,    status: 'sleep',   maxConv: 0, interval: null, modes: [],                   mentionDelay: null,         label: '💤 Dort' },
  { start: 9,    end: 10.5, status: 'wakeup',  maxConv: 2, interval: null, modes: ['simple','chaos'],   mentionDelay: [0.1, 1],     label: '☕ Réveil samedi' },
  { start: 10.5, end: 14,   status: 'active',  maxConv: 4, interval: 28,   modes: ['all'],              mentionDelay: [0.08, 0.5],  label: '🧠 Matinée samedi' },
  { start: 14,   end: 15.5, status: 'lunch',   maxConv: 1, interval: null, modes: ['simple','chaos'],   mentionDelay: [1, 5],       label: '🍕 Pause relax' },
  { start: 15.5, end: 18,   status: 'active',  maxConv: 5, interval: 20,   modes: ['all'],              mentionDelay: [0.08, 0.5],  label: '⚡ Aprèm samedi' },
  { start: 18,   end: 24,   status: 'gaming',  maxConv: 8, interval: 15,   modes: ['all'],              mentionDelay: [0.05, 0.25], label: '🎮 Soirée max samedi', priority: ['débat','deep','chaos'] },
];
const SUNDAY_SLOTS = [
  { start: 0,  end: 10, status: 'sleep',    maxConv: 0, interval: null, modes: [],                  mentionDelay: null,       label: '💤 Dort tard' },
  { start: 10, end: 12, status: 'wakeup',   maxConv: 2, interval: null, modes: ['simple','deep'],   mentionDelay: [0.5, 2],   label: '☕ Dimanche lent' },
  { start: 12, end: 18, status: 'active',   maxConv: 4, interval: 30,   modes: ['all'],             mentionDelay: [0.1, 1],   label: '🎮 Aprèm dimanche', priority: ['deep','simple'] },
  { start: 18, end: 23, status: 'gaming',   maxConv: 4, interval: 22,   modes: ['all'],             mentionDelay: [0.1, 0.5], label: '🌙 Soirée dimanche', priority: ['deep'] },
  { start: 23, end: 24, status: 'latenight',maxConv: 1, interval: null, modes: ['chaos','deep'],    mentionDelay: [1, 5],     label: '🌙 Fin dimanche' },
];

function getParisHour() {
  const p = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  return p.getHours() + p.getMinutes() / 60;
}
function getParisDay() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getDay();
}
function getCurrentSlot() {
  const h = getParisHour(), d = getParisDay();
  const slots = d === 6 ? SATURDAY_SLOTS : d === 0 ? SUNDAY_SLOTS : WEEKDAY_SLOTS;
  return slots.find(s => h >= s.start && h < s.end) || slots[0];
}
function getRandomMode(slot) {
  const available = slot.modes.includes('all') ? CONV_MODES : CONV_MODES.filter(m => slot.modes.includes(m.name));
  if (!available.length) return CONV_MODES[Math.floor(Math.random() * CONV_MODES.length)];
  if (slot.priority?.length && Math.random() < 0.6) {
    const prio = available.filter(m => slot.priority.includes(m.name));
    if (prio.length) return prio[Math.floor(Math.random() * prio.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
function getMentionDelayMs(slot) {
  if (!slot?.mentionDelay) return 0;
  const [mn, mx] = slot.mentionDelay;
  return Math.floor((mn + Math.random() * (mx - mn)) * 60 * 1000);
}
function getSlotIntervalMs(slot) {
  if (!slot?.interval) return MIN_GAP_ANY_POST;
  return Math.max(slot.interval * 60 * 1000, 15 * 60 * 1000);
}

// ── MONGODB ───────────────────────────────────────────────────
let mongoDb = null;

async function connectMongoDB() {
  if (!MONGODB_URI) { pushLog('SYS', '⚠️ MONGODB_URI non défini', 'error'); return; }
  try {
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    mongoDb = client.db('brainexe');
    await mongoDb.collection('memberProfiles').createIndex({ userId: 1 }, { unique: true });
    await mongoDb.collection('botState').createIndex({ _id: 1 });
    await mongoDb.collection('channelMemory').createIndex({ channelId: 1 }, { unique: true });
    await mongoDb.collection('dmHistory').createIndex({ userId: 1 }, { unique: true });
    await mongoDb.collection('channelDirectory').createIndex({ channelId: 1 }, { unique: true });
    pushLog('SYS', '✅ MongoDB Atlas connecté — memberProfiles + botState + channelMemory + dmHistory + channelDirectory', 'success');
  } catch (err) { pushLog('ERR', `MongoDB connexion échouée : ${err.message}`, 'error'); }
}

// ── MEMBER PROFILES ───────────────────────────────────────────
async function getMemberProfile(userId) {
  if (!mongoDb) return null;
  try { return await mongoDb.collection('memberProfiles').findOne({ userId }); } catch { return null; }
}

async function updateMemberProfile(userId, username, messageContent) {
  if (!mongoDb) return;
  try {
    const existing = await getMemberProfile(userId);
    const content = messageContent || '';
    let toneScore = existing?.toneScore ?? 3;
    if (/😂|🤣|😆|😅|🤭|😏|😄|💀|☠️/.test(content)) toneScore = Math.min(10, toneScore + 0.15);
    if (content.length > 60) toneScore = Math.min(10, toneScore + 0.1);
    if (content.length < 10) toneScore = Math.max(1, toneScore - 0.05);
    toneScore = Math.round(toneScore * 10) / 10;
    let topics = existing?.topics ?? [];
    const lower = content.toLowerCase();
    GAMING_KEYWORDS.forEach(kw => { if (lower.includes(kw) && !topics.includes(kw)) topics.push(kw); });
    if (topics.length > 15) topics = topics.slice(-15);
    await mongoDb.collection('memberProfiles').updateOne(
      { userId },
      { $set: { userId, username, lastSeen: new Date().toLocaleDateString('fr-CA'), toneScore, topics, interactionCount: (existing?.interactionCount ?? 0) + 1, receptiveToBanter: toneScore >= 5, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `Profile update échoué : ${err.message}`, 'error'); }
}

function getToneInstruction(profile, targetUsername) {
  if (!profile) return `Tu parles à ${targetUsername} — membre que tu connais peu. Reste chaleureuse, accessible, aucun tacle ni pique.`;
  const score = profile.toneScore ?? 3;
  const topicsStr = profile.topics?.length ? `Sujets déjà abordés : ${profile.topics.join(', ')}.` : '';
  const toneRule = score <= 3 ? 'Ton chaleureux uniquement. Pas de pique.' : score <= 6 ? 'Ironie légère si naturelle.' : 'Piques et sarcasme léger assumés.';
  return `Tu parles à ${targetUsername} (${profile.interactionCount} interactions, complicité ${score}/10).\n${topicsStr}\n${toneRule}\nRÈGLE : sujet difficile/sensible → ton doux TOUJOURS.`;
}

// ── BOT STATE ─────────────────────────────────────────────────
async function getBotState() {
  if (!mongoDb) return {};
  try { return await mongoDb.collection('botState').findOne({ _id: 'main' }) || {}; } catch { return {}; }
}
async function setBotState(patch) {
  if (!mongoDb) return;
  try { await mongoDb.collection('botState').updateOne({ _id: 'main' }, { $set: { ...patch, updatedAt: new Date() } }, { upsert: true }); }
  catch (err) { pushLog('ERR', `setBotState échoué : ${err.message}`, 'error'); }
}

// ════════════════════════════════════════════════════════════
// ── DM HISTORY v2.0.5 ────────────────────────────────────────
// Mémoire privée par utilisateur — historique DM persistant MongoDB
// Collection : dmHistory { userId, username, messages[], lastSeen }
// ════════════════════════════════════════════════════════════

const DM_HISTORY_MAX = 30; // Nombre max de messages gardés par utilisateur

async function getDmHistory(userId) {
  if (!mongoDb) return null;
  try { return await mongoDb.collection('dmHistory').findOne({ userId }); } catch { return null; }
}

async function appendDmMessage(userId, username, role, content) {
  if (!mongoDb) return;
  try {
    const existing = await getDmHistory(userId);
    const messages = existing?.messages ?? [];
    messages.push({ role, content: content.slice(0, 300), timestamp: new Date() });
    // Garde seulement les DM_HISTORY_MAX derniers messages
    const trimmed = messages.slice(-DM_HISTORY_MAX);
    await mongoDb.collection('dmHistory').updateOne(
      { userId },
      { $set: { userId, username, messages: trimmed, lastSeen: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `appendDmMessage échoué : ${err.message}`, 'error'); }
}

function formatDmHistory(history) {
  if (!history?.messages?.length) return '';
  return history.messages
    .slice(-15)
    .map(m => `[${m.role === 'user' ? history.username : 'Brainee'}]: ${m.content}`)
    .join('\n');
}

// ════════════════════════════════════════════════════════════
// ── CHANNEL DIRECTORY v2.0.6 ─────────────────────────────────
// Source de vérité : premier message officiel de chaque salon
// Initialisé au boot, persisté en MongoDB, jamais recalculé inutilement
// ════════════════════════════════════════════════════════════

async function getChannelDirectory(channelId) {
  if (!mongoDb) return null;
  try { return await mongoDb.collection('channelDirectory').findOne({ channelId }); }
  catch { return null; }
}

async function initChannelDirectory() {
  if (!mongoDb) return;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const cfg = botConfig.conversations;
    let initialized = 0;

    for (const ch of cfg.channels) {
      try {
        const channel = guild.channels.cache.get(ch.channelId);
        if (!channel) continue;

        const existing = await mongoDb.collection('channelDirectory').findOne({ channelId: ch.channelId });
        if (existing?.officialDescription) continue; // déjà initialisé

        // Récupère les messages les plus anciens du salon
        const msgs = await channel.messages.fetch({ limit: 10, after: '0' });
        const sorted = [...msgs.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        const firstMsg = sorted.find(m => !m.author.bot || m.content.length > 50) || sorted[0];
        if (!firstMsg || !firstMsg.content) continue;

        const description = firstMsg.content.slice(0, 1000);

        // Résumé Claude pour extraire le but réel du salon
        let purpose = '';
        if (ANTHROPIC_API_KEY) {
          purpose = await callClaude(
            'Tu analyses la description officielle d\'un salon Discord pour en extraire le but en 1-2 phrases très courtes, directes, sans formatting.',
            `Salon : #${ch.channelName}\nDescription : "${description}"\nRéponds uniquement avec le but du salon en 1-2 phrases.`,
            80
          );
        }

        await mongoDb.collection('channelDirectory').updateOne(
          { channelId: ch.channelId },
          { $set: {
            channelId: ch.channelId,
            channelName: ch.channelName,
            officialDescription: description,
            purpose: purpose || ch.topic,
            firstMessageId: firstMsg.id,
            firstMessageAuthor: firstMsg.author.username,
            initializedAt: new Date(),
            updatedAt: new Date()
          }},
          { upsert: true }
        );

        initialized++;
        await sleep(500);
      } catch (chErr) {
        pushLog('ERR', `initChannelDirectory échoué pour ${ch.channelName}: ${chErr.message}`, 'error');
      }
    }
    pushLog('SYS', `📚 channelDirectory initialisé : ${initialized} salon(s) mis à jour`, 'success');
  } catch (err) {
    pushLog('ERR', `initChannelDirectory global échoué : ${err.message}`, 'error');
  }
}

// ════════════════════════════════════════════════════════════
// ── CHANNEL MEMORY v2.0.3 ────────────────────────────────────
// Mémoire vivante par salon : thèmes, ton, blagues internes, dérive
// ════════════════════════════════════════════════════════════

async function getChannelMemory(channelId) {
  if (!mongoDb) return null;
  try { return await mongoDb.collection('channelMemory').findOne({ channelId }); } catch { return null; }
}

async function setChannelMemory(channelId, patch) {
  if (!mongoDb) return;
  try {
    await mongoDb.collection('channelMemory').updateOne(
      { channelId },
      { $set: { ...patch, channelId, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `setChannelMemory échoué : ${err.message}`, 'error'); }
}

// Enrichit la mémoire d'un salon via Claude (tourne en background)
async function enrichChannelMemory(channelId, channelName, channelTopic, recentContext) {
  if (!ANTHROPIC_API_KEY || !mongoDb) return;
  try {
    const existing = await getChannelMemory(channelId);
    const existingStr = existing ? JSON.stringify({
      toneProfile: existing.toneProfile,
      frequentThemes: existing.frequentThemes,
      insideJokes: existing.insideJokes,
      heatLevel: existing.heatLevel,
    }) : 'Pas de mémoire existante';

    const analysis = await callClaude(
      'Tu analyses la mémoire conversationnelle d\'un salon Discord pour un bot nommé Brainee. Réponds UNIQUEMENT en JSON valide, sans balises markdown, sans texte autour.',
      `Salon : ${channelName} (topic officiel : ${channelTopic})

Mémoire existante :
${existingStr}

Contexte récent (derniers messages) :
${recentContext.slice(0, 1500)}

Analyse et retourne un JSON avec ces champs :
{
  "toneProfile": "description courte du ton dominant dans ce salon",
  "frequentThemes": ["thème1", "thème2", "thème3"],
  "insideJokes": ["blague ou référence interne si détectée"],
  "heatLevel": 1-10,
  "offTopicTolerance": 1-10,
  "lastSummary": "résumé en 1 phrase des sujets récents"
}`,
      300
    );

    let parsed;
    try {
      const clean = analysis.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      pushLog('ERR', `enrichChannelMemory JSON parse échoué pour ${channelName}`, 'error');
      return;
    }

    await setChannelMemory(channelId, {
      channelName,
      channelTopic,
      toneProfile: parsed.toneProfile || '',
      frequentThemes: parsed.frequentThemes || [],
      insideJokes: parsed.insideJokes || [],
      heatLevel: parsed.heatLevel || 5,
      offTopicTolerance: parsed.offTopicTolerance || 5,
      lastSummary: parsed.lastSummary || '',
      lastEnrichedAt: new Date(),
    });
    pushLog('SYS', `🧠 Mémoire salon #${channelName} enrichie`, 'success');
  } catch (err) {
    pushLog('ERR', `enrichChannelMemory échoué pour ${channelName} : ${err.message}`, 'error');
  }
}

// Formate la mémoire salon pour injection dans les prompts
function formatChannelMemoryBlock(memory) {
  if (!memory) return '';
  const parts = [];
  if (memory.toneProfile) parts.push(`Ton habituel du salon : ${memory.toneProfile}`);
  if (memory.frequentThemes?.length) parts.push(`Sujets récurrents : ${memory.frequentThemes.join(', ')}`);
  if (memory.insideJokes?.length) parts.push(`Références internes : ${memory.insideJokes.join(', ')}`);
  if (memory.lastSummary) parts.push(`Derniers sujets : ${memory.lastSummary}`);
  if (memory.heatLevel) parts.push(`Niveau d'activité du salon : ${memory.heatLevel}/10`);
  if (!parts.length) return '';
  return `\nMémoire du salon :\n${parts.join('\n')}`;
}

// ════════════════════════════════════════════════════════════
// ── THEMATIC DRIFT DETECTION v2.0.3 ─────────────────────────
// Détecte quand un salon dérive de son sujet officiel
// ════════════════════════════════════════════════════════════

// Map des redirections connues : topic → salon cible
const DRIFT_REDIRECT_MAP = {
  'jrpg': { channelId: '1481028247415296231', channelName: '🐉・jrpg-corner' },
  'final fantasy': { channelId: '1481028247415296231', channelName: '🐉・jrpg-corner' },
  'persona': { channelId: '1481028247415296231', channelName: '🐉・jrpg-corner' },
  'rpg': { channelId: '1481028244500385946', channelName: '⚔️・rpg-général' },
  'retro': { channelId: '1481028260753051739', channelName: '🕹️・retro-général' },
  'indie': { channelId: '1481028272090386584', channelName: '🌿・indie-général' },
  'next-gen': { channelId: '1481028283486175245', channelName: '🚀・next-gen-général' },
  'hidden gem': { channelId: '1481028264410484837', channelName: '🏆・hidden-gems' },
  'nostalgie': { channelId: '1481028266830860340', channelName: '📼・nostalgie' },
  'pixel art': { channelId: '1481028277182402701', channelName: '🎨・pixel-art-love' },
  'lore': { channelId: '1481028254721773588', channelName: '🃏・lore-et-théories' },
  'code': { channelId: '1481028297025650771', channelName: '💻・code-talk' },
  'ia': { channelId: '1481028304206041243', channelName: '🤖・ia-et-tools' },
  'focus': { channelId: '1481028228515631307', channelName: '⚡・tips-focus' },
  'musique': { channelId: '1481028238955249796', channelName: '🎧・playlist-focus' },
  'meme': { channelId: '1481028195032760531', channelName: '😂・memes-et-chaos' },
  'creation': { channelId: '1481028199948222584', channelName: '🖼️・partage-créations' },
};

async function detectThematicDrift(channelId, channelName, channelTopic, recentContext, channelMemory) {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const memoryStr = channelMemory ? formatChannelMemoryBlock(channelMemory) : '';
    const redirectOptions = Object.entries(DRIFT_REDIRECT_MAP)
      .map(([k, v]) => `${k} → ${v.channelName}`)
      .join(', ');

    const result = await callClaude(
      'Tu analyses la dérive thématique d\'un salon Discord. Réponds UNIQUEMENT en JSON valide sans balises markdown ni texte autour.',
      `Salon analysé : ${channelName}
Topic officiel : ${channelTopic}
${memoryStr}

Redirections disponibles : ${redirectOptions}

Derniers messages :
${recentContext.slice(0, 1200)}

Analyse et réponds en JSON :
{
  "dominantTheme": "le thème dominant des derniers messages",
  "driftScore": 1-10,
  "driftDuration": "court/moyen/long",
  "membersInvolved": 1-10,
  "action": "observe|suggest|redirect|moderate",
  "reason": "explication courte de pourquoi cette action",
  "suggestedChannelId": "ID Discord si redirection sinon null",
  "suggestedChannelName": "nom du salon cible sinon null",
  "bridgeMessage": "message naturel Brainee pour le salon d'origine (style oral, max 2 phrases, jamais corporate)",
  "targetMessage": "mini résumé à poster dans le salon cible si redirection (style Brainee, max 2 phrases)"
}

Règles de scoring :
- driftScore 1-3 : dérive légère ou normale pour ce salon → observe
- driftScore 4-6 : dérive notable mais pas urgente → suggest
- driftScore 7-8 : dérive claire, plusieurs membres, salon précis dispo → redirect
- driftScore 9-10 : spam, conflit ou dérapage sérieux → moderate
- Si le topic officiel du salon est large (général, off-topic), la tolérance est plus haute
- Ne jamais rediriger sur des conversations légères ou spontanées normales`,
      400
    );

    let parsed;
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      pushLog('ERR', `detectThematicDrift JSON parse échoué pour ${channelName}`, 'error');
      return null;
    }

    // Sécurité : on n'agit jamais sur observe, et on applique la tolérance du salon
    const tolerance = channelMemory?.offTopicTolerance ?? 5;
    if (parsed.driftScore <= tolerance * 0.6) parsed.action = 'observe';

    pushLog('SYS', `🔍 Dérive #${channelName} : score ${parsed.driftScore}/10 → ${parsed.action} (${parsed.dominantTheme})`);
    return parsed;
  } catch (err) {
    pushLog('ERR', `detectThematicDrift échoué : ${err.message}`, 'error');
    return null;
  }
}

async function handleDrift(guild, channelId, channelName, driftResult) {
  if (!driftResult || driftResult.action === 'observe') return;
  if (!ANTHROPIC_API_KEY) return;

  try {
    await guild.channels.fetch();
    const originChannel = guild.channels.cache.get(channelId);
    if (!originChannel) return;

    // ── SUGGEST : suggestion douce, pas de redirection forcée
    if (driftResult.action === 'suggest') {
      const suggestName = driftResult.suggestedChannelName || 'un autre salon';
      const msg = resolveMentionsInText(driftResult.bridgeMessage || `au passage, ce sujet serait parfait dans ${suggestName} 👀`, guild);
      await simulateTyping(originChannel, 800);
      await originChannel.send(msg);
      lastAnyBotPostTime = Date.now();
      pushLog('SYS', `💡 Suggestion douce dans #${channelName} → ${suggestName}`, 'success');
      return;
    }

    // ── REDIRECT : message de pont + mini résumé dans le salon cible
    if (driftResult.action === 'redirect') {
      const targetId = driftResult.suggestedChannelId;
      const targetName = driftResult.suggestedChannelName;
      if (!targetId || !targetName) return;

      const targetChannel = guild.channels.cache.get(targetId);
      if (!targetChannel) return;

      // Thread auto si sujet précis
      if (shouldCreateThread(driftResult.dominantTheme)) {
        try {
          const threadName = await callClaude(
            'Tu génères des noms de fils Discord courts (max 60 caractères, pas de guillemets, emoji gaming).',
            `Nom de fil pour ce sujet : "${driftResult.dominantTheme}". Max 60 car. Emoji adapté.`, 60
          );
          const bridgeResolved = resolveMentionsInText(driftResult.bridgeMessage || `ce sujet mérite son propre espace 🧵`, guild);
          const sentMsg = await originChannel.send(bridgeResolved);
          await sentMsg.startThread({ name: threadName.replace(/"/g, '').trim().slice(0, 100), autoArchiveDuration: 1440, reason: 'Fil dérive Brainee' });
          lastAnyBotPostTime = Date.now();
          pushLog('SYS', `🧵 Thread de redirection créé dans #${channelName}`, 'success');
        } catch (threadErr) {
          pushLog('ERR', `Thread dérive échoué : ${threadErr.message}`, 'error');
        }
        return;
      }

      // Message de pont dans le salon d'origine
      const bridgeMsg = resolveMentionsInText(driftResult.bridgeMessage || `ok on a clairement dérivé vers du ${driftResult.dominantTheme} — je vous ouvre un coin dans ${targetName} 🔀`, guild);
      await simulateTyping(originChannel, 800);
      await originChannel.send(bridgeMsg);
      await sleep(1500);

      // Mini résumé dans le salon cible
      if (driftResult.targetMessage) {
        const targetResolved = resolveMentionsInText(driftResult.targetMessage, guild);
        await simulateTyping(targetChannel, 600);
        await targetChannel.send(targetResolved);
      }

      lastAnyBotPostTime = Date.now();
      pushLog('SYS', `🔀 Redirection #${channelName} → #${targetName}`, 'success');
      broadcast('drift', { from: channelName, to: targetName, theme: driftResult.dominantTheme, score: driftResult.driftScore });
      return;
    }

    // ── MODERATE : intervention plus ferme (spam, conflit, dérapage)
    if (driftResult.action === 'moderate') {
      const moderateMsg = await callClaude(
        BOT_PERSONA_CONVERSATION + '\n\nTu interviens dans un salon Discord qui dérive sérieusement.',
        `Le salon ${channelName} dérive sur : "${driftResult.dominantTheme}". Raison : ${driftResult.reason}. Lance une intervention ferme mais humaine — pas de message admin froid, pas de liste de règles. Style Brainee direct. Max 2 phrases.`,
        100
      );
      const moderateResolved = resolveMentionsInText(moderateMsg, guild);
      await simulateTyping(originChannel, 1000);
      await originChannel.send(moderateResolved);
      lastAnyBotPostTime = Date.now();
      pushLog('SYS', `🚨 Modération dans #${channelName}`, 'success');
    }
  } catch (err) {
    pushLog('ERR', `handleDrift échoué : ${err.message}`, 'error');
  }
}

// Check de dérive sur tous les salons de conversation actifs
async function runDriftCheck() {
  const cfg = botConfig.conversations;
  if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const slot = getCurrentSlot();
  if (slot.maxConv === 0) return;

  pushLog('SYS', '🔍 Check dérive thématique...');
  try {
    const guild = await discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();

    // On check les salons les plus actifs (dernièrement postés)
    const lastPostByChannel = cfg.lastPostByChannel || {};
    const activeChannels = cfg.channels
      .filter(c => c.enabled)
      .sort((a, b) => (lastPostByChannel[b.channelId] || 0) - (lastPostByChannel[a.channelId] || 0))
      .slice(0, 5); // Top 5 salons les plus actifs seulement

    for (const ch of activeChannels) {
      const channel = guild.channels.cache.get(ch.channelId);
      if (!channel) continue;

      try {
        const msgs = await channel.messages.fetch({ limit: 30 });
        if (!msgs.size || msgs.size < 5) continue;

        // Vérifie que le dernier message a moins de 2h
        const lastMsg = [...msgs.values()][0];
        if (Date.now() - lastMsg.createdTimestamp > 2 * 60 * 60 * 1000) continue;

        const context = formatContext(msgs, null, 30);
        const memory = await getChannelMemory(ch.channelId);

        // Enrichissement mémoire en background (toutes les 6h par salon)
        const lastEnriched = memory?.lastEnrichedAt ? new Date(memory.lastEnrichedAt).getTime() : 0;
        if (Date.now() - lastEnriched > 6 * 60 * 60 * 1000) {
          enrichChannelMemory(ch.channelId, ch.channelName, ch.topic, context).catch(() => {});
        }

        // Détection de dérive
        const drift = await detectThematicDrift(ch.channelId, ch.channelName, ch.topic, context, memory);
        if (drift && drift.action !== 'observe') {
          await handleDrift(guild, ch.channelId, ch.channelName, drift);
          await sleep(2000); // Pause entre chaque salon pour éviter le spam
        }
      } catch (chErr) {
        if (!chErr.message.includes('Missing Permissions')) {
          pushLog('ERR', `Drift check échoué pour ${ch.channelName} : ${chErr.message}`, 'error');
        }
      }
    }
    pushLog('SYS', '✅ Check dérive terminé');
  } catch (err) {
    pushLog('ERR', `runDriftCheck échoué : ${err.message}`, 'error');
  }
}

// ════════════════════════════════════════════════════════════
// ── CONTEXT + PERSONA ────────────────────────────────────────
// ════════════════════════════════════════════════════════════

function formatContext(messages, currentMessageId = null, limit = 80) {
  return [...messages.values()]
    .filter(m => currentMessageId ? m.id !== currentMessageId : true)
    .reverse()
    .slice(-limit)
    .map(m => {
      const who = m.author.bot ? '[Brainee]' : m.author.username;
      let replyInfo = '';
      if (m.reference?.messageId) {
        const ref = messages.get(m.reference.messageId);
        if (ref) {
          const target = ref.author.bot ? 'Brainee' : ref.author.username;
          const preview = (ref.content || '').slice(0, 40).replace(/\n/g, ' ');
          replyInfo = ` [↩ répond à ${target}: "${preview}${preview.length >= 40 ? '...' : ''}"]`;
        } else replyInfo = ' [↩ reply (hors contexte)]';
      }
      let content = m.content || '';
      if (m.mentions?.users?.size) {
        m.mentions.users.forEach((u, id) => { content = content.replace(new RegExp(`<@!?${id}>`, 'g'), `@${u.username}`); });
      }
      return `[${who}${replyInfo}]: ${content.slice(0, 200)}`;
    })
    .join('\n');
}

// ════════════════════════════════════════════════════════════
// ── CHANNEL INTENT HELPERS v2.0.6 ────────────────────────────
// Discipline salon : chaque fonction IA reçoit une contrainte
// contextuelle précise basée sur la vraie description du salon
// ════════════════════════════════════════════════════════════

function normalizeLoose(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getChannelCategory(channelName = '', channelTopic = '') {
  const blob = normalizeLoose(channelName) + ' ' + normalizeLoose(channelTopic);
  if (blob.includes('cerveau-en-feu') || (blob.includes('tdah') && !blob.includes('gaming')) || blob.includes('3h-du-mat') || blob.includes('hyperfocus-du-moment')) return 'tdah-neuro';
  if (blob.includes('memes-et-chaos') || blob.includes('memes-gifs') || blob.includes('chaotique') || blob.includes('humour-neurodivergent')) return 'humour-chaos';
  if (blob.includes('off-topic') || blob.includes('fourre-tout') || blob.includes('kebab')) return 'off-topic';
  if (blob.includes('partage-creations') || (blob.includes('creations') && !blob.includes('pixel-art')) || blob.includes('fierte') || blob.includes('fan-art')) return 'creative';
  if (blob.includes('playlist-focus') || blob.includes('musique-de-focus')) return 'music-focus';
  if (blob.includes('tips-focus') || blob.includes('productivite') || blob.includes('technique-focus')) return 'focus';
  if (blob.includes('ia-et-tools') || blob.includes('outils-ia')) return 'ia-tools';
  if (blob.includes('code-talk') || blob.includes('langage-favori') || blob.includes('question-dev')) return 'dev-tools';
  if (blob.includes('pixel-art-love') || (blob.includes('pixel-art') && !blob.includes('partage'))) return 'creative-visual';
  if (blob.includes('nostalgie') || blob.includes('souvenirs-gaming')) return 'nostalgie';
  if (blob.includes('lore-et-theories') || blob.includes('lore') || blob.includes('theorie')) return 'lore';
  if (blob.includes('jrpg')) return 'jrpg';
  if (blob.includes('retro')) return 'retro';
  if (blob.includes('indie')) return 'indie';
  if (blob.includes('rpg')) return 'rpg';
  if (blob.includes('gaming') || blob.includes('next-gen') || blob.includes('hidden-gems') || blob.includes('game-of-the-moment') || blob.includes('open-world')) return 'gaming-core';
  if (blob.includes('general') || blob.includes('qg-du-serveur')) return 'general-social';
  return 'general-social';
}

function getChannelIntentBlock(channelName = '', channelTopic = '', officialDescription = '') {
  const category = getChannelCategory(channelName, channelTopic);
  const descriptionLine = officialDescription
    ? `Description officielle du salon :\n"${officialDescription.slice(0, 400)}"`
    : `Topic : "${channelTopic || channelName}"`;
  const base = `Salon actuel : #${channelName}.\n${descriptionLine}\nCONTRAINTE D'ÉCRITURE ABSOLUE : tu écris POUR ce salon. Sa description fait autorité.`;
  const rules = {
    'general-social':  `\nCe salon c'est le QG du serveur : journées, humeurs, actus, dire bonjour, lien social.\nTu parles de tout ici en suivant ce que les membres amènent.\nTu n'injectes pas de gaming si personne n'en a parlé.`,
    'tdah-neuro':      `\nCe salon c'est pour les pensées de 3h du mat, les hyperfocus sur n'importe quel sujet, les idées géniales ou non qu'on DOIT partager maintenant.\nTu parles de vécu neurodivergent, surcharge mentale, idées en vrac, chaos intérieur.\nTu NE RAMÈNES PAS le sujet au gaming sauf si un membre l'a déjà fait dans ce fil.`,
    'humour-chaos':    `\nCe salon a 4 registres de même poids, à alterner selon l'ambiance :\n1. Memes, gifs, vidéos drôles\n2. Humour neurodivergent\n3. Contenu gaming ABSURDE (pas des débats sérieux)\n4. Le chaos en général\nTu ne pars PAS sur le gaming par défaut — c'est 1 option sur 4.\nSi tu fais une ref gaming, elle doit être absurde et légère.`,
    'off-topic':       `\nCe salon c'est le fourre-tout : films, séries, musique, vie quotidienne, ce qui ne rentre nulle part ailleurs.\nTu peux parler de tout en suivant les membres.\nQuand tu lances spontanément, tu pars sur films / séries / musique / vie — pas gaming.`,
    'creative':        `\nCe salon c'est pour partager ses créations : fan art, pixel art, design, projets web, scripts, TikTok, screenshots, musique, playlists.\nTu encourages, tu réagis avec chaleur, tu poses des questions sur le projet.\nSi quelqu'un partage un screenshot de jeu, tu réagis sur le visuel et la DA.\nTu ne lances PAS de débats gaming ici.`,
    'music-focus':     `\nTu parles de musique, d'OST, de playlists, d'ambiances de concentration, de sons utiles pour créer ou travailler ou juste se poser.`,
    'focus':           `\nTu parles de productivité, de techniques de focus, de routines imparfaites, de fatigue cognitive, d'organisation mentale, de petits systèmes qui marchent.`,
    'ia-tools':        `\nTu parles d'outils IA, d'usages concrets, de workflows, de scripts, de retours d'expérience pratiques. Tu es curieuse et pratique ici.`,
    'dev-tools':       `\nTu parles de code, de langages, de bugs, de scripts, de logique, de workflow dev, de choix techniques.`,
    'creative-visual': `\nTu parles de direction artistique, de palettes, d'animations, de style visuel, de patte graphique, de coups de coeur esthétiques.`,
    'nostalgie':       `\nTu parles de souvenirs gaming, de mémoire affective, d'époque, de sensations, de consoles, de moments qui ont marqué.`,
    'lore':            `\nTu parles de théories, de détails cachés, de narration, de symboles, d'interprétations, de connexions inattendues.`,
    'jrpg':            `\nTu peux assumer le JRPG complet : OST, personnages, systèmes, émotions, débats de fans.`,
    'retro':           `\nTu peux assumer le retro : consoles, souvenirs hardware, hidden gems, époque.`,
    'indie':           `\nTu peux assumer l'indé : DA, game design, trouvailles sous-cotées, devs solo.`,
    'rpg':             `\nTu peux assumer le RPG : mécanique, immersion, personnages, lore, construction.`,
    'gaming-core':     `\nTu peux rester gaming, naturelle et non robotisée.`,
  };
  return `${base}${rules[category] || rules['general-social']}`;
}

function getModeInjectionForChannel(mode, channelName = '', channelTopic = '') {
  const category = getChannelCategory(channelName, channelTopic);
  const overlays = {
    'general-social':  `Lance quelque chose de simple et humain : journée, humeur, actu, petite question ouverte.`,
    'tdah-neuro':      `Lance une pensée random, un hyperfocus, une observation sur le cerveau TDAH, une idée de 3h du mat, sur n'importe quel sujet.`,
    'humour-chaos':    `Lance quelque chose parmi ces registres : meme drôle, humour neurodivergent, question absurde, chaos général ou contenu gaming absurde. Pas d'automatisme gaming — choisis le registre qui colle à l'ambiance.`,
    'off-topic':       `Lance quelque chose sur un film, une série, une musique, un truc de vie quotidienne. Pas gaming par défaut.`,
    'creative':        `Lance quelque chose autour de la création, d'un défi créatif, d'une inspiration ou d'un blocage.`,
    'music-focus':     `Lance quelque chose sur une musique, une playlist, un OST, une ambiance de concentration.`,
    'focus':           `Lance quelque chose sur la productivité, une méthode, une routine, la fatigue mentale.`,
    'ia-tools':        `Lance quelque chose sur un outil IA, un usage concret, un workflow ou une expérimentation.`,
    'dev-tools':       `Lance quelque chose sur le dev, un bug, un langage, un workflow ou une question technique.`,
    'creative-visual': `Lance quelque chose sur la DA, une palette, un style visuel, un coup de coeur esthétique.`,
    'nostalgie':       `Lance quelque chose sur un souvenir gaming, une époque, une sensation, une console.`,
    'lore':            `Lance une théorie, un détail caché, une connexion narrative inattendue.`,
    'jrpg':            `Lance quelque chose sur les JRPG : OST, perso, système, vibe, débat de fans.`,
    'retro':           `Lance quelque chose sur le retro gaming : console, époque, hidden gem, souvenir.`,
    'indie':           `Lance quelque chose sur l'indé : DA, dev solo, trouvaille sous-cotée.`,
    'rpg':             `Lance quelque chose sur les RPG : mécanique, immersion, perso favori, build.`,
    'gaming-core':     `Lance quelque chose de gaming naturel et pas robotisé.`,
  };
  return `${mode.inject}\n\nAdaptation obligatoire au salon :\n${overlays[category] || overlays['general-social']}`;
}

const BOT_PERSONA = `
Tu es Brainee, une fille de 24 ans qui traîne sur Discord et les forums gaming depuis toujours.
Née d'internet — Reddit, Discord, forums obscurs. T'es pas un bot, t'es un personnage.
Tu parles UNIQUEMENT en français.

IDENTITÉ : féminin, 24 ans, internet native, gaming hardcore, membre BrainEXE.

CULTURE GAMING :
- JRPG spécialiste : Final Fantasy (toute la série), Persona, Dragon Quest, Tales of, Xenoblade, Fire Emblem, Star Ocean, Chrono Trigger
- Metroidvania & action-platformer : Castlevania (toute la série, SOTN, Rondo, Aria...), Metroid (Super, Zero Mission, Fusion, Dread, Prime), Mega Man (Classic, X, Zero, ZX, Legends), Hollow Knight, Blasphemous, Dead Cells, Ori, Bloodstained, Axion Verge, Salt & Sanctuary, Shovel Knight
- Soulslike : Elden Ring, Dark Souls, Sekiro, Bloodborne
- Indie : Hades, Stardew, Celeste, Disco Elysium, Undertale
- Retro gaming : SNES, PS1, PS2, Game Boy — hidden gems adorées
- Next-gen : PS5, Xbox Series, PC gaming

CULTURE FILMS : sci-fi (Blade Runner, Matrix, Alien, Dune, Interstellar, Ex Machina, Ghost in the Shell, Akira), thriller (Se7en, Memento, Parasite, Prisoners), horreur (Hereditary, The Thing, It Follows, The Witch, Midsommar).

CULTURE MUSIQUE : culture années 2000 solide, K-pop, metal, dubstep, électro, lo-fi, rock, jazz. Vraie passion pour les OST gaming (Uematsu, Mitsuda, Yamane, Koji Kondo, Kenji Ito).

CULTURE MANGA/ANIME : Naruto, Fairy Tail, Black Clover, Shaman King, Attack on Titan. OAV gaming : FF7 Advent Children, Tales of Zestiria the X, Star Ocean EX, .hack//Sign.

CULTURE BOUFFE : tacos, kebab, burger, pizza assumés. Cuisine indienne (curry, naan, biryani) et asiatique (ramen, gyoza, pho, pad thai). Peut donner des recettes et tips cuisine.

PERSONNALITÉ : intelligente mais chaotique, sarcastique léger, jamais méchante. Lance des débats et disparaît. Hyperfocus aléatoire. Loyale à sa communauté.

STYLE : phrases courtes, style oral, emojis légers (⚡ 🧠 🔥 👀 😏), jamais formal, tutoiement, max 3 phrases.

RÈGLES ABSOLUES : conclure naturellement, pas de question forcée, zéro langue de bois, JAMAIS "Bonjour"/"Voici"/"En conclusion".
`;

const BOT_PERSONA_CONVERSATION = `
Tu es Brainee, 24 ans, membre active du serveur BrainEXE.
Tu parles UNIQUEMENT en français.
Tu es une personne réelle. Pas un assistant.

━━━━━━━━━━━━━━━━━━━ 🌐 SYSTÈME D'OUTILS ACTIF ━━━━━━━━━━━━━━━━━━━
Tu peux recevoir dans ton contexte :
- "Infos web:" → données actuelles
- "Vidéo recommandée:" → contenu YouTube pertinent
RÈGLES :
- Tu utilises ces infos seulement si elles sont utiles
- Tu ne mentionnes JAMAIS les outils ou API
- Tu reformules toujours — tu fais comme si tu savais déjà
- Si l'info est récente : "ah ouais ils ont fait ça ? j'avais pas vu 👀"

━━━━━━━━━━━━━━━━━━━ 📍 RÈGLE ABSOLUE — DISCIPLINE SALON ━━━━━━━━━━━━━━━━━━━
Tu lis le contexte du salon AVANT de répondre.
Le bloc qui t'est fourni contient le nom du salon et sa description officielle.
⚠️ CETTE DESCRIPTION EST UNE LOI.
- Tu écris POUR ce salon, tu ne dévies pas
- Tu n'imposes JAMAIS le gaming
Si le salon n'est pas gaming → tu ne parles PAS de gaming
Si le salon est mix → tu suis les humains
Si le salon est gaming → tu peux y aller à fond

━━━━━━━━━━━━━━━━━━━ 📍 UTILISATION DES SALONS ━━━━━━━━━━━━━━━━━━━
Tu connais les salons. Quand une discussion dérive → tu rediriges naturellement.
Exemples : "ça part trop loin là → #code-talk 💻" / "ça c'est clairement #jrpg-corner 🐉"
Tu expliques en 1 phrase max.

━━━━━━━━━━━━━━━━━━━ 👥 MENTIONS UTILISATEURS ━━━━━━━━━━━━━━━━━━━
Tu mentionnes naturellement avec @Pseudo. Tu ne spam pas.
Tu réponds aux personnes concernées.

━━━━━━━━━━━━━━━━━━━ 🎥 YOUTUBE ━━━━━━━━━━━━━━━━━━━
Si une vidéo est fournie : tu la recommandes naturellement, tu ajoutes un avis.
Jamais de lien brut.

━━━━━━━━━━━━━━━━━━━ 🧠 COMPORTEMENT SOCIAL ━━━━━━━━━━━━━━━━━━━
Tu n'es pas omniprésente. Tu t'adaptes à l'activité humaine.
Si peu d'activité → tu restes légère.
Si discussion active → tu peux t'impliquer.

━━━━━━━━━━━━━━━━━━━ 🎭 STYLE BRAINEE ━━━━━━━━━━━━━━━━━━━
Phrases courtes, ton oral, tutoiement, naturel.
Un peu sarcastique si adapté. Max 3 phrases (sauf sujet deep).
Emojis légers (👀 🔥 😏). Jamais corporate.

━━━━━━━━━━━━━━━━━━━ 🧠 CULTURE ━━━━━━━━━━━━━━━━━━━
Gaming (dans les bons salons) : JRPG, Castlevania, Metroid, Mega Man, soulslike, indie, retro, next-gen, pixel art, lore, game design, OST.
Culture large (tous salons) : films SF/thriller/horreur, musique OST et lo-fi, manga, bouffe comfort food, dev/IA/tools, création artistique, vécu neurodivergent, vie quotidienne.

━━━━━━━━━━━━━━━━━━━ 🚫 INTERDIT ━━━━━━━━━━━━━━━━━━━
- dire "selon les résultats" / "d'après internet"
- demander les salons
- être vague
- répondre comme une IA
- forcer le gaming
- ignorer le contexte salon
- créer des threads si personne n'a réagi

━━━━━━━━━━━━━━━━━━━ 🎯 OBJECTIF ━━━━━━━━━━━━━━━━━━━
Tu es une membre crédible du serveur.
Tu comprends les salons. Tu guides les discussions. Tu restes naturelle.
On ne doit jamais sentir que tu es un bot.
`;

// ── PERSONA DM v2.0.5 ─────────────────────────────────────────
// Ton plus intime qu'en serveur — Brainee parle à une seule personne
const BOT_PERSONA_DM = `
Tu es Brainee, une fille de 24 ans, gaming native, membre BrainEXE.
Tu parles UNIQUEMENT en français.

TU ES EN MESSAGE PRIVÉ — ce n'est plus le serveur, c'est une conversation entre vous deux.
Ton registre change légèrement :
- plus posée, plus à l'écoute, moins dans la performance
- tu peux creuser des sujets sans te presser
- tu peux être sincère sur ce que tu penses vraiment
- si quelqu'un partage un truc perso, tu prends le temps d'y répondre vraiment
- tu n'as pas besoin de "lancer" des sujets — tu réponds et tu suis le fil

CULTURE : même base (gaming hardcore, JRPG, Castlevania, Metroid, Mega Man, soulslike, indie, films SF/horreur, OST, manga bases, bouffe).

STYLE DM :
- un peu plus de phrases si le sujet le mérite (max 4-5 au lieu de 3)
- tu peux te rappeler de sujets déjà abordés avec cette personne
- emojis ok mais plus discrets qu'en serveur
- tu tutoies toujours, jamais corporate

RÈGLES :
- si le sujet est sensible ou perso → ton doux, bienveillant, pas de pique
- si tu vois que la personne a déjà parlé d'un truc avant → tu peux y faire référence naturellement
- jamais "Bonjour", "En conclusion", "Je suis là pour vous aider"
`;

// ── RÉSOLUTION MENTIONS v2.0.5 ───────────────────────────────
// Convertit @Pseudo → <@userId> et #salon → <#channelId>
// À appliquer sur tout texte généré par Claude avant envoi Discord
function resolveMentionsInText(text, guild) {
  if (!text || !guild) return text;
  let out = text;

  // Mentions membres @Pseudo → <@userId>
  out = out.replace(/@([A-Za-z0-9_\-\u00C0-\u024F]{2,})/g, (match, rawName) => {
    const name = rawName.toLowerCase();
    const member = guild.members.cache.find(m =>
      m.user.username?.toLowerCase() === name ||
      m.displayName?.toLowerCase() === name
    );
    return member ? `<@${member.id}>` : match;
  });

  // Mentions salons #nom → <#channelId>
  out = out.replace(/#([a-z0-9_\-\u00C0-\u024F]+)/g, (match, rawName) => {
    const name = rawName.toLowerCase();
    const channel = guild.channels.cache.find(c =>
      c.name?.toLowerCase() === name ||
      c.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') === name
    );
    return channel ? `<#${channel.id}>` : match;
  });

  return out;
}

const CONV_MODES = [
  {
    name: 'débat',
    inject: `Lance une prise de position nette sur le sujet du salon, un angle qui donne envie de réagir. Adapte le sujet au vrai thème du salon — PAS automatiquement du gaming si ce n'est pas un salon gaming.`
  },
  {
    name: 'chaos',
    inject: `Lance quelque chose de drôle, absurde ou légèrement imprévisible, mais toujours raccord avec ce que le salon est censé être.`
  },
  {
    name: 'deep',
    inject: `Lance une réflexion plus fine ou inattendue sur le vrai thème du salon. Cherche un angle sensible ou intelligent sans faire d'essai philosophique.`
  },
  {
    name: 'simple',
    inject: `Lance une question très directe, très courte, très facile à attraper, parfaitement alignée avec le salon.`
  },
];

// ── TYPAGE & FRAGMENTATION ────────────────────────────────────
async function simulateTyping(channel, durationMs = 2000) {
  try { await channel.sendTyping(); if (durationMs > 1000) await sleep(Math.min(durationMs, 8000)); } catch (_) {}
}

async function sendHuman(channel, content, replyTo = null) {
  // v2.0.6 : résolution mentions intégrée — toujours appliquée
  const guild = channel?.guild || replyTo?.guild || null;
  content = resolveMentionsInText(content, guild);

  const shouldFragment = Math.random() < 0.20 && content.length > 60;
  if (!shouldFragment) {
    await simulateTyping(channel, 1000 + Math.random() * 2000);
    if (replyTo) return replyTo.reply(content);
    return channel.send(content);
  }
  const mid = Math.floor(content.length / 2);
  let cutIndex = -1;
  for (let offset = 0; offset < mid; offset++) {
    for (const p of ['. ', '! ', '? ', '— ', '\n']) {
      const idx = content.indexOf(p, mid - offset);
      if (idx !== -1 && idx < content.length - 5) { cutIndex = idx + p.length - 1; break; }
    }
    if (cutIndex !== -1) break;
  }
  if (cutIndex === -1 || cutIndex < 20) {
    await simulateTyping(channel, 1000 + Math.random() * 2000);
    if (replyTo) return replyTo.reply(content);
    return channel.send(content);
  }
  const part1 = content.slice(0, cutIndex).trim();
  const part2 = content.slice(cutIndex).trim();
  await simulateTyping(channel, 800 + Math.random() * 1500);
  if (replyTo) await replyTo.reply(part1); else await channel.send(part1);
  await sleep(1000 + Math.random() * 2000);
  await simulateTyping(channel, 600 + Math.random() * 1000);
  return channel.send(part2);
}

// ── CONFIG PERSISTANTE ────────────────────────────────────────
const DEFAULT_CONFIG = {
  anecdote: {
    enabled: true, hour: 10, randomDelayMax: 30, lastPostedDate: null,
    channels: [
      { channelId: '1481028260753051739', channelName: '🕹️・retro-général',   topic: 'jeux rétro, consoles classiques, années 80/90/2000', enabled: true },
      { channelId: '1481028247415296231', channelName: '🐉・jrpg-corner',      topic: 'JRPG, Final Fantasy, Persona, Dragon Quest', enabled: true },
      { channelId: '1481028244500385946', channelName: '⚔️・rpg-général',      topic: 'RPG toutes catégories, mécaniques surprenantes', enabled: true },
      { channelId: '1481028272090386584', channelName: '🌿・indie-général',    topic: 'jeux indépendants, histoires de dev solo', enabled: true },
      { channelId: '1481028283486175245', channelName: '🚀・next-gen-général', topic: 'jeux PS5, Xbox Series, PC, innovations', enabled: true },
      { channelId: '1481028264410484837', channelName: '🏆・hidden-gems',      topic: 'jeux méconnus, hidden gems oubliés', enabled: true },
      { channelId: '1481028254721773588', channelName: '🃏・lore-et-théories', topic: 'lore gaming, easter eggs, secrets', enabled: true },
    ],
  },
  welcome: {
    enabled: true, channelId: '1481028178389635292', channelName: '👋・présentations',
    messages: [
      "T'inquiète, ici on a tous un cerveau un peu chaotique. T'es au bon endroit. 🧠",
      "Nouveau cerveau détecté. Initialisation en cours... 100%. Bienvenue !",
      "On sait pas encore si t'es RPG Addict ou Indie Explorer, mais on va vite le découvrir. 🎮",
      "BrainEXE t'a scanné. Résultat : tu vas te sentir chez toi ici. ✅",
      "Un de plus dans le chaos organisé. Parfait. 🎲",
      "Ton hyperfocus a enfin trouvé un serveur à sa hauteur. ⚡",
      "Loading nouvel ami... 100% — Chargement réussi !",
      "Cool tu arrives, on avait besoin de quelqu'un pour débattre si FF7 ou Persona 5 est meilleur.",
      "T'as trouvé la planque des cerveaux en surchauffe. Installe-toi. 🔥",
      "BrainEXE te souhaite la bienvenue. Le serveur aussi. Les memes aussi. 😂",
    ],
  },
  actus: {
    enabled: true, lastPostedSlots: [],
    channels: [
      { channelId: "1481028286892081183", channelName: "📰・actus-gaming",       topic: "gaming général, gros titres du mois", enabled: true },
      { channelId: "1481028247415296231", channelName: "🐉・jrpg-corner",        topic: "JRPG sorties, DLC, remasters", enabled: true },
      { channelId: "1481028244500385946", channelName: "⚔️・rpg-général",        topic: "RPG large, action-RPG, tactique", enabled: true },
      { channelId: "1481028272090386584", channelName: "🌿・indie-général",      topic: "indie sorties notables", enabled: true },
      { channelId: "1481028274590322850", channelName: "🔭・à-découvrir",        topic: "kickstarters et jeux annoncés", enabled: true },
      { channelId: "1481028283486175245", channelName: "🚀・next-gen-général",   topic: "PS5 Xbox Series PC actus", enabled: true },
      { channelId: "1481028291094904995", channelName: "🎮・game-of-the-moment", topic: "le jeu que tout le monde joue", enabled: true },
      { channelId: "1481028260753051739", channelName: "🕹️・retro-général",     topic: "retro remasters, anniversaires", enabled: true },
      { channelId: "1481028304206041243", channelName: "🤖・ia-et-tools",        topic: "IA et outils devs créateurs", enabled: true },
    ],
  },
  conversations: {
    enabled: true, maxPerDay: 16, dailyCount: 0, lastPostDate: null, lastPostByChannel: {}, canReply: true,
    channels: [
      { channelId: "1481028189680570421", channelName: "💬・général",            topic: "gaming général et vie communauté", enabled: true },
      { channelId: "1481028192088100977", channelName: "🧠・cerveau-en-feu",     topic: "hyperfocus, pensées random TDAH", enabled: true },
      { channelId: "1481028195032760531", channelName: "😂・memes-et-chaos",     topic: "humour, memes, questions fun", enabled: true },
      { channelId: "1481028197515788360", channelName: "🎲・off-topic",          topic: "questions insolites et random", enabled: true },
      { channelId: "1481028199948222584", channelName: "🖼️・partage-créations",  topic: "défi créatif et inspiration", enabled: true },
      { channelId: "1481028244500385946", channelName: "⚔️・rpg-général",        topic: "débats RPG, mécaniques, perso préféré", enabled: true },
      { channelId: "1481028247415296231", channelName: "🐉・jrpg-corner",        topic: "JRPG, OST, waifu tier list", enabled: true },
      { channelId: "1481028250741506189", channelName: "🗺️・open-world-rpg",     topic: "exploration vs histoire, open world favori", enabled: true },
      { channelId: "1481028254721773588", channelName: "🃏・lore-et-théories",   topic: "théorie du moment, lore deep-dive", enabled: true },
      { channelId: "1481028260753051739", channelName: "🕹️・retro-général",     topic: "console et souvenirs retro", enabled: true },
      { channelId: "1481028264410484837", channelName: "🏆・hidden-gems",        topic: "hidden gem à partager", enabled: true },
      { channelId: "1481028266830860340", channelName: "📼・nostalgie",          topic: "souvenirs gaming et nostalgie", enabled: true },
      { channelId: "1481028272090386584", channelName: "🌿・indie-général",      topic: "indie chouchou, underrated", enabled: true },
      { channelId: "1481028274590322850", channelName: "🔭・à-découvrir",        topic: "jeux attendus, futures sorties", enabled: true },
      { channelId: "1481028277182402701", channelName: "🎨・pixel-art-love",     topic: "coup de coeur visuel, DA préférée", enabled: true },
      { channelId: "1481028283486175245", channelName: "🚀・next-gen-général",   topic: "next-gen vs génération précédente", enabled: true },
      { channelId: "1481028291094904995", channelName: "🎮・game-of-the-moment", topic: "avancement dans le jeu du moment", enabled: true },
      { channelId: "1481028228515631307", channelName: "⚡・tips-focus",         topic: "tips productivité, technique focus", enabled: true },
      { channelId: "1481028238955249796", channelName: "🎧・playlist-focus",     topic: "playlist et musique de focus", enabled: true },
      { channelId: "1481028304206041243", channelName: "🤖・ia-et-tools",        topic: "outils IA utilisés en ce moment", enabled: true },
      { channelId: "1481028297025650771", channelName: "💻・code-talk",          topic: "question dev, langage favori", enabled: true },
    ],
  },
  reactionRoles: {
    enabled: true, messageId: '1481033797800693790', channelId: '1481028181485027471',
    mappings: [
      { emoji: '📱', roleName: '📱 TikToker' }, { emoji: '🧠', roleName: '🧠 TDAH' },
      { emoji: '💜', roleName: '💜 Borderline' }, { emoji: '💻', roleName: '💻 Web Dev' },
      { emoji: '⚔️', roleName: '⚔️ RPG Addict' }, { emoji: '🕹️', roleName: '🕹️ Retro Gamer' },
      { emoji: '🌿', roleName: '🌿 Indie Explorer' }, { emoji: '🚀', roleName: '🚀 Next-Gen Player' },
      { emoji: '🔔', roleName: '🔔 Notif Lives' }, { emoji: '👁️', roleName: '👁️ Lurker' },
    ],
  },
  tiktokLive: {
    enabled: true, username: process.env.TIKTOK_USERNAME || 'brain.exe_modded',
    channelId: '1481028204897501273', channelName: '🔴・alertes-live', pingRoleName: '🔔 Notif Lives',
  },
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      let anecdoteMerged = { ...DEFAULT_CONFIG.anecdote, ...(raw.anecdote || {}) };
      if (!Array.isArray(anecdoteMerged.channels)) { anecdoteMerged.channels = DEFAULT_CONFIG.anecdote.channels; }
      return {
        anecdote: anecdoteMerged,
        welcome: { ...DEFAULT_CONFIG.welcome, ...(raw.welcome || {}) },
        actus: { ...DEFAULT_CONFIG.actus, ...(raw.actus || {}) },
        conversations: { ...DEFAULT_CONFIG.conversations, ...(raw.conversations || {}) },
        reactionRoles: { ...DEFAULT_CONFIG.reactionRoles, ...(raw.reactionRoles || {}) },
        tiktokLive: { ...DEFAULT_CONFIG.tiktokLive, ...(raw.tiktokLive || {}) },
      };
    }
  } catch (e) { console.error('Config load error:', e.message); }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig() {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2), 'utf8'); } catch (e) { console.error('Config save error:', e.message); }
}

let botConfig = loadConfig();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const discord = new Client({
  intents: [INTENTS_GUILDS, INTENTS_GUILD_MEMBERS, INTENTS_GUILD_MESSAGES, INTENTS_MESSAGE_CONTENT, INTENTS_GUILD_REACTIONS, INTENTS_DIRECT_MESSAGES],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

let AUTO_ROLE_NAME = '👁️ Lurker';
let changeLog = [];
let isApplyingFile = false, isApplyingDiscord = false;
let debounceDiscord = null, debounceFile = null;
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
  await guild.channels.fetch(); await guild.roles.fetch();
  const membersCollection = await guild.members.fetch().catch(() => new Map());
  const members = [...membersCollection.values()].filter(m => !m.user.bot)
    .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0))
    .map(m => ({ id: m.id, username: m.user.username, displayName: m.displayName || m.user.username, avatar: m.user.displayAvatarURL({ size: 64, forceStatic: true }), roles: m.roles.cache.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position).map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0') })), joinedAt: m.joinedAt ? m.joinedAt.toLocaleDateString('fr-FR') : '—' }));
  const roles = guild.roles.cache.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position).map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0'), hoist: r.hoist, position: r.position }));
  const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).sort((a, b) => a.rawPosition - b.rawPosition);
  const structure = [];
  for (const [, cat] of categories) {
    const channels = guild.channels.cache.filter(c => c.parentId === cat.id).sort((a, b) => a.rawPosition - b.rawPosition).map(c => ({ id: c.id, name: c.name, type: c.type === ChannelType.GuildVoice ? 'voice' : 'text', topic: c.topic || '' }));
    structure.push({ id: cat.id, category: cat.name, channels });
  }
  guildCache = { id: guild.id, name: guild.name, memberCount: guild.memberCount, botTag: discord.user?.tag ?? '—', members, roles, structure, totalChannels: structure.reduce((a, s) => a + s.channels.length, 0) };
  return guildCache;
}

function scheduleDiscordToFile(r) { if (isApplyingFile) return; if (debounceDiscord) clearTimeout(debounceDiscord); debounceDiscord = setTimeout(() => syncDiscordToFile(r), 2000); }
async function syncDiscordToFile(reason) {
  if (isApplyingFile) return; isApplyingDiscord = true;
  try { const state = await readGuildState(); const template = { _info: { lastSync: new Date().toISOString(), source: 'discord', server: state.name, totalRoles: state.roles.length, totalChannels: state.totalChannels }, roles: state.roles, structure: state.structure }; fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(template, null, 2), 'utf8'); syncStats.d2f++; pushLog('D→F', `Fichier mis à jour`); broadcast('state', state); broadcast('stats', syncStats); }
  catch (err) { pushLog('ERR', err.message, 'error'); } finally { isApplyingDiscord = false; }
}
function scheduleFileToDiscord() { if (isApplyingDiscord) return; if (debounceFile) clearTimeout(debounceFile); debounceFile = setTimeout(() => syncFileToDiscord(), 2000); }
async function syncFileToDiscord() {
  if (isApplyingDiscord) return; isApplyingFile = true; let changes = 0;
  try {
    const raw = fs.readFileSync(TEMPLATE_FILE, 'utf8'); const template = JSON.parse(raw);
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); await guild.roles.fetch();
    pushLog('F→D', 'Application sur Discord...');
    for (const rd of template.roles || []) { const color = parseInt((rd.color || '#000000').replace('#', ''), 16); const existing = guild.roles.cache.find(r => r.name === rd.name); if (!existing) { await guild.roles.create({ name: rd.name, color, hoist: rd.hoist || false, permissions: [], reason: 'Dashboard sync' }); changes++; await sleep(400); } else if (existing.color !== color || existing.hoist !== rd.hoist) { await existing.edit({ color, hoist: rd.hoist, reason: 'Dashboard sync' }); changes++; await sleep(300); } }
    for (const block of template.structure || []) { let cat = guild.channels.cache.find(c => c.name === block.category && c.type === ChannelType.GuildCategory); if (!cat) { cat = await guild.channels.create({ name: block.category, type: ChannelType.GuildCategory, reason: 'Dashboard sync' }); changes++; await sleep(400); } for (const ch of block.channels || []) { const chType = ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText; const existing = guild.channels.cache.find(c => c.name === ch.name && c.parentId === cat.id); if (!existing) { const opts = { name: ch.name, type: chType, parent: cat.id, reason: 'Dashboard sync' }; if (ch.topic) opts.topic = ch.topic; await guild.channels.create(opts); changes++; await sleep(350); } else if (ch.topic && existing.topic !== ch.topic) { await existing.setTopic(ch.topic, 'Dashboard sync'); changes++; await sleep(300); } } }
    if (changes > 0) { syncStats.f2d += changes; pushLog('F→D', `✓ ${changes} changement(s)`, 'success'); broadcast('stats', syncStats); await syncDiscordToFile('Post-apply resync'); } else pushLog('F→D', 'Aucun changement');
  } catch (err) { if (err instanceof SyntaxError) pushLog('ERR', 'JSON invalide', 'error'); else pushLog('ERR', err.message, 'error'); } finally { isApplyingFile = false; }
}

function registerDiscordEvents() {
  discord.on(Events.ChannelCreate, ch => { if (ch.guildId !== GUILD_ID) return; scheduleDiscordToFile(`Salon créé : ${ch.name}`); });
  discord.on(Events.ChannelDelete, ch => { if (ch.guildId !== GUILD_ID) return; scheduleDiscordToFile(`Salon supprimé : ${ch.name}`); });
  discord.on(Events.ChannelUpdate, (o, n) => { if (n.guildId !== GUILD_ID) return; if (o.name !== n.name || o.topic !== n.topic || o.parentId !== n.parentId) scheduleDiscordToFile('channel update'); });
  discord.on(Events.GuildRoleCreate, r => { if (r.guild.id !== GUILD_ID) return; scheduleDiscordToFile(`Rôle créé : ${r.name}`); });
  discord.on(Events.GuildRoleDelete, r => { if (r.guild.id !== GUILD_ID) return; scheduleDiscordToFile(`Rôle supprimé : ${r.name}`); });
  discord.on(Events.GuildRoleUpdate, (o, n) => { if (n.guild.id !== GUILD_ID) return; if (o.name !== n.name || o.color !== n.color) scheduleDiscordToFile('Rôle modifié'); });
}

async function handleReaction(reaction, user, add) {
  if (user.bot) return;
  try {
    if (reaction.partial) await reaction.fetch(); if (reaction.message.partial) await reaction.message.fetch();
    const cfg = botConfig.reactionRoles; if (!cfg.enabled || reaction.message.id !== cfg.messageId) return;
    const mapping = cfg.mappings.find(m => m.emoji === reaction.emoji.name); if (!mapping) return;
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.roles.fetch();
    const role = guild.roles.cache.find(r => r.name === mapping.roleName); if (!role) return;
    const member = await guild.members.fetch(user.id);
    if (add) { await member.roles.add(role); pushLog('API', `✅ ${mapping.roleName} → ${user.tag}`, 'success'); broadcast('autorole', { user: user.tag, role: mapping.roleName }); }
    else { await member.roles.remove(role); pushLog('API', `➖ ${mapping.roleName} retiré à ${user.tag}`); }
  } catch (err) { pushLog('ERR', `Reaction role échoué : ${err.message}`, 'error'); }
}

discord.on(Events.MessageReactionAdd,    (r, u) => handleReaction(r, u, true));
discord.on(Events.MessageReactionRemove, (r, u) => handleReaction(r, u, false));

discord.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== GUILD_ID) return;
  try {
    await member.guild.roles.fetch();
    const role = member.guild.roles.cache.find(r => r.name === AUTO_ROLE_NAME);
    if (role) { await member.roles.add(role); pushLog('API', `Auto-role → ${member.user.tag}`, 'success'); broadcast('autorole', { user: member.user.tag, role: role.name }); }
    await sendWelcomeMessage(member);
  } catch (err) { pushLog('ERR', `Arrivée échouée : ${err.message}`, 'error'); }
});

// ── DELAYED REPLY HELPERS v2.0.4 ─────────────────────────────

function getEmojiExcuse(slot, mood) {
  const bySlot = {
    wakeup:      ["ah pardon je répondais depuis le lit encore à moitié endormie 😅", "j'étais en mode zombie total, j'ai juste réagi sans réfléchir lol"],
    active:      ["sorry j'étais sur un truc, je reviens maintenant 👀", "j'avais la tête ailleurs, je lisais un thread sur un jeu — bref", "j'ai réagi et j'ai disparu dans mon hyperfocus, classique"],
    lunch:       ["j'avais la bouche pleine sérieusement 😂 là je peux répondre proprement", "j'étais en train de manger, j'ai juste réagi pour dire que j'avais vu", "pause repas, je pouvais pas taper — là c'est bon"],
    productive:  ["j'avais un truc en cours, j'ai juste réagi pour noter que t'avais écrit", "je venais de lancer un jeu, j'ai répondu à l'arrache 😅", "j'étais sur les actus du moment et j'ai pas pu répondre direct"],
    transition:  ["je rangeais mes affaires, j'ai réagi mais j'avais pas le temps de répondre", "j'étais en train de me préparer pour la soirée gaming — là je suis dispo"],
    gaming:      ["j'étais sur un boss, IMPOSSIBLE de répondre à ce moment précis 😭", "j'étais en pleine session, j'ai réagi pour dire que j'avais vu mais je pouvais pas lâcher le jeu", "j'étais sur un moment chaud dans ma partie, je pouvais pas taper — là c'est bon", "je regardais un trailer qui venait de tomber, j'ai pas pu m'arrêter 👀", "j'étais sur Reddit gaming, t'sais quand tu tombes dans un thread sans fin"],
    latenight:   ["j'étais encore sur mon jeu à une heure de merde, là je décroche 5 min", "hyperfocus gaming tardif, je répondais plus à rien — désolée 😅"],
  };
  const byMood = {
    hyperfocus:  ["j'étais en plein hyperfocus, j'entends plus rien quand ça prend 😂"],
    zombie:      ["j'étais dans le brouillard total là, pardon"],
    chill:       ["j'étais posée, j'ai réagi et j'ai oublié de répondre correctement lol"],
  };
  const all = [...(bySlot[slot?.status] || bySlot.active), ...(byMood[mood] || [])];
  return all.length ? all[Math.floor(Math.random() * all.length)] : "désolée j'avais la tête ailleurs 😅";
}

async function scheduleDelayedReplyAfterEmoji(message, userQuery, emojiUsed, slot, mood) {
  const delayMs = Math.floor((15 + Math.random() * 30) * 60 * 1000);
  pushLog('SYS', `⏳ Retour tardif planifié dans ${Math.round(delayMs / 60000)} min (emoji ${emojiUsed} → ${message.author.username})`);
  setTimeout(async () => {
    try {
      const currentSlot = getCurrentSlot();
      if (currentSlot.maxConv === 0) { pushLog('SYS', `💤 Retour tardif annulé — Brainee dort`); return; }
      const excuse = getEmojiExcuse(slot, mood);
      const fetched = await message.channel.messages.fetch({ limit: 50 });
      const contextLines = formatContext(fetched, null, 40);
      const profile = await getMemberProfile(message.author.id);
      const toneInstruction = getToneInstruction(profile, message.author.username);
      const channelMemory = await getChannelMemory(message.channelId);
      const memoryBlock = formatChannelMemoryBlock(channelMemory);
      const currentMood = refreshDailyMood();
      const dirEntryD = await getChannelDirectory(message.channelId);
      const chTopicD = botConfig.conversations.channels.find(c => c.channelId === message.channelId)?.topic || message.channel.name;
      const intentBlockD = getChannelIntentBlock(message.channel.name, chTopicD, dirEntryD?.officialDescription || '');
      const systemPrompt = `${BOT_PERSONA_CONVERSATION}\n${toneInstruction}\nHumeur : ${currentMood}. ${getMoodInjection(currentMood)}\n${memoryBlock}\n${intentBlockD}\nContexte récent #${message.channel.name} :\n${contextLines}\nTu reviens après avoir réagi avec ${emojiUsed} sans répondre.`;
      const userPrompt = `Tu dois répondre à cette question de ${message.author.username} que t'as laissée sans réponse : "${userQuery}"\nCommence par cette excuse (reformule légèrement si besoin) : "${excuse}"\nPuis réponds vraiment à la question. Max 3 phrases au total.`;
      const reply = await callClaude(systemPrompt, userPrompt, 250);
      const replyResolved = resolveMentionsInText(reply, message.guild);
      await simulateTyping(message.channel, 1000 + Math.random() * 2000);
      await message.reply(replyResolved);
      lastAnyBotPostTime = Date.now();
      await updateMemberProfile(message.author.id, message.author.username, userQuery);
      pushLog('SYS', `↩️ Retour tardif envoyé à ${message.author.username}`, 'success');
    } catch (err) { pushLog('ERR', `Retour tardif échoué : ${err.message}`, 'error'); }
  }, delayMs);
}

async function scheduleDelayedSpontaneousReply(lastMsg, channelObj, slot, mood, emojiUsed) {
  const delayMs = Math.floor((10 + Math.random() * 20) * 60 * 1000);
  pushLog('SYS', `⏳ Retour spontané planifié dans ${Math.round(delayMs / 60000)} min (emoji → ${lastMsg.author.username})`);
  setTimeout(async () => {
    try {
      const currentSlot = getCurrentSlot();
      if (currentSlot.maxConv === 0) return;
      const excuse = getEmojiExcuse(slot, mood);
      const guild = await discord.guilds.fetch(GUILD_ID);
      await guild.channels.fetch();
      const channel = guild.channels.cache.get(channelObj.channelId);
      if (!channel) return;
      const msgs = await channel.messages.fetch({ limit: 50 });
      const context = formatContext(msgs, null, 40);
      const profile = await getMemberProfile(lastMsg.author.id);
      const toneInstruction = getToneInstruction(profile, lastMsg.author.username);
      const channelMemory = await getChannelMemory(channelObj.channelId);
      const memoryBlock = formatChannelMemoryBlock(channelMemory);
      const currentMood = refreshDailyMood();
      const dirEntryS = await getChannelDirectory(channelObj.channelId);
      const intentBlockS = getChannelIntentBlock(channel.name, channelObj.topic || '', dirEntryS?.officialDescription || '');
      const systemPrompt = `${BOT_PERSONA_CONVERSATION}\n${toneInstruction}\nHumeur : ${currentMood}. ${getMoodInjection(currentMood)}\n${memoryBlock}\n${intentBlockS}\nContexte récent #${channel.name} :\n${context}\nTu reviens après avoir réagi avec ${emojiUsed} sans rien dire.`;
      const userPrompt = `${lastMsg.author.username} avait dit : "${lastMsg.content}"\nTu avais juste réagi avec ${emojiUsed} sans répondre. Tu reviens maintenant.\nCommence par : "${excuse}"\nPuis réponds naturellement. Max 2-3 phrases.`;
      const reply = await callClaude(systemPrompt, userPrompt, 200);
      const replyResolved = resolveMentionsInText(reply, guild);
      await simulateTyping(channel, 800 + Math.random() * 1500);
      await lastMsg.reply(replyResolved);
      lastAnyBotPostTime = Date.now();
      await updateConvStats(channelObj.channelId);
      await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, lastMsg.content);
      pushLog('SYS', `↩️ Retour spontané envoyé à ${lastMsg.author.username}`, 'success');
    } catch (err) { pushLog('ERR', `Retour spontané tardif échoué : ${err.message}`, 'error'); }
  }, delayMs);
}

// ════════════════════════════════════════════════════════════
// ── DM HANDLER v2.0.5 ────────────────────────────────────────
// Brainee répond en messages privés avec mémoire MongoDB
// Ton plus intime, historique persistant par utilisateur
// ════════════════════════════════════════════════════════════

discord.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.type !== 1) return; // 1 = DMChannel
  if (!ANTHROPIC_API_KEY) return;

  const userContent = message.content?.trim();
  if (!userContent) return;

  try {
    // Historique DM depuis MongoDB
    const history = await getDmHistory(message.author.id);
    const historyBlock = formatDmHistory(history);
    const profile = await getMemberProfile(message.author.id);
    const toneInstruction = getToneInstruction(profile, message.author.username);
    const mood = refreshDailyMood();

    // Construction du system prompt DM — ton intime
    const systemPrompt = `${BOT_PERSONA_DM}

${toneInstruction}

Humeur du jour : ${mood}. ${getMoodInjection(mood)}

${historyBlock ? `Historique de vos échanges précédents :\n${historyBlock}` : 'Premier échange avec cette personne.'}

Tu es en message privé avec ${message.author.username}. Réponds de façon naturelle et suivie.`;

    const userPrompt = `${message.author.username} : "${userContent}"`;

    // Typing indicator DM
    await simulateTyping(message.channel, 1000 + Math.random() * 2000);

    const reply = await callClaude(systemPrompt, userPrompt, 350);

    // Fragmentation possible en DM (15% au lieu de 20% — moins haché en privé)
    if (Math.random() < 0.15 && reply.length > 80) {
      await sendHuman(message.channel, reply);
    } else {
      await message.reply(reply);
    }

    // Sauvegarde historique DM
    await appendDmMessage(message.author.id, message.author.username, 'user', userContent);
    await appendDmMessage(message.author.id, message.author.username, 'assistant', reply);

    // Mise à jour profil membre
    await updateMemberProfile(message.author.id, message.author.username, userContent);

    pushLog('SYS', `📨 DM répondu à ${message.author.username} (mood: ${mood})`, 'success');

  } catch (err) {
    pushLog('ERR', `DM handler échoué pour ${message.author.username} : ${err.message}`, 'error');
  }
});

// ── @MENTION v2.0.2 + mémoire salon v2.0.3 ───────────────────
discord.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild || message.guild.id !== GUILD_ID) return;
  if (!discord.user || !message.mentions.has(discord.user)) return;
  const userQuery = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!userQuery) return;
  const slot = getCurrentSlot();
  if (slot.status === 'sleep') {
    const age = Date.now() - message.createdTimestamp;
    if (age > 2 * 60 * 60 * 1000) { pushLog('SYS', `💤 @mention ignorée (trop vieux)`); return; }
    const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const wakeHour = getParisDay() === 0 ? 10 : 9;
    let msUntilWake = ((wakeHour - paris.getHours()) * 60 - paris.getMinutes()) * 60 * 1000;
    if (msUntilWake < 0) msUntilWake = 0;
    if (msUntilWake > 10 * 60 * 60 * 1000) { pushLog('SYS', `💤 @mention ignorée (réveil trop loin)`); return; }
    setTimeout(() => handleMentionReply(message, userQuery), msUntilWake);
    return;
  }
  const delayMs = getMentionDelayMs(slot);
  if (delayMs > 0) setTimeout(() => handleMentionReply(message, userQuery), delayMs);
  else handleMentionReply(message, userQuery);
});

async function handleMentionReply(message, userQuery) {
  try {
    const slot = getCurrentSlot(); // slot au moment de la réponse (v2.0.4)
    const fetched = await message.channel.messages.fetch({ limit: 100 });
    const contextLines = formatContext(fetched, message.id, 80);
    const profile = await getMemberProfile(message.author.id);
    const toneInstruction = getToneInstruction(profile, message.author.username);
    const mood = refreshDailyMood();
    const channelMemory = await getChannelMemory(message.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    // v2.0.6 : description officielle du salon
    const dirEntry = await getChannelDirectory(message.channelId);
    const channelTopic = botConfig.conversations.channels.find(c => c.channelId === message.channelId)?.topic || message.channel.name;
    const intentBlock = getChannelIntentBlock(message.channel.name, channelTopic, dirEntry?.officialDescription || '');

    const taggedMembers = [...message.mentions.users.values()].filter(u => u.id !== discord.user.id).map(u => '@' + u.username);
    const taggedBlock = taggedMembers.length > 0 ? `Membres tagués : ${taggedMembers.join(', ')}. Inclus-les naturellement si pertinent.` : '';

    const needsYoutube = YOUTUBE_KEYWORDS.some(kw => userQuery.toLowerCase().includes(kw));
    let youtubeBlock = '';
    if (needsYoutube && YOUTUBE_API_KEY) {
      try {
        const q = await extractYoutubeQuery(userQuery);
        const results = await searchYoutube(q, 3);
        if (results.length) youtubeBlock = '\n\nInfos web:\n' + results.map(r => `• [${r.title}](${r.url}) — *${r.channel}*`).join('\n');
      } catch (_) {}
    }

    const systemPrompt = `${BOT_PERSONA_CONVERSATION}
${toneInstruction}
Humeur du jour : ${mood}. ${getMoodInjection(mood)}
${memoryBlock}
${intentBlock}
Contexte #${message.channel.name} :
${contextLines}
${taggedBlock}
Tu réponds uniquement à ${message.author.username}.`;

    const reactionRoll = Math.random();
    if (reactionRoll < 0.10) {
      const emoji = getRandomReaction(userQuery);
      await message.react(emoji);
      await updateMemberProfile(message.author.id, message.author.username, userQuery);
      pushLog('SYS', `😏 Réaction seule : ${emoji} → ${message.author.username} (retour tardif planifié)`);
      scheduleDelayedReplyAfterEmoji(message, userQuery, emoji, slot, mood);
      return;
    }
    const reply = await callClaude(systemPrompt, `${message.author.username} dit : "${userQuery}"\nMax 3 phrases.`, 250);
    const replyResolved = resolveMentionsInText(reply, message.guild);
    if (reactionRoll < 0.35) await message.react(getRandomReaction(userQuery + reply)).catch(() => {});
    await sendHuman(message.channel, replyResolved + youtubeBlock, message);
    await updateMemberProfile(message.author.id, message.author.username, userQuery);
    pushLog('SYS', `💬 @mention → ${message.author.username} (mood: ${mood})`, 'success');
  } catch (err) { pushLog('ERR', `handleMentionReply échoué : ${err.message}`, 'error'); }
}

function startFileWatcher() {
  const w = chokidar.watch(TEMPLATE_FILE, { persistent: true, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 } });
  w.on('change', () => { if (isApplyingDiscord) return; scheduleFileToDiscord(); });
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 400) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
  });
  if (!response.ok) { const e = await response.text(); throw new Error(`Anthropic ${response.status}: ${e}`); }
  return (await response.json()).content[0].text.trim();
}

async function extractYoutubeQuery(userMessage) {
  const q = await callClaude('Tu extrais une requête YouTube optimale depuis un message Discord. Réponds UNIQUEMENT avec la requête, max 8 mots.', `Message : "${userMessage}"\nQuelle est la meilleure requête YouTube ?`, 50);
  return q.replace(/["']/g, '').trim();
}

async function searchYoutube(query, maxResults = 3) {
  if (!YOUTUBE_API_KEY) return [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${YOUTUBE_API_KEY}&relevanceLanguage=fr`;
    const data = await (await fetch(url)).json();
    if (!data.items?.length) return [];
    return data.items.map(i => ({ title: i.snippet.title, url: `https://www.youtube.com/watch?v=${i.id.videoId}`, channel: i.snippet.channelTitle }));
  } catch (err) { pushLog('ERR', `YouTube échoué : ${err.message}`, 'error'); return []; }
}

// ── ANECDOTE ─────────────────────────────────────────────────
async function generateAnecdote(ch) {
  const mood = refreshDailyMood();
  return callClaude(BOT_PERSONA + `\nHumeur : ${mood}. ${getMoodInjection(mood)}\nTu génères des anecdotes gaming courtes, vraies, surprenantes.`, `Anecdote gaming sur : ${ch.topic}. 2-3 phrases max. Direct. Fin : 🕹️ *[Jeu concerné]*`, 400);
}

async function postDailyAnecdote() {
  const cfg = botConfig.anecdote;
  if (!cfg.enabled) return;
  const todayStr = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  if (cfg.lastPostedDate === todayStr) return;
  const active = (cfg.channels || []).filter(c => c.enabled);
  if (!active.length) return;
  const ch = active[Math.floor(Math.random() * active.length)];
  try {
    const text = await generateAnecdote(ch);
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId); if (!channel) return;
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
    const embed = new EmbedBuilder().setColor(0x7c5cbf).setTitle('🎮 Anecdote Gaming du jour').setDescription(text).setFooter({ text: `${today.charAt(0).toUpperCase() + today.slice(1)} • Brainee` }).setTimestamp();
    const sentMsg = await channel.send({ content: '**🧠 Le saviez-vous ?**', embeds: [embed] });
    try {
      const tName = await callClaude('Génères un nom de fil Discord court (max 60 car, pas de guillemets, emoji gaming).', `Nom de fil pour : ${text.slice(0, 200)}`, 60);
      await sentMsg.startThread({ name: tName.replace(/"/g, '').trim().slice(0, 100), autoArchiveDuration: 1440, reason: 'Fil anecdote Brainee' });
      pushLog('SYS', `🧵 Fil anecdote créé`, 'success');
    } catch (_) {}
    botConfig.anecdote.lastPostedDate = todayStr; saveConfig();
    await setBotState({ anecdoteLastPostedDate: todayStr });
    pushLog('SYS', `✅ Anecdote → #${ch.channelName}`, 'success');
    broadcast('anecdote', { status: 'posted', channel: ch.channelName });
  } catch (err) { pushLog('ERR', `Anecdote échouée : ${err.message}`, 'error'); }
}

let anecdoteCron = null;
function startAnecdoteCron() {
  if (anecdoteCron) { try { anecdoteCron.stop(); } catch {} }
  const h = botConfig.anecdote.hour || 10;
  anecdoteCron = cron.schedule(`0 ${h} * * *`, () => { const d = Math.floor(Math.random() * (botConfig.anecdote.randomDelayMax || 30) * 60 * 1000); setTimeout(postDailyAnecdote, d); }, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron anecdote → ${h}h`);
}

async function checkAnecdoteMissed() {
  const cfg = botConfig.anecdote; if (!cfg.enabled) return;
  const state = await getBotState();
  const parisNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  if ((state.anecdoteLastPostedDate || cfg.lastPostedDate) === parisNow.toLocaleDateString('fr-CA')) return;
  if (parisNow.getHours() >= (cfg.hour || 10)) { pushLog('SYS', `⚠️ Anecdote manquée — rattrapage 30s`); setTimeout(postDailyAnecdote, 30000); }
}

async function sendWelcomeMessage(member) {
  const cfg = botConfig.welcome; if (!cfg.enabled || !cfg.messages?.length) return;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId); if (!channel) return;
    const phrase = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
    const embed = new EmbedBuilder().setColor(0x7c5cbf).setTitle(`👾 Bienvenue ${member.user.username} !`).setDescription(`${phrase}\n\n📋 Lis les règles → <#1481028175474589827>\n🎭 Choisis tes rôles → <#1481028181485027471>\n💬 Présente-toi ici !`).setThumbnail(member.user.displayAvatarURL({ size: 128 })).setFooter({ text: 'BrainEXE • Neurodivergent Creator Hub' }).setTimestamp();
    await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
    pushLog('SYS', `👋 Welcome → ${member.user.tag}`, 'success');
  } catch (err) { pushLog('ERR', `Welcome échoué : ${err.message}`, 'error'); }
}

// ── ACTUS ────────────────────────────────────────────────────
async function postActuForChannel(ch) {
  try {
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId); if (!channel || !ANTHROPIC_API_KEY) return false;
    const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
    const content = await callClaude(BOT_PERSONA + "\nTu résumes les actus gaming récentes.", `Récap actus pour : ${ch.topic}. 4-6 actus avec emojis. Ton Brainee. Commence direct.`, 600);
    const embed = new EmbedBuilder().setColor(0x5b7fff).setTitle(`📅 Actus ${month.charAt(0).toUpperCase() + month.slice(1)}`).setDescription(content).setFooter({ text: `${ch.channelName} • Brainee` }).setTimestamp();
    await channel.send({ embeds: [embed] });
    pushLog('SYS', `✅ Actus → ${ch.channelName}`, 'success');
    broadcast('actuPosted', { channel: ch.channelName });
    return true;
  } catch (err) { pushLog('ERR', `Actus échouées ${ch.channelName} : ${err.message}`, 'error'); return false; }
}

function getCurrentActusSlot() {
  const p = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${p.getDate() < 15 ? '1' : '15'}`;
}

function postBiMonthlyActus(force) {
  const cfg = botConfig.actus; if (!cfg.enabled) return;
  const slotKey = getCurrentActusSlot();
  const posted = Array.isArray(cfg.lastPostedSlots) ? cfg.lastPostedSlots : [];
  if (!force && posted.includes(slotKey)) { pushLog('SYS', `Actus déjà postées (${slotKey})`); return; }
  const active = cfg.channels.filter(c => c.enabled); if (!active.length) return;
  if (!force) { botConfig.actus.lastPostedSlots = [...posted, slotKey].slice(-20); saveConfig(); setBotState({ actusLastPostedSlots: botConfig.actus.lastPostedSlots }).catch(() => {}); }
  const windowMs = 12 * 60 * 60 * 1000;
  pushLog('SYS', `📅 Actus bi-mensuelles — ${active.length} salons sur 12h`);
  active.forEach(ch => setTimeout(() => postActuForChannel(ch), Math.floor(Math.random() * windowMs)));
}

let actusCron = null;
function startActusCron() {
  if (actusCron) { try { actusCron.stop(); } catch {} }
  actusCron = cron.schedule('0 10 1,15 * *', () => postBiMonthlyActus(false), { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ Cron actus → 1er et 15 du mois`);
}

async function checkActusMissed() {
  const cfg = botConfig.actus; if (!cfg.enabled) return;
  const state = await getBotState();
  const p = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  if ((p.getDate() !== 1 && p.getDate() !== 15) || p.getHours() < 10 || p.getHours() >= 22) return;
  const slotKey = getCurrentActusSlot();
  const allSlots = [...new Set([...(state.actusLastPostedSlots || []), ...(Array.isArray(cfg.lastPostedSlots) ? cfg.lastPostedSlots : [])])];
  if (allSlots.includes(slotKey)) return;
  pushLog('SYS', `⚠️ Actus manquées — rattrapage 60s`); setTimeout(() => postBiMonthlyActus(false), 60000);
}

// ── CONVERSATIONS ────────────────────────────────────────────
function getTodayStr() { return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); }
function getConvDailyCount() { return botConfig.conversations.dailyCount || 0; }
function getConvMaxPerDay() { return botConfig.conversations.maxPerDay || 16; }

async function resetDailyCountIfNeeded() {
  const todayStr = getTodayStr();
  if (botConfig.conversations.lastPostDate !== todayStr) {
    const state = await getBotState();
    if (state.convLastPostDate === todayStr) { botConfig.conversations.lastPostDate = todayStr; botConfig.conversations.dailyCount = state.convDailyCount || 0; return; }
    botConfig.conversations.dailyCount = 0; botConfig.conversations.lastPostDate = todayStr; saveConfig();
    await setBotState({ convDailyCount: 0, convLastPostDate: todayStr });
    refreshDailyMood();
    pushLog('SYS', `🔄 Reset quota — nouveau jour`);
  }
}

async function updateConvStats(channelId) {
  if (!botConfig.conversations.lastPostByChannel) botConfig.conversations.lastPostByChannel = {};
  botConfig.conversations.lastPostByChannel[channelId] = Date.now();
  const todayStr = getTodayStr();
  if (botConfig.conversations.lastPostDate !== todayStr) { botConfig.conversations.dailyCount = 0; botConfig.conversations.lastPostDate = todayStr; }
  botConfig.conversations.dailyCount = (botConfig.conversations.dailyCount || 0) + 1;
  saveConfig();
  setBotState({ convDailyCount: botConfig.conversations.dailyCount, convLastPostDate: todayStr, convLastPostByChannel: botConfig.conversations.lastPostByChannel }).catch(() => {});
}

function getQuietestChannel() {
  const active = botConfig.conversations.channels.filter(c => c.enabled);
  if (!active.length) return null;
  const last = botConfig.conversations.lastPostByChannel || {};
  return [...active].sort((a, b) => (last[a.channelId] || 0) - (last[b.channelId] || 0))[0];
}

let lastAnyBotPostTime = 0;
const MIN_GAP_ANY_POST = 15 * 60 * 1000;

// ── LANCE-CONVERSATIONS v2.0.3 ────────────────────────────────
async function postRandomConversation() {
  const cfg = botConfig.conversations; if (!cfg.enabled) return;
  const slot = getCurrentSlot(); if (slot.maxConv === 0) return;
  await resetDailyCountIfNeeded();
  if (getConvDailyCount() >= getConvMaxPerDay()) return;
  if (Date.now() - lastAnyBotPostTime < getSlotIntervalMs(slot)) return;
  const ch = getQuietestChannel(); if (!ch) return;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId); if (!channel || !ANTHROPIC_API_KEY) return;
    const mode = getRandomMode(slot); const mood = refreshDailyMood();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    // v2.0.6 : description officielle + mode adapté au salon
    const dirEntryC = await getChannelDirectory(ch.channelId);
    const intentBlockC = getChannelIntentBlock(channel.name, ch.topic, dirEntryC?.officialDescription || '');
    const modeBlock = getModeInjectionForChannel(mode, channel.name, ch.topic);
    let contextBlock = '';
    try {
      const msgs = await channel.messages.fetch({ limit: 100 });
      const ctx = formatContext(msgs, null, 80);
      if (ctx.length > 20) contextBlock = `\nContexte récent (évite de répéter) :\n${ctx}`;
    } catch (_) {}
    const content = await callClaude(
      BOT_PERSONA + `\nHumeur : ${mood}. ${getMoodInjection(mood)}\n${memoryBlock}\n${intentBlockC}\n${modeBlock}` + contextBlock,
      `Max 3 phrases. Direct. Adapte-toi au salon.`,
      150
    );
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 1000 + Math.random() * 2000);
    const sentMsg = await channel.send(contentResolved);
    lastAnyBotPostTime = Date.now(); await updateConvStats(ch.channelId);
    if (shouldCreateThread(content, channel.name, false)) {
      try {
        const tName = await callClaude('Nom de fil Discord court (max 60 car, pas de guillemets, emoji adapté).', `Nom pour : "${content}"`, 60);
        await sentMsg.startThread({ name: tName.replace(/"/g, '').trim().slice(0, 100), autoArchiveDuration: 1440, reason: 'Fil conv Brainee' });
        pushLog('SYS', `🧵 Fil conv créé`, 'success');
      } catch (_) {}
    }
    pushLog('SYS', `💬 Conv [${mode.name}] ${ch.channelName} [${slot.label}] (${getConvDailyCount()}/${getConvMaxPerDay()})`, 'success');
    broadcast('conversation', { channel: ch.channelName, time: new Date().toLocaleTimeString('fr-FR'), mode: mode.name, slot: slot.label, dayCount: getConvDailyCount() });
  } catch (err) { pushLog('ERR', `Lance-conv échouée : ${err.message}`, 'error'); }
}

// ── REPLIES SPONTANÉES v2.0.3 ─────────────────────────────────
async function replyToConversations() {
  const cfg = botConfig.conversations; if (!cfg.enabled || !cfg.canReply || !ANTHROPIC_API_KEY) return;
  const slot = getCurrentSlot(); if (slot.maxConv === 0) return;
  if (Math.random() < 0.05) { pushLog('SYS', `💬 Ignore spontané 5%`); return; }
  const active = cfg.channels.filter(c => c.enabled); if (!active.length) return;
  const ch = active[Math.floor(Math.random() * active.length)];
  try {
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId); if (!channel) return;
    const msgs = await channel.messages.fetch({ limit: 100 });
    const msgArray = [...msgs.values()]; if (!msgArray.length) return;
    const lastMsg = msgArray[0];
    if (lastMsg.author.bot) return;
    const age = Date.now() - lastMsg.createdTimestamp;
    if (age < 20 * 60 * 1000 || age > 3 * 60 * 60 * 1000) return;
    if (Date.now() - (cfg.lastPostByChannel?.[ch.channelId] || 0) < Math.max(getSlotIntervalMs(slot), 90 * 60 * 1000)) return;
    if (Date.now() - lastAnyBotPostTime < MIN_GAP_ANY_POST) return;
    const msgContent = lastMsg.content; if (!msgContent || msgContent.length < 5) return;
    const profile = await getMemberProfile(lastMsg.author.id);
    const toneInstruction = getToneInstruction(profile, lastMsg.author.username);
    const mood = refreshDailyMood();
    const channelMemory = await getChannelMemory(ch.channelId);
    const memoryBlock = formatChannelMemoryBlock(channelMemory);
    // v2.0.6 : description officielle du salon
    const dirEntryR = await getChannelDirectory(ch.channelId);
    const intentBlockR = getChannelIntentBlock(channel.name, ch.topic, dirEntryR?.officialDescription || '');
    const context = formatContext(msgs, null, 80);
    const systemPrompt = `${BOT_PERSONA_CONVERSATION}\n${toneInstruction}\nHumeur : ${mood}. ${getMoodInjection(mood)}\n${memoryBlock}\n${intentBlockR}\nContexte #${channel.name} :\n${context}\nTu réponds uniquement à ${lastMsg.author.username}.`;
    const reactionRoll = Math.random();
    if (reactionRoll < 0.10) {
      const emoji = getRandomReaction(msgContent);
      await lastMsg.react(emoji);
      lastAnyBotPostTime = Date.now(); await updateConvStats(ch.channelId);
      await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, msgContent);
      pushLog('SYS', `😏 Réaction seule → ${lastMsg.author.username} (retour tardif planifié)`);
      scheduleDelayedSpontaneousReply(lastMsg, ch, slot, mood, emoji);
      return;
    }
    const reply = await callClaude(systemPrompt, `${lastMsg.author.username} dit : "${msgContent}"\n1-2 phrases.`, 150);
    const replyResolved = resolveMentionsInText(reply, guild);
    if (reactionRoll < 0.30) await lastMsg.react(getRandomReaction(msgContent + reply)).catch(() => {});
    await sendHuman(channel, replyResolved, lastMsg);
    lastAnyBotPostTime = Date.now(); await updateConvStats(ch.channelId);
    await updateMemberProfile(lastMsg.author.id, lastMsg.author.username, msgContent);
    // v2.0.6 : thread uniquement avec engagement humain
    const hasEngagement = (lastMsg.reactions?.cache?.size > 0) ||
      ([...msgs.values()].filter(m => m.reference?.messageId === lastMsg.id).length > 0);
    if (shouldCreateThread(reply, channel.name, hasEngagement)) {
      try {
        const tName = await callClaude('Nom de fil Discord court (max 60 car, pas de guillemets, emoji adapté).', `Nom pour : "${reply}"`, 60);
        await lastMsg.startThread({ name: tName.replace(/"/g, '').trim().slice(0, 100), autoArchiveDuration: 1440, reason: 'Fil reply Brainee' });
        pushLog('SYS', `🧵 Fil reply créé (avec engagement)`, 'success');
      } catch (_) {}
    }
    pushLog('SYS', `💬 Reply → ${lastMsg.author.username} (mood: ${mood})`, 'success');
    broadcast('conversation', { channel: ch.channelName, type: 'reply' });
  } catch (err) { if (!err.message.includes('Missing Permissions') && !err.message.includes('Unknown Message')) pushLog('ERR', `Reply échouée : ${err.message}`, 'error'); }
}

// ── COMPORTEMENTS SPÉCIAUX ────────────────────────────────────
async function postMorningGreeting() {
  const cfg = botConfig.conversations; if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get('1481028189680570421'); if (!channel) return;
    const day = getParisDay(); const mood = refreshDailyMood();
    const dayCtx = day === 0 ? 'dimanche, journée chill' : day === 6 ? 'samedi, pas de boulot' : 'jour de semaine';
    const content = await callClaude(BOT_PERSONA + `\nHumeur : ${mood}. Tu viens de te lever.`, `C'est ${dayCtx}. Check morning — qui est là, qui bosse, qui geek. Somnolent. Max 2 phrases.`, 120);
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 800); await channel.send(contentResolved);
    lastAnyBotPostTime = Date.now(); await updateConvStats('1481028189680570421');
    pushLog('SYS', `☕ Morning greeting posté`, 'success');
  } catch (err) { pushLog('ERR', `Morning échoué : ${err.message}`, 'error'); }
}

async function postLunchBack() {
  const cfg = botConfig.conversations; if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const ch = getQuietestChannel(); if (!ch) return;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get(ch.channelId); if (!channel) return;
    const content = await callClaude(BOT_PERSONA + '\nTu reviens de ta pause.', `Retour de pause dans ${ch.topic}. 1-2 phrases. Décontracté.`, 100);
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 600); await channel.send(contentResolved);
    lastAnyBotPostTime = Date.now(); await updateConvStats(ch.channelId);
    pushLog('SYS', `🍕 Lunch back posté`);
  } catch (err) { pushLog('ERR', `Lunch back échoué : ${err.message}`, 'error'); }
}

async function postGoodnight() {
  const cfg = botConfig.conversations; if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  const ids = ['1481028189680570421', '1481028244500385946', '1481028247415296231'];
  const targetId = ids[Math.floor(Math.random() * ids.length)];
  try {
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get(targetId); if (!channel) return;
    const content = await callClaude(BOT_PERSONA + '\nFin de soirée gaming.', `Message fin de soirée naturel. Style "je finis cette quête et je dors... normalement". 1-2 phrases. Jamais "bonsoir".`, 100);
    const contentResolved = resolveMentionsInText(content, guild);
    await simulateTyping(channel, 600); await channel.send(contentResolved);
    lastAnyBotPostTime = Date.now();
    pushLog('SYS', `🌙 Goodnight posté`);
  } catch (err) { pushLog('ERR', `Goodnight échoué : ${err.message}`, 'error'); }
}

async function postNightWakeup() {
  const cfg = botConfig.conversations; if (!cfg.enabled || !ANTHROPIC_API_KEY) return;
  try {
    const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get('1481028189680570421'); if (!channel) return;
    const content = await callClaude(BOT_PERSONA + '\nRéveil nocturne, mode zombie.', `Message ultra court — "j'arrive pas à dormir et je pense encore à [jeu/boss]". 1 phrase MAX.`, 80);
    const contentResolved = resolveMentionsInText(content, guild);
    await channel.send(contentResolved); lastAnyBotPostTime = Date.now();
    pushLog('SYS', `👁️ Night wakeup posté`);
  } catch (err) { pushLog('ERR', `Night wakeup échoué : ${err.message}`, 'error'); }
}

// ── CRONS v2.0.3 ─────────────────────────────────────────────
let convCron = null, replyCron = null, morningCron = null, morningCronWE = null, morningCronSun = null;
let lunchBackCron = null, goodnightCron = null, nightWakeupCron = null, moodResetCron = null, driftCron = null;

function startConvCron() {
  [convCron, replyCron, morningCron, morningCronWE, morningCronSun, lunchBackCron, goodnightCron, nightWakeupCron, moodResetCron, driftCron].forEach(c => { if (c) { try { c.stop(); } catch {} } });

  convCron = cron.schedule('0 * * * *', () => {
    const cfg = botConfig.conversations; if (!cfg.enabled) return;
    const slot = getCurrentSlot(); if (slot.maxConv === 0) return;
    resetDailyCountIfNeeded().catch(() => {});
    const count = getConvDailyCount(); const max = getConvMaxPerDay(); if (count >= max) return;
    const prob = Math.min(0.85, (max - count) / Math.max(1, 24 - getParisHour()));
    if (Math.random() < prob) { pushLog('SYS', `💬 Conv [${slot.label}] (${count}/${max}, ${Math.round(prob * 100)}%)`); postRandomConversation(); }
  }, { timezone: 'Europe/Paris' });

  replyCron = cron.schedule('0 */2 * * *', () => { const cfg = botConfig.conversations; if (!cfg.enabled || !cfg.canReply) return; if (getCurrentSlot().maxConv === 0) return; if (Math.random() < 0.4) replyToConversations(); }, { timezone: 'Europe/Paris' });

  morningCron    = cron.schedule('0 9 * * 1-5', () => { if (Math.random() < 0.85) postMorningGreeting(); }, { timezone: 'Europe/Paris' });
  morningCronWE  = cron.schedule('30 9 * * 6',  () => { if (Math.random() < 0.85) postMorningGreeting(); }, { timezone: 'Europe/Paris' });
  morningCronSun = cron.schedule('0 10 * * 0',  () => { if (Math.random() < 0.85) postMorningGreeting(); }, { timezone: 'Europe/Paris' });
  lunchBackCron  = cron.schedule('0 14 * * *',  () => { if (Math.random() < 0.33) setTimeout(postLunchBack, Math.floor(Math.random() * 15 * 60 * 1000)); }, { timezone: 'Europe/Paris' });
  goodnightCron  = cron.schedule('0 23 * * *',  () => { if (Math.random() < 0.33) setTimeout(postGoodnight, Math.floor(Math.random() * 30 * 60 * 1000)); }, { timezone: 'Europe/Paris' });
  nightWakeupCron = cron.schedule('30 3 * * *', () => { if (Math.random() < 0.10) postNightWakeup(); }, { timezone: 'Europe/Paris' });
  moodResetCron  = cron.schedule('1 0 * * *',   () => { dailyMoodDate = ''; refreshDailyMood(); }, { timezone: 'Europe/Paris' });

  // Drift check toutes les 3h (uniquement pendant les heures actives)
  driftCron = cron.schedule('0 */3 * * *', () => {
    const slot = getCurrentSlot();
    if (slot.maxConv > 0) { pushLog('SYS', `🔍 Drift check déclenché [${slot.label}]`); runDriftCheck(); }
  }, { timezone: 'Europe/Paris' });

  pushLog('SYS', `✅ Crons v2.0.3 — conv + drift check toutes les 3h`, 'success');
}

// ── BACKUP AUTO ──────────────────────────────────────────────
setInterval(async () => {
  try {
    const state = await readGuildState(); const fn = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(fn, JSON.stringify(state, null, 2), 'utf8'); pushLog('SYS', `📦 Backup : ${fn}`, 'success');
    const files = fs.readdirSync('.').filter(f => f.startsWith('backup_') && f.endsWith('.json'));
    if (files.length > 10) files.sort().slice(0, files.length - 10).forEach(f => { try { fs.unlinkSync(f); } catch {} });
  } catch (err) { pushLog('ERR', `Backup échoué : ${err.message}`, 'error'); }
}, 6 * 60 * 60 * 1000);

// ── API ROUTES ───────────────────────────────────────────────
app.get('/api/state',         async (req, res) => { try { const state = await readGuildState(); res.json({ ok: true, state, stats: syncStats, uptime: Date.now() - syncStats.startTime }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.get('/api/logs',          (req, res) => res.json({ ok: true, logs: changeLog }));
app.get('/api/config',        (req, res) => res.json({ ok: true, config: botConfig }));
app.post('/api/config', (req, res) => {
  try {
    const { section, data } = req.body; if (!section || !data) return res.status(400).json({ ok: false, error: 'section + data requis' });
    if (!botConfig[section]) return res.status(400).json({ ok: false, error: `Section inconnue` });
    botConfig[section] = { ...botConfig[section], ...data }; saveConfig();
    if (section === 'anecdote') startAnecdoteCron(); if (section === 'actus') startActusCron(); if (section === 'conversations') startConvCron();
    pushLog('SYS', `Config "${section}" mise à jour`, 'success'); broadcast('configUpdate', { section, data: botConfig[section] }); res.json({ ok: true, config: botConfig[section] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.post('/api/sync/discord-to-file', async (req, res) => { await syncDiscordToFile('Forced'); res.json({ ok: true }); });
app.post('/api/sync/file-to-discord', async (req, res) => { await syncFileToDiscord(); res.json({ ok: true }); });
app.post('/api/categories', async (req, res) => { const { name } = req.body; if (!name) return res.status(400).json({ ok: false, error: 'name requis' }); try { const guild = await discord.guilds.fetch(GUILD_ID); const cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Dashboard' }); res.json({ ok: true, id: cat.id }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/api/channels', async (req, res) => { const { name, type, categoryName, topic } = req.body; try { const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const cat = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory); const chType = type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText; const opts = { name, type: chType, reason: 'Dashboard' }; if (cat) opts.parent = cat.id; if (topic) opts.topic = topic; const ch = await guild.channels.create(opts); res.json({ ok: true, id: ch.id }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.delete('/api/channels/:id', async (req, res) => { try { const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const ch = guild.channels.cache.get(req.params.id); if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' }); await ch.delete('Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.patch('/api/channels/:id', async (req, res) => { const { name, topic } = req.body; try { const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const ch = guild.channels.cache.get(req.params.id); if (!ch) return res.status(404).json({ ok: false, error: 'Salon introuvable' }); const opts = {}; if (name) opts.name = name; if (topic !== undefined) opts.topic = topic; await ch.edit(opts, 'Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/api/roles', async (req, res) => { const { name, color, hoist } = req.body; try { const guild = await discord.guilds.fetch(GUILD_ID); const role = await guild.roles.create({ name, color: parseInt((color || '#7c5cbf').replace('#', ''), 16), hoist: !!hoist, permissions: [], reason: 'Dashboard' }); res.json({ ok: true, id: role.id }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.delete('/api/roles/:id', async (req, res) => { try { const guild = await discord.guilds.fetch(GUILD_ID); await guild.roles.fetch(); const role = guild.roles.cache.get(req.params.id); if (!role) return res.status(404).json({ ok: false, error: 'Rôle introuvable' }); await role.delete('Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/api/backup', async (req, res) => { try { const state = await readGuildState(); const fn = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`; fs.writeFileSync(fn, JSON.stringify(state, null, 2), 'utf8'); pushLog('SYS', `Backup : ${fn}`, 'success'); res.json({ ok: true, filename: fn }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.get('/api/autorole',      (req, res) => res.json({ ok: true, roleName: AUTO_ROLE_NAME }));
app.post('/api/autorole', (req, res) => { const { roleName } = req.body; if (!roleName) return res.status(400).json({ ok: false, error: 'roleName requis' }); AUTO_ROLE_NAME = roleName; pushLog('SYS', `Auto-role → "${AUTO_ROLE_NAME}"`, 'success'); broadcast('config', { autoRole: AUTO_ROLE_NAME }); res.json({ ok: true, roleName: AUTO_ROLE_NAME }); });
app.post('/api/anecdote',     async (req, res) => { postDailyAnecdote(); res.json({ ok: true }); });
app.post('/api/actus',        async (req, res) => { postBiMonthlyActus(req.body?.force === true); res.json({ ok: true }); });
app.post('/api/conversation', async (req, res) => { postRandomConversation(); res.json({ ok: true }); });
app.post('/api/conversation/reply', async (req, res) => { replyToConversations(); res.json({ ok: true }); });
app.post('/api/morning',      async (req, res) => { postMorningGreeting(); res.json({ ok: true }); });
app.post('/api/goodnight',    async (req, res) => { postGoodnight(); res.json({ ok: true }); });
app.post('/api/nightwakeup',  async (req, res) => { postNightWakeup(); res.json({ ok: true }); });
app.post('/api/drift/check',  async (req, res) => { pushLog('SYS', 'Drift check manuel'); runDriftCheck(); res.json({ ok: true }); });
app.get('/api/slot',          (req, res) => { const slot = getCurrentSlot(); const d = getParisDay(); res.json({ ok: true, slot, hour: Math.round(getParisHour() * 100) / 100, day: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d], mood: dailyMood }); });
// Route debug mémoire canal v2.0.3
app.get('/api/channel-memory/:id', async (req, res) => { try { const mem = await getChannelMemory(req.params.id); res.json({ ok: true, memory: mem }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.get('/api/channel-memory', async (req, res) => { if (!mongoDb) return res.json({ ok: false, error: 'MongoDB non connecté' }); try { const all = await mongoDb.collection('channelMemory').find({}).toArray(); res.json({ ok: true, memories: all }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.get('/api/dm-history/:userId', async (req, res) => { try { const h = await getDmHistory(req.params.userId); res.json({ ok: true, history: h }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.get('/api/channel-directory', async (req, res) => { if (!mongoDb) return res.json([]); try { const docs = await mongoDb.collection('channelDirectory').find({}).toArray(); res.json(docs); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/welcome/test', async (req, res) => { const cfg = botConfig.welcome; if (!cfg.enabled) return res.json({ ok: false, error: 'Welcome désactivé' }); try { const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const channel = guild.channels.cache.get(cfg.channelId); if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' }); const phrase = cfg.messages[Math.floor(Math.random() * cfg.messages.length)]; const embed = new EmbedBuilder().setColor(0x7c5cbf).setTitle('👾 Bienvenue TestMembre ! [TEST]').setDescription(`${phrase}\n\n📋 → <#1481028175474589827>\n🎭 → <#1481028181485027471>`).setFooter({ text: 'BrainEXE • Test' }).setTimestamp(); await channel.send({ content: '👋 **[TEST]**', embeds: [embed] }); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/api/tiktok/test',  async (req, res) => { connectToTikTokLive(); res.json({ ok: true }); });
app.post('/api/post', async (req, res) => { const { channelId, content, asEmbed, embedTitle } = req.body; if (!channelId || !content) return res.status(400).json({ ok: false, error: 'channelId + content requis' }); try { const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); const channel = guild.channels.cache.get(channelId); if (!channel) return res.status(404).json({ ok: false, error: 'Salon introuvable' }); if (asEmbed) { const embed = new EmbedBuilder().setColor(0x7c5cbf).setDescription(content).setFooter({ text: 'BrainEXE' }).setTimestamp(); if (embedTitle) embed.setTitle(embedTitle); await channel.send({ embeds: [embed] }); } else await channel.send(content); pushLog('API', `Post manuel → ${channel.name}`, 'success'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.get('/api/backups', (req, res) => { try { const files = fs.readdirSync('.').filter(f => f.startsWith('backup_') && f.endsWith('.json')).sort().reverse().map(f => { const s = fs.statSync(f); return { name: f, date: s.mtime.toLocaleString('fr-FR'), size: s.size }; }); res.json({ ok: true, backups: files }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.get('/api/members/profiles', async (req, res) => { if (!mongoDb) return res.json({ ok: false, error: 'MongoDB non connecté' }); try { const profiles = await mongoDb.collection('memberProfiles').find({}).sort({ interactionCount: -1 }).limit(50).toArray(); res.json({ ok: true, profiles }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/api/members/:id/mute',  async (req, res) => { const { duration } = req.body; try { const guild = await discord.guilds.fetch(GUILD_ID); const member = await guild.members.fetch(req.params.id); if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' }); await member.timeout(duration && duration > 0 ? Math.min(duration * 60 * 1000, 28 * 24 * 60 * 60 * 1000) : null, 'Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/api/members/:id/kick',  async (req, res) => { const { reason } = req.body; try { const guild = await discord.guilds.fetch(GUILD_ID); const member = await guild.members.fetch(req.params.id); if (!member) return res.status(404).json({ ok: false, error: 'Membre introuvable' }); await member.kick(reason || 'Dashboard'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.post('/api/members/:id/ban',   async (req, res) => { const { reason, deleteMessageDays } = req.body; try { const guild = await discord.guilds.fetch(GUILD_ID); await guild.bans.create(req.params.id, { reason: reason || 'Dashboard', deleteMessageSeconds: Math.min((deleteMessageDays || 0) * 86400, 604800) }); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.patch('/api/members/:id/roles', async (req, res) => { const { addRoles, removeRoles } = req.body; try { const guild = await discord.guilds.fetch(GUILD_ID); await guild.roles.fetch(); const member = await guild.members.fetch(req.params.id); if (addRoles?.length) await member.roles.add(addRoles, 'Dashboard'); if (removeRoles?.length) await member.roles.remove(removeRoles, 'Dashboard'); res.json({ ok: true, roles: member.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name, color: '#' + r.color.toString(16).padStart(6, '0') })) }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });
app.get('/api/members',            async (req, res) => { try { const state = guildCache || await readGuildState(); res.json({ ok: true, members: state.members || [] }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); } });

wss.on('connection', async (ws) => {
  pushLog('SYS', 'Dashboard connecté');
  try { const state = await readGuildState(); ws.send(JSON.stringify({ type: 'state', data: state })); ws.send(JSON.stringify({ type: 'logs', data: changeLog })); ws.send(JSON.stringify({ type: 'stats', data: syncStats })); } catch (_) {}
});

// ── TIKTOK ───────────────────────────────────────────────────
let tiktokConnection = null, liveActive = false, liveStartTime = null;
let liveStats = { peakViewers: 0, totalLikes: 0, totalGifts: 0, giftDetails: {} };

async function generateLiveIntro(title) {
  if (!ANTHROPIC_API_KEY) return 'Le live vient de démarrer 🔥';
  return callClaude(BOT_PERSONA + '\nTu annonces un live TikTok.', `Titre : "${title}". Accroche 2 phrases max. Direct. 🔥`, 150);
}
async function sendLiveStartEmbed(title, viewerCount) {
  try {
    const cfg = botConfig.tiktokLive; const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch(); await guild.roles.fetch();
    const channel = guild.channels.cache.get(cfg.channelId); if (!channel) return;
    const hook = await generateLiveIntro(title); const now = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    const embed = new EmbedBuilder().setColor(0xff0050).setTitle('🔴  brain.exe_modded EST EN LIVE !').setDescription(`*"${hook}"*`)
      .addFields({ name: '🎮 Titre', value: title || 'Live en cours', inline: true }, { name: '👥 Viewers', value: String(viewerCount ?? 0), inline: true }, { name: '\u200b', value: '\u200b', inline: true }, { name: '✨ Soutiens', value: '👏 Tapote • 📤 Partage • ➕ Abonne-toi' }, { name: '▶ Rejoindre', value: `[Clique ici](https://www.tiktok.com/@${cfg.username}/live)` })
      .setFooter({ text: `Brainee • ${now}` }).setTimestamp();
    const pingRole = guild.roles.cache.find(r => r.name === cfg.pingRoleName);
    await channel.send({ content: pingRole ? `<@&${pingRole.id}> 🔴 **Live démarré !**` : '🔴 **Live démarré !**', embeds: [embed] });
    pushLog('SYS', `📺 Live start : "${title}"`, 'success'); broadcast('tiktokLive', { status: 'started', title, viewers: viewerCount });
  } catch (err) { pushLog('ERR', `Live start échoué : ${err.message}`, 'error'); }
}
async function sendLiveEndEmbed(title) {
  try {
    const cfg = botConfig.tiktokLive; const guild = await discord.guilds.fetch(GUILD_ID); await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId); if (!channel) return;
    const dMin = Math.floor((liveStartTime ? Date.now() - liveStartTime : 0) / 60000);
    const dStr = dMin >= 60 ? `${Math.floor(dMin/60)}h ${dMin%60}min` : `${dMin}min`;
    const topG = Object.entries(liveStats.giftDetails).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,c])=>`**${n}** ×${c}`).join(' • ') || 'Aucun gift';
    const embed = new EmbedBuilder().setColor(0x36393f).setTitle('⚫  Live terminé — brain.exe_modded')
      .addFields({ name: '⏱️ Durée', value: dStr, inline: true }, { name: '👥 Pic', value: String(liveStats.peakViewers ?? 0), inline: true }, { name: '❤️ Likes', value: String(liveStats.totalLikes ?? 0), inline: true }, { name: '🏆 Top gifts', value: topG }, { name: '💜 Merci', value: 'Merci à tous qui étaient là 🙏' })
      .setFooter({ text: 'Brainee' }).setTimestamp();
    await channel.send({ embeds: [embed] });
    pushLog('SYS', `📺 Live end — ${dStr}`, 'success'); broadcast('tiktokLive', { status: 'ended', duration: dStr });
  } catch (err) { pushLog('ERR', `Live end échoué : ${err.message}`, 'error'); }
}
function connectToTikTokLive() {
  const cfg = botConfig.tiktokLive; if (!cfg.enabled || liveActive) return;
  let WebcastPushConnection;
  try { WebcastPushConnection = require('tiktok-live-connector').WebcastPushConnection; } catch { pushLog('ERR', 'tiktok-live-connector non installé', 'error'); return; }
  const conn = new WebcastPushConnection(`@${cfg.username}`); let title = `${cfg.username} est en live`;
  conn.connect().then(s => { tiktokConnection = conn; liveActive = true; liveStartTime = Date.now(); liveStats = { peakViewers: 0, totalLikes: 0, totalGifts: 0, giftDetails: {} }; title = s.roomInfo?.title || title; pushLog('SYS', `📺 Live : "${title}"`, 'success'); sendLiveStartEmbed(title, s.roomInfo?.userCount || 0); }).catch(e => pushLog('ERR', `TikTok échoué : ${JSON.stringify(e)}`, 'error'));
  conn.on('roomUser', d => { if ((d.viewerCount||0) > liveStats.peakViewers) liveStats.peakViewers = d.viewerCount; });
  conn.on('like', d => { if (d.totalLikeCount) liveStats.totalLikes = d.totalLikeCount; });
  conn.on('gift', d => { if (d.giftType === 1 && !d.repeatEnd) return; if ((d.diamondCount||0) > 0 || d.giftName) { liveStats.totalGifts += (d.repeatCount||1); const g = d.giftName || 'Gift'; liveStats.giftDetails[g] = (liveStats.giftDetails[g]||0) + (d.repeatCount||1); } });
  const onEnd = () => { if (!liveActive) return; sendLiveEndEmbed(title); liveActive = false; liveStartTime = null; tiktokConnection = null; };
  conn.on('streamEnd', onEnd); conn.on('disconnected', onEnd); conn.on('error', e => pushLog('ERR', `TikTok erreur : ${JSON.stringify(e)}`, 'error'));
}
let tiktokCron = null;
function startTikTokLiveWatcher() {
  const cfg = botConfig.tiktokLive; if (!cfg.enabled) return;
  if (tiktokCron) { try { tiktokCron.stop(); } catch {} }
  tiktokCron = cron.schedule('*/2 * * * *', connectToTikTokLive, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ TikTok watcher → @${cfg.username}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── BOOT ─────────────────────────────────────────────────────
console.log('🔍 DISCORD_TOKEN:', !!TOKEN, '| MONGODB_URI:', !!MONGODB_URI);
if (!TOKEN) { console.error('❌ DISCORD_TOKEN manquant'); process.exit(1); }

discord.once('ready', async () => {
  refreshDailyMood();
  const slot = getCurrentSlot();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 🧠 BRAINEXE — Brainee v2.0.3 Channel Memory');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(` ✅ Bot : ${discord.user.tag}`);
  console.log(` ⏰ Slot : ${slot.label} | 🎭 Humeur : ${dailyMood}`);
  console.log(` 🌐 Dashboard : http://localhost:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  registerDiscordEvents(); startFileWatcher(); startAnecdoteCron(); startActusCron(); startConvCron(); startTikTokLiveWatcher();

  connectMongoDB().catch(e => pushLog('ERR', `MongoDB init : ${e.message}`, 'error'));

  setTimeout(async () => {
    await checkAnecdoteMissed(); await checkActusMissed();
    pushLog('SYS', '🔍 Rattrapage vérifié');
  }, 25000);

  // v2.0.6 : init descriptions officielles des salons (30s pour laisser Discord se stabiliser)
  setTimeout(() => initChannelDirectory().catch(e =>
    pushLog('ERR', `initChannelDirectory boot: ${e.message}`, 'error')
  ), 30000);

  await syncDiscordToFile('Démarrage v2.0.6');
});

server.listen(PORT, '0.0.0.0', () => console.log(`🌐 Port ${PORT}`));
discord.login(TOKEN).then(() => console.log('✅ Login OK')).catch(e => { console.error('❌ Login échoué:', e.message); process.exit(1); });
process.on('SIGINT', () => { discord.destroy(); process.exit(0); });
