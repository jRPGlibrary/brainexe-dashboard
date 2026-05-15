/**
 * /affinite — Slash command : affiche l'affinité d'un membre avec Brainee
 */

const { REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { TOKEN, GUILD_ID } = require('../config');
const { ensureMemberBond } = require('../db/memberBonds');
const { getVipTier, computeVipScore } = require('../db/vipSystem');
const { pushLog } = require('../logger');

const COMMAND_DEF = new SlashCommandBuilder()
  .setName('affinite')
  .setDescription('Voir ton niveau d\'affinité avec Brainee')
  .toJSON();

async function registerAffinityCommand(clientId) {
  if (!TOKEN || !clientId) return;
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(clientId, GUILD_ID), {
      body: [COMMAND_DEF],
    });
    pushLog('SYS', '✅ Slash command /affinite enregistrée', 'success');
  } catch (err) {
    pushLog('ERR', `registerAffinityCommand: ${err.message}`, 'error');
  }
}

async function handleAffinityCommand(interaction) {
  await interaction.deferReply();

  const userId = interaction.user.id;
  const username = interaction.user.username;

  const bond = await ensureMemberBond(userId, username);
  const tier = getVipTier(bond);
  const score = computeVipScore(bond);

  const att = Math.round(bond.baseAttachment || 0);
  const trust = Math.round(bond.baseTrust || 0);
  const comfort = Math.round(bond.baseComfort || 0);
  const streak = bond.interactionStreak || 0;

  function bar(val) {
    const filled = Math.round(val / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${val}/100`;
  }

  const TIER_COLORS = {
    newcomer:     0x7ecc49,
    regular:      0x5865f2,
    vip:          0xe91e8c,
    inner_circle: 0xff6b35,
  };

  const TIER_DESC = {
    newcomer:     'Brainee te connaît à peine — tout reste à construire.',
    regular:      'Tu fais partie des habitués. Le vibe commence à s\'installer.',
    vip:          'T\'es dans son cercle proche. Elle te connaît pour de vrai.',
    inner_circle: 'INNER CIRCLE. Brainee te compte parmi ses proches.',
  };

  const embed = new EmbedBuilder()
    .setColor(TIER_COLORS[tier.key])
    .setTitle(`${tier.label}  •  Score ${score}/100`)
    .setDescription(TIER_DESC[tier.key])
    .addFields(
      { name: 'Attachement', value: bar(att), inline: false },
      { name: 'Confiance',   value: bar(trust), inline: false },
      { name: 'Confort',     value: bar(comfort), inline: false },
      { name: 'Streak',      value: `${streak} jour${streak > 1 ? 's' : ''} d'affilée`, inline: true },
    )
    .setFooter({ text: `Affinité de ${username} avec Brainee` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  pushLog('SYS', `/affinite → ${username} (${tier.label}, score ${score})`, 'success');
}

module.exports = { registerAffinityCommand, handleAffinityCommand };
