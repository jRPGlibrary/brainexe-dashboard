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
let liveStats = { peakViewers: 0, totalLikes: 0, totalGifts: 0, giftDetails: {}, donors: {}, totalDiamonds: 0 };
let tiktokCron = null;
let tiktokOfflineNotified = false;
let liveMessageId = null;
let liveChannelId = null;
let liveUpdateInterval = null;

const liveStartMessages = [
  '🔥 Ça va être INCROYABLE ce live !',
  '⚡ Rejoins nous maintenant, tu vas pas le regretter !',
  '🎮 C\'est en DIRECT ! Dépêche-toi avant que ça pète !',
  '🚀 Viens pas rester dehors, c\'est qui commence !',
  '💥 C\'est CHAUD en ce moment ! Rejoins vite !',
  '🎯 Une occasion en or, ne la rate pas !',
  '⭐ Prépare-toi, ça va être FOU !',
  '🔥 Si tu veux t\'amuser, c\'est MAINTENANT !',
  '🎪 Le spectacle commence, entre dans la danse !',
  '💎 Moment exclusif en direct, rien à manquer !',
  '🌟 Sois pas seul(e), rejoins la communauté !',
  '🎉 Les vibes sont au top, viens le ressentir !',
  '⚔️ Arena ouverte, tu es prêt(e) ? !',
  '🏆 C\'est la folie en ce moment, sois au front !',
  '🎸 La stream c\'est maintenant, pas demain !'
];

const liveEndMessages = [
  'Merci d\'avoir été là, vous étiez TOPS 🙏❤️',
  'Quel moment INCROYABLE avec vous ! À bientôt 💜',
  'Merci pour cette énergie folle ! On remet ça bientôt 🔥',
  'Vous étiez malades ce soir ! Merci beaucoup 🙏',
  'C\'était DINGUE avec vous ! À très vite 💪',
  'Merci d\'avoir chauffé ce live ! C\'était fou 🔥',
  'Vous m\'avez donné trop d\'énergie ! Merci 😍',
  'Quel délire ! Merci d\'être venus 🙏💜',
  'C\'était malade ce soir ! À bientôt amis 🎉',
  'Merci pour votre soutien INCROYABLE ❤️🔥',
  'Vous avez fait ma soirée ! Merci 🙏🎮',
  'Quelle bande ! Merci pour tout 💪❤️',
  'Pas facile à quitter avec vous ! À plus 👋',
  'C\'était trop top ! On se refait ça vite 🚀',
  'Merci d\'avoir cru en moi ce soir 💜✨'
];

const giftNamesFR = {
  'Rose': '🌹 Rose',
  'Heart': '❤️ Coeur sur toi',
  'Galaxy': '🌌 Galaxie',
  'Rocket': '🚀 Fusée',
  'Trophy': '🏆 Trophée',
  'Diamond Ring': '💍 Bague',
  'Panda': '🐼 Panda',
  'Corgi': '🐕 Corgi',
  'Lion': '🦁 Lion',
  'Teddy Bear': '🧸 Ours',
  'Cake': '🍰 Gâteau',
  'Pizza': '🍕 Pizza',
  'Beer': '🍺 Bière',
  'Watermelon': '🍉 Pastèque',
  'Lollipop': '🍭 Sucette',
  'Icecream': '🍦 Glace',
  'Gift Box': '🎁 Boîte Cadeau',
  'Hand with Heart': '👐 Coeur de Main',
  'Flamingo': '🦩 Flamant Rose',
  'Monkey': '🐵 Singe',
  'Octopus': '🐙 Poulpe',
  'Bulb': '💡 Ampoule',
  'Tropical Fish': '🐠 Poisson Tropical',
  'Laptop': '💻 Laptop',
  'Microphone': '🎤 Micro',
  'Wings': '🪶 Ailes',
  'Guitar': '🎸 Guitare',
  'Lightsaber': '⚡ Sabre Laser',
  'Sword': '⚔️ Épée',
  'Magic Wand': '✨ Baguette Magique',
  'Crown': '👑 Couronne'
};

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function translateGiftName(giftName) {
  return giftNamesFR[giftName] || `🎁 ${giftName}`;
}

