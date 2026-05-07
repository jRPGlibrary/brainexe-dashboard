const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const { getCurrentSlot } = require('../bot/scheduling');
const { getDailyMood } = require('../bot/mood');
const { getInternalState } = require('../bot/emotions');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const cron = require('node-cron');
const { getFundingData, calculateTotalCosts } = require('../project/funding');

const CATEGORY_NAME = '📊 SYSTÈME BRAINEXE';
const SIDEBAR_KEYS = ['members', 'status', 'mood', 'activity', 'tiktok', 'funding'];

let sidebarCategoryId = null;
let sidebarChannelIds = {};
let sidebarCron = null;

// Mutex : empêche deux updateSidebarChannels de tourner en même temps
// (race condition qui créait des salons en doublon)
let _sidebarRunning = false;

const SIDEBAR_PREFIX = {
  members:  '👥',
  status:   '🧠',
  mood:     '⚡',
  activity: '🔥',
  tiktok:   '📱',
  funding:  '💰',
};

function getEnergyLabel(energy) {
  if (energy >= 70) return 'Bouillant';
  if (energy >= 50) return 'Énergique';
  if (energy >= 30) return 'Tranquille';
  return 'Fatigué';
}

function getMoodLabel(mood) {
  const map = { energique: 'Énergique', chill: 'Chill', hyperfocus: 'Hyperfocus', zombie: 'Zombie' };
  return map[mood] || mood;
}

async function getSidebarLines(guild) {
  const slot = getCurrentSlot();
  const mood = getDailyMood();
  const state = getInternalState();

  let fundingLine = '💰┃Soutien : —';
  try {
    const data = await getFundingData();
    const totalCosts = calculateTotalCosts(data);
    const donated = data.totalDonated || 0;
    fundingLine = `💰┃Soutien : ${donated.toFixed(1)}€/${totalCosts.toFixed(1)}€`;
  } catch (e) {
    pushLog('ERR', `Sidebar funding line: ${e.message}`, 'error');
  }

  return {
    members:  `👥┃Membres : ${guild.memberCount || 0}`,
    status:   `🧠┃État : ${slot.label}`,
    mood:     `⚡┃Humeur : ${getMoodLabel(mood)}`,
    activity: `🔥┃Activité : ${getEnergyLabel(state.energy || 50)}`,
    tiktok:   `📱┃TikTok : ${shared.tiktokLiveActive ? 'LIVE 🔴' : 'Offline'}`,
    funding:  fundingLine,
  };
}

async function ensureSidebarCategory(guild) {
  const channels = await guild.channels.fetch();

  if (sidebarCategoryId) {
    const cat = channels.get(sidebarCategoryId);
    if (cat) return cat;
  }

  const existing = channels.find(
    c => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAME
  );
  if (existing) {
    sidebarCategoryId = existing.id;
    return existing;
  }

  const cat = await guild.channels.create({
    name: CATEGORY_NAME,
    type: ChannelType.GuildCategory,
    position: 0,
    reason: 'Sidebar BRAINEXE',
  });
  sidebarCategoryId = cat.id;
  pushLog('SYS', `📊 Catégorie sidebar créée`, 'success');
  return cat;
}

async function ensureSidebarVoiceChannels(guild, category) {
  const channels = await guild.channels.fetch();

  const existingVoice = channels
    .filter(c => c.parentId === category.id && c.type === ChannelType.GuildVoice)
    .toJSON();

  // 1. Associer chaque canal à sa clé — d'abord par ID stocké, puis par préfixe emoji
  // On garde une trace des IDs déjà assignés pour éviter les doubles attributions
  const assignedIds = new Set();

  for (const key of SIDEBAR_KEYS) {
    const storedId = sidebarChannelIds[key];
    if (storedId && existingVoice.find(c => c.id === storedId)) {
      assignedIds.add(storedId);
      continue;
    }
    // Chercher par préfixe parmi les canaux pas encore assignés
    const prefix = SIDEBAR_PREFIX[key];
    const match = existingVoice.find(c => !assignedIds.has(c.id) && c.name.startsWith(prefix));
    if (match) {
      sidebarChannelIds[key] = match.id;
      assignedIds.add(match.id);
    } else {
      sidebarChannelIds[key] = null;
    }
  }

  // 2. Supprimer TOUS les canaux non assignés à une clé (doublons + orphelins)
  for (const ch of existingVoice) {
    if (!assignedIds.has(ch.id)) {
      await ch.delete('Sidebar BRAINEXE — doublon/orphelin').catch(() => {});
      pushLog('SYS', `📊 Sidebar : supprimé doublon/orphelin (${ch.name})`);
    }
  }

  // 3. Créer uniquement les canaux vraiment manquants
  const lines = await getSidebarLines(guild);
  for (const key of SIDEBAR_KEYS) {
    if (sidebarChannelIds[key]) continue;
    const ch = await guild.channels.create({
      name: lines[key],
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel],
        },
      ],
      reason: 'Sidebar BRAINEXE',
    });
    sidebarChannelIds[key] = ch.id;
    pushLog('SYS', `📊 Sidebar : canal créé (${key})`, 'success');
  }
}

async function updateSidebarChannels() {
  // Mutex : si une exécution est déjà en cours, on ignore l'appel
  if (_sidebarRunning) {
    pushLog('SYS', '📊 Sidebar : update ignorée (déjà en cours)');
    return;
  }
  _sidebarRunning = true;

  try {
    if (!shared.discord || !shared.discord.isReady()) return;

    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    if (!guild) return;

    const category = await ensureSidebarCategory(guild);
    await ensureSidebarVoiceChannels(guild, category);

    const lines = await getSidebarLines(guild);

    for (const key of SIDEBAR_KEYS) {
      const id = sidebarChannelIds[key];
      if (!id) continue;
      const ch = await guild.channels.fetch(id).catch(() => null);
      if (!ch) {
        // Canal disparu entre-temps — on le recrée au prochain tick
        sidebarChannelIds[key] = null;
        continue;
      }
      if (ch.name !== lines[key]) {
        await ch.setName(lines[key]).catch(err => pushLog('ERR', `Sidebar setName #${key}: ${err.message}`, 'error'));
      }
    }
  } catch (err) {
    pushLog('ERR', `updateSidebarChannels: ${err.message}`, 'error');
  } finally {
    _sidebarRunning = false;
  }
}

function startSidebarCron() {
  if (sidebarCron) { try { sidebarCron.stop(); } catch {} }

  // 10 minutes — Discord rate limit: 2 renames max par 10min par canal
  sidebarCron = cron.schedule('*/10 * * * *', () => {
    updateSidebarChannels().catch(err =>
      pushLog('ERR', `Sidebar cron: ${err.message}`, 'error')
    );
  });

  updateSidebarChannels().catch(err => pushLog('ERR', `Sidebar init: ${err.message}`, 'error'));

  pushLog('SYS', '⏱️ Cron sidebar démarré (10min)', 'success');
}

module.exports = { updateSidebarChannels, startSidebarCron };
