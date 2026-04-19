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

async function generateLiveIntro(title) {
  if (!ANTHROPIC_API_KEY) return 'Le live vient de démarrer 🔥';
  return callClaude(
    '\nTu annonces un live TikTok.',
    `Titre : "${title}". Accroche 2 phrases max. Direct. 🔥`,
    150,
    BOT_PERSONA
  );
}

async function sendLiveStartEmbed(title, viewerCount) {
  try {
    const cfg = shared.botConfig.tiktokLive;
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return;
    const hook = await generateLiveIntro(title);
    const now = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    const embed = new EmbedBuilder()
      .setColor(0xff0050)
      .setTitle('🔴  brain.exe_modded EST EN LIVE !')
      .setDescription(`*"${hook}"*`)
      .addFields(
        { name: '🎮 Titre', value: title || 'Live en cours', inline: true },
        { name: '👥 Viewers', value: String(viewerCount ?? 0), inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '✨ Soutiens', value: '👏 Tapote • 📤 Partage • ➕ Abonne-toi' },
        { name: '▶ Rejoindre', value: `[Clique ici](https://www.tiktok.com/@${cfg.username}/live)` }
      )
      .setFooter({ text: `Brainee • ${now}` })
      .setTimestamp();
    const pingRole = guild.roles.cache.find(r => r.name === cfg.pingRoleName);
    await channel.send({ content: pingRole ? `<@&${pingRole.id}> 🔴 **Live démarré !**` : '🔴 **Live démarré !**', embeds: [embed] });
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
    const topG = Object.entries(liveStats.giftDetails).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `**${n}** ×${c}`).join(' • ') || 'Aucun gift';
    const embed = new EmbedBuilder()
      .setColor(0x36393f)
      .setTitle('⚫  Live terminé — brain.exe_modded')
      .addFields(
        { name: '⏱️ Durée', value: dStr, inline: true },
        { name: '👥 Pic', value: String(liveStats.peakViewers ?? 0), inline: true },
        { name: '❤️ Likes', value: String(liveStats.totalLikes ?? 0), inline: true },
        { name: '🏆 Top gifts', value: topG },
        { name: '💜 Merci', value: 'Merci à tous qui étaient là 🙏' }
      )
      .setFooter({ text: 'Brainee' })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    pushLog('SYS', `📺 Live end — ${dStr}`, 'success');
    broadcast('tiktokLive', { status: 'ended', duration: dStr });
  } catch (err) { pushLog('ERR', `Live end échoué : ${err.message}`, 'error'); }
}

function connectToTikTokLive() {
  const cfg = shared.botConfig.tiktokLive;
  if (!cfg.enabled || liveActive) return;
  let WebcastPushConnection;
  try { WebcastPushConnection = require('tiktok-live-connector').WebcastPushConnection; }
  catch { pushLog('ERR', 'tiktok-live-connector non installé', 'error'); return; }
  const conn = new WebcastPushConnection(`@${cfg.username}`);
  let title = `${cfg.username} est en live`;
  conn.connect()
    .then(s => {
      tiktokConnection = conn;
      liveActive = true;
      shared.tiktokLiveActive = true;
      liveStartTime = Date.now();
      liveStats = { peakViewers: 0, totalLikes: 0, totalGifts: 0, giftDetails: {} };
      title = s.roomInfo?.title || title;
      pushLog('SYS', `📺 Live : "${title}"`, 'success');
      sendLiveStartEmbed(title, s.roomInfo?.userCount || 0);
    })
    .catch(e => pushLog('ERR', `TikTok échoué : ${JSON.stringify(e)}`, 'error'));
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
    liveActive = false;
    shared.tiktokLiveActive = false;
    liveStartTime = null;
    tiktokConnection = null;
  };
  conn.on('streamEnd', onEnd);
  conn.on('disconnected', onEnd);
  conn.on('error', e => pushLog('ERR', `TikTok erreur : ${JSON.stringify(e)}`, 'error'));
}

function startTikTokLiveWatcher() {
  const cfg = shared.botConfig.tiktokLive;
  if (!cfg.enabled) return;
  if (tiktokCron) { try { tiktokCron.stop(); } catch {} }
  tiktokCron = cron.schedule('*/2 * * * *', connectToTikTokLive, { timezone: 'Europe/Paris' });
  pushLog('SYS', `✅ TikTok watcher → @${cfg.username}`);
}

module.exports = { connectToTikTokLive, startTikTokLiveWatcher, generateLiveIntro, sendLiveStartEmbed, sendLiveEndEmbed };