async function generateLiveIntro(title) {
  if (!ANTHROPIC_API_KEY) return getRandomMessage(liveStartMessages);
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

function buildLiveEmbed(title, currentViewers, roomInfo = null) {
  const cfg = shared.botConfig.tiktokLive;
  const liveUrl = `https://www.tiktok.com/@${cfg.username}/live`;
  const profileUrl = `https://www.tiktok.com/@${cfg.username}`;
  const avatar = pickTikTokAvatar(roomInfo);
  const cover = pickTikTokCover(roomInfo);
  const eurosTotal = (liveStats.totalDiamonds * 0.004).toFixed(2);

  const embed = new EmbedBuilder()
    .setColor(0xff0050)
    .setTitle(`🔴  EN DIRECT | @${cfg.username}`)
    .setURL(liveUrl)
    .setDescription(`**${title || 'Live en cours'}**\n\n[👉 Cliquez pour rejoindre](${liveUrl})`)
    .addFields(
      { name: '👥 Viewers', value: `**${currentViewers ?? 0}** 👀`, inline: true },
      { name: '❤️ Likes', value: `**${liveStats.totalLikes ?? 0}**`, inline: true },
      { name: '💎 Diamants', value: `**${liveStats.totalDiamonds ?? 0}**`, inline: true },
      { name: '💰 Euros gagnés', value: `**${eurosTotal}€**`, inline: true },
      { name: '🎁 Total gifts', value: `**${liveStats.totalGifts ?? 0}**`, inline: true },
      { name: '⏱️ Durée', value: liveStartTime ? `**${Math.floor((Date.now() - liveStartTime) / 60000)}min**` : '0min', inline: true }
    )
    .setFooter({ text: `Brainee • En direct maintenant`, iconURL: avatar || undefined })
    .setTimestamp();

  if (avatar) embed.setAuthor({ name: `@${cfg.username}`, iconURL: avatar, url: profileUrl });
  if (cover) embed.setImage(cover);
  else if (avatar) embed.setThumbnail(avatar);

  return embed;
}

async function updateLiveEmbed() {
  if (!liveActive || !liveMessageId || !liveChannelId) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    const channel = guild.channels.cache.get(liveChannelId);
    if (!channel) return;
    const msg = await channel.messages.fetch(liveMessageId);
    const embed = buildLiveEmbed('', liveStats.peakViewers);
    await msg.edit({ embeds: [embed] });
  } catch (err) {
    pushLog('ERR', `Mise à jour embed live échouée : ${err.message}`, 'error');
  }
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
    const liveUrl = `https://www.tiktok.com/@${cfg.username}/live`;
    const avatar = pickTikTokAvatar(roomInfo);

    const embed = buildLiveEmbed(title, viewerCount, roomInfo);
    const motivMsg = getRandomMessage(liveStartMessages);
    embed.setDescription(`*"${hook}"*\n\n✨ **${motivMsg}**\n\n▶ **[Rejoindre le live](${liveUrl})**`);

    const pingRole = guild.roles.cache.find(r => r.name === cfg.pingRoleName);
    const msg = await channel.send({
      content: pingRole
        ? `<@&${pingRole.id}> 🔴 **LIVE !** — ${title ? `_${title}_` : 'ça commence'} 🚀`
        : `🔴 **LIVE !** — ${title ? `_${title}_` : 'ça commence'} 🚀`,
      embeds: [embed],
    });

    liveMessageId = msg.id;
    liveChannelId = cfg.channelId;

    if (liveUpdateInterval) clearInterval(liveUpdateInterval);
    liveUpdateInterval = setInterval(updateLiveEmbed, 15000);

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
    const eurosTotal = (liveStats.totalDiamonds * 0.004).toFixed(2);

    const topDonors = Object.entries(liveStats.donors)
      .map(([username, data]) => ({ username, ...data }))
      .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
      .slice(0, 3);

    const topDonorsText = topDonors.length > 0
      ? topDonors
        .map((d, i) => {
          const euros = (d.totalDiamonds * 0.004).toFixed(2);
          const medal = ['🥇', '🥈', '🥉'][i];
          return `${medal} **${d.nickname || d.username}** — ${d.totalDiamonds} 💎 (${euros}€)`;
        })
        .join('\n')
      : '_Aucun don cette fois_';

    const profileUrl = `https://www.tiktok.com/@${cfg.username}`;
    const endTime = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

    const thankMsg = getRandomMessage(liveEndMessages);
    const embed = new EmbedBuilder()
      .setColor(0x36393f)
      .setTitle(`⚫  Live terminé — @${cfg.username}`)
      .setURL(profileUrl)
      .setDescription(`${title ? `_${title}_\n\n` : ''}💜 **${thankMsg}**`)
      .addFields(
        { name: '⏱️ Durée', value: `\`${dStr}\``, inline: true },
        { name: '👥 Pic viewers', value: `\`${liveStats.peakViewers ?? 0}\``, inline: true },
        { name: '❤️ Likes', value: `\`${liveStats.totalLikes ?? 0}\``, inline: true },
        { name: '💎 Total diamants', value: `\`${liveStats.totalDiamonds ?? 0}\``, inline: true },
        { name: '💰 Total gagné', value: `**${eurosTotal}€**`, inline: true },
        { name: '🎁 Total gifts', value: `\`${liveStats.totalGifts ?? 0}\``, inline: true },
        { name: '🏆 Top 3 donateurs', value: topDonorsText, inline: false },
        { name: '🔔 Prochain live', value: `Active le rôle **${cfg.pingRoleName}** pour être notifié.`, inline: false }
      )
      .setFooter({ text: `Brainee • Live terminé à ${endTime}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    pushLog('SYS', `📺 Live end — ${dStr} | ${eurosTotal}€ gagnés`, 'success');
    broadcast('tiktokLive', { status: 'ended', duration: dStr, euros: eurosTotal });
  } catch (err) { pushLog('ERR', `Live end échoué : ${err.message}`, 'error'); }
}

function resetLiveState() {
  liveActive = false;
  shared.tiktokLiveActive = false;
  liveStartTime = null;
  liveMessageId = null;
  liveChannelId = null;
  tiktokConnection = null;
  if (liveUpdateInterval) {
    clearInterval(liveUpdateInterval);
    liveUpdateInterval = null;
  }
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
      liveStats = { peakViewers: 0, totalLikes: 0, totalGifts: 0, giftDetails: {}, donors: {}, totalDiamonds: 0 };
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
          const giftFR = translateGiftName(d.giftName || 'Gift');
          liveStats.giftDetails[giftFR] = (liveStats.giftDetails[giftFR] || 0) + (d.repeatCount || 1);

          const username = d.user?.uniqueId || d.uniqueId || 'Anonyme';
          const nickname = d.user?.nickname || d.nickname || username;
          const diamondValue = (d.diamondCount || 0) * (d.repeatCount || 1);

          liveStats.totalDiamonds += diamondValue;

          if (!liveStats.donors[username]) {
            liveStats.donors[username] = {
              nickname,
              totalDiamonds: 0,
              count: 0
            };
          }
          liveStats.donors[username].totalDiamonds += diamondValue;
          liveStats.donors[username].count += 1;
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
