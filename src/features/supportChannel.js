const discord_js = require('discord.js');
const { EmbedBuilder, ChannelType } = discord_js;
const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const { getSupportChannelId, setSupportChannelId, getSupportEmbedMessageId, setSupportEmbedMessageId } = require('../config/channelManager');
const { normalizeName } = require('../bot/messaging');

const CHANNEL_NAME = '❤️-soutien-brainee';
const CHANNEL_DESCRIPTION = 'Aide Brainee à grandir 💙 · Découvre pourquoi le bot a besoin de soutien et comment contribuer';

async function ensureSupportChannel() {
  try {
    if (!shared.discord) return;
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    if (!guild) return;

    await guild.channels.fetch();

    let channel = null;
    const storedId = getSupportChannelId();

    if (storedId) {
      channel = guild.channels.cache.get(storedId);
      if (channel && channel.type === ChannelType.GuildText) {
        pushLog('SYS', `Salon de soutien récupéré par ID ✓`, 'info');
      } else {
        channel = null;
      }
    }

    if (!channel) {
      const normChannel = normalizeName(CHANNEL_NAME);
      channel = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildText &&
        normalizeName(c.name) === normChannel
      );

      if (channel) {
        setSupportChannelId(channel.id);
        pushLog('SYS', `Salon de soutien trouvé par nom normalisé ✓`, 'info');
      }
    }

    if (!channel) {
      channel = await guild.channels.create({
        name: CHANNEL_NAME,
        type: ChannelType.GuildText,
        topic: CHANNEL_DESCRIPTION,
        reason: 'Auto-création du salon de soutien Brainee',
      });
      setSupportChannelId(channel.id);
      pushLog('SYS', `Salon de soutien créé ✓`, 'success');
    } else {
      pushLog('SYS', `Salon de soutien prêt ✓`, 'info');
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

    const storedMessageId = getSupportEmbedMessageId();
    if (storedMessageId) {
      try {
        const existingMessage = await channel.messages.fetch(storedMessageId);
        if (existingMessage && existingMessage.embeds?.length > 0) {
          pushLog('SYS', 'Embed soutien déjà présent (ID)', 'info');
          return;
        }
      } catch (_) {
        setSupportEmbedMessageId(null);
      }
    }

    // Fallback : scan le salon pour retrouver l'embed (ex: après un déploiement qui écrase channels.json)
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      const botId = shared.discord?.user?.id;
      const existing = [...messages.values()].find(m =>
        m.author.id === botId && m.embeds?.length > 0 && m.embeds[0].title?.includes('Soutenir Brainee')
      );
      if (existing) {
        setSupportEmbedMessageId(existing.id);
        pushLog('SYS', 'Embed soutien retrouvé dans le salon ✓', 'info');
        return;
      }
    } catch (_) {}

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

    const message = await channel.send({ embeds: [embed] });
    setSupportEmbedMessageId(message.id);
    pushLog('SYS', 'Embed soutien posté ✓', 'success');
  } catch (e) {
    pushLog('ERR', `Post support embed error: ${e.message}`, 'error');
  }
}

module.exports = { ensureSupportChannel };
