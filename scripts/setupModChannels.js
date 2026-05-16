/**
 * ================================================
 * 🛡️ SETUP MOD CHANNELS — Script one-shot RC.6
 * ================================================
 * Crée la catégorie MODÉRATION + 5 salons texte + 1 vocal
 * en respectant exactement la convention du serveur BrainEXE.
 *
 * Usage (depuis la racine du projet) :
 *   node scripts/setupModChannels.js
 *
 * Idempotent : si la catégorie existe déjà, le script sort
 * sans rien modifier.
 * ================================================
 */

require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const GUILD_ID = process.env.GUILD_ID || '1481022956816830669';
const TOKEN    = process.env.DISCORD_TOKEN;

if (!TOKEN) { console.error('❌  DISCORD_TOKEN manquant dans .env'); process.exit(1); }

// IDs fixes tirés du discord-template.json — plus fiables qu'une recherche par nom
const MOD_ROLE_ID   = '1481025685161119814'; // 🛡️ Modérateur
const BOT_ROLE_ID   = '1481345193775993012'; // Brain.EXE

const {
  ViewChannel, ReadMessageHistory, SendMessages,
  EmbedLinks, AttachFiles,
  Connect, Speak, Stream,
  ManageMessages,
} = PermissionFlagsBits;

const BOT_FULL      = [ViewChannel, ReadMessageHistory, SendMessages, EmbedLinks, AttachFiles, ManageMessages];
const BOT_WRITE     = [ViewChannel, ReadMessageHistory, SendMessages, EmbedLinks, AttachFiles];
const MOD_RW        = [ViewChannel, ReadMessageHistory, SendMessages];
const MOD_RO        = [ViewChannel, ReadMessageHistory];

// Convention serveur : emoji・nom-en-minuscules pour le texte, emoji Nom pour le vocal
const CHANNELS = [
  {
    name: '🔒・mod-chat',
    type: ChannelType.GuildText,
    topic: 'Discussion interne mods — Brainee lit et répond si mentionnée, n\'initie jamais',
    modAllow: MOD_RW,
    botAllow: BOT_FULL,
  },
  {
    name: '⚠️・mod-logs',
    type: ChannelType.GuildText,
    topic: 'Actions automatiques de modération (spam, timeout, kick) — lecture seule',
    modAllow: MOD_RO,
    modDeny:  [SendMessages],
    botAllow: BOT_WRITE,
  },
  {
    name: '📋・member-logs',
    type: ChannelType.GuildText,
    topic: 'Arrivées, départs, bans, kicks — lecture seule',
    modAllow: MOD_RO,
    modDeny:  [SendMessages],
    botAllow: BOT_WRITE,
  },
  {
    name: '💡・briefing-brainee',
    type: ChannelType.GuildText,
    topic: 'Rapport hebdomadaire de Brainee — lecture seule',
    modAllow: MOD_RO,
    modDeny:  [SendMessages],
    botAllow: BOT_WRITE,
  },
  {
    name: '💭・idées-serveur',
    type: ChannelType.GuildText,
    topic: 'Idées et suggestions pour améliorer le serveur (mods uniquement)',
    modAllow: MOD_RW,
    botAllow: BOT_FULL,
  },
  {
    name: '🔊 Réunion Mod',
    type: ChannelType.GuildVoice,
    modAllow: [ViewChannel, Connect, Speak, Stream],
    botAllow: [ViewChannel],
  },
];

async function run() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', async () => {
    console.log(`✅  Connecté : ${client.user.tag}`);

    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.channels.fetch();

      // ── Idempotence ───────────────────────────────────────────
      const existing = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === '🛡️ ・ MODÉRATION'
      );
      if (existing) {
        console.log('ℹ️  Catégorie 🛡️ ・ MODÉRATION déjà présente — rien à faire.');
        client.destroy();
        return;
      }

      const everyoneId = guild.id;

      // ── Catégorie ─────────────────────────────────────────────
      console.log('📁  Création catégorie 🛡️ ・ MODÉRATION...');
      const category = await guild.channels.create({
        name: '🛡️ ・ MODÉRATION',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneId,  deny:  [ViewChannel] },
          { id: MOD_ROLE_ID, allow: MOD_RW },
          { id: BOT_ROLE_ID, allow: BOT_FULL },
        ],
      });
      console.log(`   ✓ Catégorie créée (${category.id})`);

      // ── Salons ────────────────────────────────────────────────
      for (const cfg of CHANNELS) {
        const overwrites = [
          { id: everyoneId,  deny:  [ViewChannel] },
          { id: MOD_ROLE_ID, allow: cfg.modAllow, ...(cfg.modDeny ? { deny: cfg.modDeny } : {}) },
          { id: BOT_ROLE_ID, allow: cfg.botAllow },
        ];

        await guild.channels.create({
          name: cfg.name,
          type: cfg.type,
          parent: category.id,
          ...(cfg.topic ? { topic: cfg.topic } : {}),
          permissionOverwrites: overwrites,
        });

        const typeLabel = cfg.type === ChannelType.GuildVoice ? 'vocal' : 'texte';
        console.log(`   ✓ ${cfg.name} (${typeLabel})`);
        await new Promise(r => setTimeout(r, 600));
      }

      console.log('\n🎉  Catégorie modération créée avec succès !');

    } catch (err) {
      console.error(`❌  Erreur : ${err.message}`);
    } finally {
      client.destroy();
    }
  });

  await client.login(TOKEN);
}

run().catch(err => { console.error(err); process.exit(1); });
