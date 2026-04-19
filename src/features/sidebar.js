const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const { getCurrentSlot } = require('../bot/scheduling');
const { getDailyMood } = require('../bot/mood');
const { getInternalState } = require('../bot/emotions');
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');

let sidebarMessageId = null;
let sidebarChannelId = null;
let sidebarCron = null;

function getEnergyLabel(energy) {
  if (energy >= 70) return 'Bouillant 🔥';
  if (energy >= 50) return 'Énergique ⚡';
  if (energy >= 30) return 'Tranquille 🌙';
  return 'Fatigué 💤';
}

function getMembersCount(guild) {
  return guild.memberCount || 0;
}

async function buildSidebarEmbed(guild) {
  const slot = getCurrentSlot();
  const mood = getDailyMood();
  const internalState = getInternalState();
  const energy = internalState.energy || 50;
  const memberCount = getMembersCount(guild);

  const isTikTokLive = shared.tiktokLiveActive === true;

  const embed = new EmbedBuilder()
    .setColor(0x7c5cbf)
    .setTitle('📊 SYSTÈME BRAINEXE')
    .setDescription('État du système en temps réel')
    .addFields(
      {
        name: '👥 Membres',
        value: `${memberCount} (total cumulé)`,
        inline: true,
      },
      {
        name: '🧠 État',
        value: `${slot.label}`,
        inline: true,
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: true,
      },
      {
        name: '⚡ Humeur',
        value: `${mood.charAt(0).toUpperCase() + mood.slice(1)}`,
        inline: true,
      },
      {
        name: '🔥 Activité',
        value: getEnergyLabel(energy),
        inline: true,
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: true,
      },
      {
        name: '📱 TikTok',
        value: isTikTokLive ? 'LIVE 🔴' : 'Offline ⚫',
        inline: true,
      }
    )
    .setFooter({
      text: `Mis à jour à ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}`,
    })
    .setTimestamp();

  return embed;
}

async function updateSidebarMessage() {
  try {
    if (!shared.discord || !shared.discord.isReady()) return;

    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    if (!guild) return;

    let channel = null;
    if (sidebarChannelId) {
      channel = await guild.channels.fetch(sidebarChannelId).catch(() => null);
    }

    // Cherche un channel existant (créé récemment ou avec un nom spécifique)
    if (!channel) {
      const existingChannels = await guild.channels.fetch();
      channel = existingChannels.find(
        (c) => c.name === 'système-brainexe' || c.name === '🤖-système' || c.name === 'infos-système'
      );

      // Si pas de channel trouvé, créé un
      if (!channel) {
        channel = await guild.channels.create({
          name: '🤖-système',
          type: 4, // GUILD_CATEGORY
          reason: 'Sidebar BRAINEXE',
        });
        pushLog('SYS', `📌 Channel sidebar créé: ${channel.name}`, 'success');
      }
      sidebarChannelId = channel.id;
    }

    // Si c'est une catégorie, cherche un salon texte dedans, sinon crée un
    if (channel.isCategory?.()) {
      const textChannelInCategory = (await guild.channels.fetch()).find(
        (c) => c.parentId === channel.id && c.isTextBased?.()
      );
      if (textChannelInCategory) {
        channel = textChannelInCategory;
      } else {
        channel = await guild.channels.create({
          name: 'infos',
          type: 0, // GUILD_TEXT
          parent: channel.id,
          reason: 'Sidebar BRAINEXE',
        });
      }
    }

    const embed = await buildSidebarEmbed(guild);

    // Update ou crée le message
    if (sidebarMessageId) {
      const message = await channel.messages.fetch(sidebarMessageId).catch(() => null);
      if (message) {
        await message.edit({ embeds: [embed] });
        return;
      }
    }

    // Crée un nouveau message
    const msg = await channel.send({ embeds: [embed] });
    sidebarMessageId = msg.id;
    pushLog('SYS', '📊 Sidebar mise à jour', 'success');
  } catch (err) {
    pushLog('ERR', `updateSidebarMessage: ${err.message}`, 'error');
  }
}

function startSidebarCron() {
  if (sidebarCron) {
    try {
      sidebarCron.stop();
    } catch {}
  }

  // Update toutes les 30 secondes
  sidebarCron = cron.schedule('*/30 * * * * *', () => {
    updateSidebarMessage().catch((err) => {
      pushLog('ERR', `Sidebar cron: ${err.message}`, 'error');
    });
  });

  pushLog('SYS', '⏱️ Cron sidebar démarré (30s)', 'success');
}

module.exports = {
  buildSidebarEmbed,
  updateSidebarMessage,
  startSidebarCron,
};
