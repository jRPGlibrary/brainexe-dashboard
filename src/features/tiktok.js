const shared = require('../shared');
const { pushLog, broadcast } = require('../logger');
const { GUILD_ID, ANTHROPIC_API_KEY } = require('../config');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');

let tiktokConnection = null;
let liveActive = false;
let liveStartTime = null;
let liveStats = { peakViewers: 0, totalLikes: 0, totalGifts: 0, giftDetails: {} };
let tiktokCron = null;
let tiktokOfflineNotified = false;

async function generateLiveIntro(title) {
  if (!ANTHROPIC_API_KEY) return 'Le live vient de démarrer 🔥';
  const { text } = await callClaude(
    '\nTu annonces un live TikTok.',
    `Titre : "${title}". Accroche 2 phrases max. Direct. 🔥`,
    150,
    BOT_PERSONA
  );
  return text;
}

function pickTikTokCover(roomInfo) {
  try {
    const cover = roomInfo?.cover?.url_list || roomInfo?.cover?.urlList;
    if (Array.isArray(cover) && cover.length) return cover[cover.length - 1];
    const screenshot = roomInfo?.dynamic_cover?.url_list || roomInfo?.dynamic_cover?.urlList;
    if (Array.isArray(screenshot) && screenshot.length) return screenshot[0];
  } catch (_) {}
  return null;
}

function pickTikTokAvatar(roomInfo) {
  try {
    const owner = roomInfo?.owner || roomInfo?.ownerInfo;
    const avatar = owner?.avatar_larger?.url_list
      || owner?.avatarLarger?.urlList
      || owner?.avatar_medium?.url_list
      || owner?.avatarMedium?.urlList
      || owner?.avatar_thumb?.url_list
      || owner?.avatarThumb?.urlList;
    if (Array.isArray(avatar) && avatar.length) return avatar[avatar.length - 1];
  } catch (_) {}
  return null;
}

async function sendLiveStartEmbed(title, viewerCount, roomInfo = null) {
  try {
    const cfg = shared.botConfig.tiktokLive;
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return;
    const hook = await generateLiveIntro(title);
    const now = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    const liveUrl = `https://www.tiktok.com/@${cfg.username}/live`;
    const profileUrl = `https://www.tiktok.com/@${cfg.username}`;
    const cover = pickTikTokCover(roomInfo);
    const avatar = pickTikTokAvatar(roomInfo);

    const embed = new EmbedBuilder()
      .setColor(0xff0050)
      .setTitle(`🔴  @${cfg.username} EST EN LIVE !`)
      .setURL(liveUrl)
      .setDescription(`*"${hook}"*\n\n▶ **[Rejoindre le live](${liveUrl})**`)
      .addFields(
        { name: '🎮 Titre', value: title || 'Live en cours', inline: false },
        { name: '👥 Viewers', value: `\`${viewerCount ?? 0}\``, inline: true },
        { name: '🔗 Chaîne', value: `[@${cfg.username}](${profileUrl})`, inline: true },
        { name: '✨ Soutiens', value: '👏 Tapote • 📤 Partage • ➕ Abonne-toi', inline: false }
      )
      .setFooter({ text: `Brainee • Live démarré à ${now}`, iconURL: avatar || undefined })
      .setTimestamp();

    if (avatar) embed.setAuthor({ name: `@${cfg.username}`, iconURL: avatar, url: profileUrl });
    if (cover) embed.setImage(cover);
    else if (avatar) embed.setThumbnail(avatar);

    const pingRole = guild.roles.cache.find(r => r.name === cfg.pingRoleName);
    await channel.send({
      content: pingRole
        ? `<@&${pingRole.id}> 🔴 **LIVE !** — ${title ? `_${title}_` : 'ça commence'} 🚀`
        : `🔴 **LIVE !** — ${title ? `_${title}_` : 'ça commence'} 🚀`,
      embeds: [embed],
    });
    pushLog('SYS', `📺 Live start : "${title}"`, 'success');
    broadcast('tiktokLive', { status: 'started', title, viewers: viewerCount });
  } catch (err) { pushLog('ERR', `Live start échoué : ${err.message}`, 'error'); }
}

