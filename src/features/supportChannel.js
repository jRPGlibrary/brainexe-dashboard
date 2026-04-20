const discord_js = require('discord.js');
const { EmbedBuilder, ChannelType } = discord_js;
const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');

const CHANNEL_NAME = '❤️-soutien-brainee';
const CHANNEL_DESCRIPTION = 'Aide Brainee à grandir 💙 · Découvre pourquoi le bot a besoin de soutien et comment contribuer';

async function ensureSupportChannel() {
  try {
    if (!shared.discord) return;
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    if (!guild) return;

    await guild.channels.fetch();
    let channel = guild.channels.cache.find(c => c.name === CHANNEL_NAME && c.type === ChannelType.GuildText);

    if (!channel) {
      channel = await guild.channels.create({
        name: CHANNEL_NAME,
        type: ChannelType.GuildText,
        topic: CHANNEL_DESCRIPTION,
        reason: 'Auto-création du salon de soutien Brainee',
      });
      pushLog('SYS', `Salon "${CHANNEL_NAME}" créé ✓`, 'success');
    } else {
      pushLog('SYS', `Salon "${CHANNEL_NAME}" trouvé`, 'info');
    }

    await postSupportEmbed(channel);
  } catch (e) {
    pushLog('ERR', `Support channel error: ${e.message}`, 'error');
  }
}

async function postSupportEmbed(channel) {
  try {
    if (!channel) {
      pushLog('ERR', 'Channel est null, impossible de poster l\'embed', 'error');
      return;
    }

    const messages = await channel.messages.fetch({ limit: 5 });
    const hasEmbed = messages.some(m => m.embeds?.length > 0);

    if (hasEmbed) {
      pushLog('SYS', 'Embed soutien déjà présent', 'info');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff6b9d)
      .setTitle('💙 Soutenir Brainee')
      .setDescription('Chaque contribution aide Brainee à grandir et à t\'offrir une meilleure expérience')
      .addFields(
        {
          name: '⚙️ Pourquoi ça coûte de l\'argent ?',
          value: 'Brainee n\'est pas un simple bot — c\'est une IA vivante qui apprend, se souvient et évolue.\n\n**Ses coûts mensuels :**\n• 💻 **Serveur** : ~5$ (hébergement)\n• 🧠 **Claude API** : 22€ (conversations & mémoire)\n• 💾 **Stockage** : futur (plus on grandit, plus ça coûte)',
          inline: false,
        },
        {
          name: '🎁 Comment contribuer ?',
          value: 'C\'est simple et sans engagement :\n\n1️⃣ **PayPal** → [paypal.me/MatthieuMAUBERNARD](https://paypal.me/MatthieuMAUBERNARD)\n2️⃣ L\'admin enregistre ta contribution\n3️⃣ Le statut du bot se met à jour en live\n\nMême 1€ fait la différence 💫',
          inline: false,
        },
        {
          name: '📊 Suivi en temps réel',
          value: 'Regarde le statut de Brainee dans la sidebar → tu vois le total du mois !\n\n**Format :** 💰 25€ / 27.50€ (collecté / objectif)',
          inline: false,
        },
        {
          name: '💬 Questions ?',
          value: 'Pas de pression, zéro obligation. Soutenir est un choix libre. Merci de faire partie de cette aventure ! 🙏',
          inline: false,
        }
      )
      .setFooter({ text: 'Brainee • Soutien du projet' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    pushLog('SYS', 'Embed soutien posté ✓', 'success');
  } catch (e) {
    pushLog('ERR', `Post support embed error: ${e.message}`, 'error');
  }
}

module.exports = { ensureSupportChannel };
