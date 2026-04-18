const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const { EmbedBuilder } = require('discord.js');

async function sendWelcomeMessage(member) {
  const cfg = shared.botConfig.welcome;
  if (!cfg.enabled || !cfg.messages?.length) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(cfg.channelId);
    if (!channel) return;
    const phrase = cfg.messages[Math.floor(Math.random() * cfg.messages.length)];
    const embed = new EmbedBuilder()
      .setColor(0x7c5cbf)
      .setTitle(`👾 Bienvenue ${member.user.username} !`)
      .setDescription(`${phrase}\n\n📋 Lis les règles → <#1481028175474589827>\n🎭 Choisis tes rôles → <#1481028181485027471>\n💬 Présente-toi ici !`)
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setFooter({ text: 'BrainEXE • Neurodivergent Creator Hub' })
      .setTimestamp();
    await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
    pushLog('SYS', `👋 Welcome → ${member.user.tag}`, 'success');
  } catch (err) { pushLog('ERR', `Welcome échoué : ${err.message}`, 'error'); }
}

module.exports = { sendWelcomeMessage };
