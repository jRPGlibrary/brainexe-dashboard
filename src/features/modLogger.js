/**
 * ================================================
 * 📋 MOD LOGGER v1.0.0
 * ================================================
 * Centralise les logs de modération dans les salons dédiés.
 * Trouve les canaux par nom (pas d'ID hardcodé → Railway-safe).
 *
 * Canaux cibles :
 *   #mod-logs       → actions spam (timeout, kick)
 *   #member-logs    → arrivées, départs, bans, kicks manuels
 *   #briefing-brainee → rapport hebdo owner
 * ================================================
 */

const { EmbedBuilder, ChannelType } = require('discord.js');
const { GUILD_ID } = require('../config');
const { pushLog } = require('../logger');
const shared = require('../shared');

// Cache channel references pour 5 minutes
const channelCache = new Map(); // name → { channel, cachedAt }
const CACHE_TTL = 5 * 60 * 1000;

// Noms exacts des canaux (convention emoji・nom du serveur BrainEXE)
const MOD_CHANNELS = {
  logs:     '⚠️・mod-logs',
  members:  '📋・member-logs',
  briefing: '💡・briefing-brainee',
};

async function getModChannel(name) {
  const cached = channelCache.get(name);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.channel;

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.find(
      c => c.name === name && c.type === ChannelType.GuildText
    ) || null;
    channelCache.set(name, { channel, cachedAt: Date.now() });
    return channel;
  } catch (_) {
    return null;
  }
}

// ─── SPAM / MODÉRATION ───────────────────────────────────────────

async function logSpamAction({ userId, username, spamType, action, timeoutMin, offenseCount }) {
  const channel = await getModChannel(MOD_CHANNELS.logs);
  if (!channel) return;

  const isKick = action === 'kick';
  const color  = isKick ? 0xe74c3c : 0xf39c12;
  const icon   = isKick ? '👢' : '⏱️';
  const label  = isKick ? 'Kick automatique' : `Timeout ${timeoutMin} min`;

  const typeLabels = {
    flood:        'Flood (messages en rafale)',
    duplicate:    'Messages identiques en boucle',
    mention_spam: 'Mention spam (trop d\'utilisateurs)',
    link_spam:    'Spam de liens',
  };

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${icon} ${label}`)
    .addFields(
      { name: 'Membre',   value: `<@${userId}> (${username})`, inline: true },
      { name: 'Raison',   value: typeLabels[spamType] || spamType, inline: true },
      { name: 'Offense',  value: `#${offenseCount}`, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Brainee — Modération automatique' });

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ─── MEMBRE : ARRIVÉE ────────────────────────────────────────────

async function logMemberJoin(member) {
  const channel = await getModChannel(MOD_CHANNELS.members);
  if (!channel) return;

  const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
  const isNew = accountAge < 7;

  const embed = new EmbedBuilder()
    .setColor(0x43b581)
    .setTitle('📥 Nouveau membre')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'Membre',       value: `<@${member.id}> (${member.user.tag})`, inline: true },
      { name: 'Compte créé',  value: `il y a ${accountAge} jour${accountAge > 1 ? 's' : ''}`, inline: true },
      ...(isNew ? [{ name: '⚠️ Compte récent', value: 'Moins de 7 jours', inline: true }] : []),
    )
    .setTimestamp()
    .setFooter({ text: `ID : ${member.id}` });

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ─── MEMBRE : DÉPART ─────────────────────────────────────────────

async function logMemberLeave(member) {
  const channel = await getModChannel(MOD_CHANNELS.members);
  if (!channel) return;

  const joinedAt = member.joinedAt
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
    : 'inconnu';

  const embed = new EmbedBuilder()
    .setColor(0x99aab5)
    .setTitle('📤 Départ membre')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'Membre',     value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
      { name: 'Avait rejoint', value: joinedAt, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `ID : ${member.id}` });

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ─── MEMBRE : BAN ────────────────────────────────────────────────

async function logMemberBan(guild, user, reason) {
  const channel = await getModChannel(MOD_CHANNELS.members);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🔨 Membre banni')
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Membre', value: `${user.tag} (\`${user.id}\`)`, inline: true },
      { name: 'Raison', value: reason || 'Aucune raison fournie', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `ID : ${user.id}` });

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ─── MEMBRE : KICK ───────────────────────────────────────────────

async function logMemberKick(member, reason) {
  const channel = await getModChannel(MOD_CHANNELS.members);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('👢 Membre exclu')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'Membre', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
      { name: 'Raison', value: reason || 'Aucune raison fournie', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `ID : ${member.id}` });

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ─── BRIEFING OWNER ──────────────────────────────────────────────

async function postBriefingToChannel(content) {
  const channel = await getModChannel(MOD_CHANNELS.briefing);
  if (!channel) return false;

  const embed = new EmbedBuilder()
    .setColor(0x7c5cbf)
    .setTitle('💡 Briefing hebdo — Brainee')
    .setDescription(content)
    .setTimestamp()
    .setFooter({ text: 'Rapport automatique — BrainEXE' });

  await channel.send({ embeds: [embed] }).catch(err => {
    pushLog('ERR', `Briefing channel échoué : ${err.message}`, 'error');
  });
  return true;
}

module.exports = {
  getModChannel,
  logSpamAction,
  logMemberJoin,
  logMemberLeave,
  logMemberBan,
  logMemberKick,
  postBriefingToChannel,
};