async function sendLiveEndEmbed(title) {
  try {
    const cfg = shared.botConfig.tiktokLive;
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return;
    const dMin = Math.floor((liveStartTime ? Date.now() - liveStartTime : 0) / 60000);
    const dStr = dMin >= 60 ? `${Math.floor(dMin / 60)}h ${dMin % 60}min` : `${dMin}min`;
    const topG = Object.entries(liveStats.giftDetails)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([n, c]) => `🎁 **${n}** ×${c}`)
      .join('\n') || '_Aucun gift cette fois_';
    const profileUrl = `https://www.tiktok.com/@${cfg.username}`;
    const endTime = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

    const embed = new EmbedBuilder()
      .setColor(0x36393f)
      .setTitle(`⚫  Live terminé — @${cfg.username}`)
      .setURL(profileUrl)
      .setDescription(title ? `_${title}_` : '_Merci d\'être passés 💜_')
      .addFields(
        { name: '⏱️ Durée', value: `\`${dStr}\``, inline: true },
        { name: '👥 Pic viewers', value: `\`${liveStats.peakViewers ?? 0}\``, inline: true },
        { name: '❤️ Likes', value: `\`${liveStats.totalLikes ?? 0}\``, inline: true },
        { name: '🏆 Top gifts', value: topG, inline: false },
        { name: '🔔 Prochain live', value: `Active le rôle **${cfg.pingRoleName}** pour être notifié.`, inline: false }
      )
      .setFooter({ text: `Brainee • Live terminé à ${endTime}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    pushLog('SYS', `📺 Live end — ${dStr}`, 'success');
    broadcast('tiktokLive', { status: 'ended', duration: dStr });
  } catch (err) { pushLog('ERR', `Live end échoué : ${err.message}`, 'error'); }
}

function resetLiveState() {
  liveActive = false;
  shared.tiktokLiveActive = false;
  liveStartTime = null;
  tiktokConnection = null;
}

function connectToTikTokLive() {
  const cfg = shared.botConfig.tiktokLive;
  if (!cfg.enabled) return;

  // Garde-fou : si le live est marqué actif depuis plus de 12h, l'état est probablement coincé
  if (liveActive && liveStartTime && Date.now() - liveStartTime > 12 * 60 * 60 * 1000) {
    pushLog('ERR', '📺 TikTok : live actif depuis +12h — réinitialisation forcée', 'error');
    resetLiveState();
  }

  if (liveActive) return;

  let WebcastPushConnection;
  try { WebcastPushConnection = require('tiktok-live-connector').WebcastPushConnection; }
  catch { pushLog('ERR', 'tiktok-live-connector non installé', 'error'); return; }

  const conn = new WebcastPushConnection(`@${cfg.username}`);
  let title = `${cfg.username} est en live`;

  // Timeout de 15s : si TikTok ne répond pas, on abandonne proprement
  const connectWithTimeout = Promise.race([
    conn.connect(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout connexion TikTok (15s)')), 15_000)
    ),
  ]);

  connectWithTimeout
    .then(s => {
      tiktokConnection = conn;
      liveActive = true;
      shared.tiktokLiveActive = true;
      liveStartTime = Date.now();
      liveStats = { peakViewers: 0, totalLikes: 0, totalGifts: 0, giftDetails: {} };
      title = s.roomInfo?.title || title;
      tiktokOfflineNotified = false;
      pushLog('SYS', `📺 Live : "${title}"`, 'success');
      sendLiveStartEmbed(title, s.roomInfo?.userCount || 0, s.roomInfo);

      // Écouteurs attachés uniquement après connexion réussie
      conn.on('roomUser', d => { if ((d.viewerCount || 0) > liveStats.peakViewers) liveStats.peakViewers = d.viewerCount; });
      conn.on('like', d => { if (d.totalLikeCount) liveStats.totalLikes = d.totalLikeCount; });
      conn.on('gift', d => {
        if (d.giftType === 1 && !d.repeatEnd) return;
        if ((d.diamondCount || 0) > 0 || d.giftName) {
          liveStats.totalGifts += (d.repeatCount || 1);
          const g = d.giftName || 'Gift';
          liveStats.giftDetails[g] = (liveStats.giftDetails[g] || 0) + (d.repeatCount || 1);
        }
      });

      const onEnd = () => {
        if (!liveActive) return;
        sendLiveEndEmbed(title);
        resetLiveState();
      };
      conn.on('streamEnd', onEnd);
      conn.on('disconnected', onEnd);
    })
    .catch(err => {
      // Nettoyage : supprimer tous les écouteurs de la connexion ratée pour éviter les fuites mémoire
      try { conn.removeAllListeners(); } catch (_) {}
      try { conn.disconnect?.(); } catch (_) {}
      if (!tiktokOfflineNotified) {
        tiktokOfflineNotified = true;
        pushLog('SYS', `📺 TikTok hors ligne (${err.message}) — watcher actif en arrière-plan`, 'info');
      }
    });
}

function startTikTokLiveWatcher() {
  const cfg = shared.botConfig.tiktokLive;
  if (!cfg.enabled) return;
  if (tiktokCron) { try { tiktokCron.stop(); } catch {} }
  tiktokCron = cron.schedule('*/2 * * * *', connectToTikTokLive, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ TikTok watcher → @${cfg.username}`);
}

module.exports = { connectToTikTokLive, startTikTokLiveWatcher, generateLiveIntro, sendLiveStartEmbed, sendLiveEndEmbed };
