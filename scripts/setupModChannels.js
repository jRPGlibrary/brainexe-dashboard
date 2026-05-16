/**
 * ================================================
 * 🛡️ SETUP MOD CHANNELS — Script one-shot RC.6
 * ================================================
 * Crée la catégorie MODÉRATION + 5 salons texte + 1 vocal
 * avec les bonnes permissions pour le rôle "Modérateur".
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

const {
  ViewChannel, ReadMessageHistory, SendMessages,
  EmbedLinks, AttachFiles,
  Connect, Speak, Stream,
  ManageMessages,
} = PermissionFlagsBits;

// Permissions bot : accès complet en lecture/écriture (pour les logs + réponses @mention)
const BOT_FULL   = [ViewChannel, ReadMessageHistory, SendMessages, EmbedLinks, AttachFiles, ManageMessages];
// Permissions bot salons lecture seule (mod-logs, member-logs, briefing)
const BOT_WRITE  = [ViewChannel, ReadMessageHistory, SendMessages, EmbedLinks, AttachFiles];
// Mods : lecture + écriture
const MOD_READ_WRITE = [ViewChannel, ReadMessageHistory, SendMessages];
// Mods : lecture seule (logs)
const MOD_READ_ONLY  = [ViewChannel, ReadMessageHistory];

const CHANNELS = [
  {
    name: 'mod-chat',
    type: ChannelType.GuildText,
    topic: 'Discussion interne mods — Brainee lit et répond si mentionnée, n\'initie jamais',
    modAllow: MOD_READ_WRITE,
    botAllow: BOT_FULL,
  },
  {
    name: 'mod-logs',
    type: ChannelType.GuildText,
    topic: 'Actions automatiques de modération (spam, timeout, kick) — lecture seule',
    modAllow: MOD_READ_ONLY,
    modDeny:  [SendMessages],
    botAllow: BOT_WRITE,
  },
  {
    name: 'member-logs',
    type: ChannelType.GuildText,
    topic: 'Arrivées, départs, bans, kicks — lecture seule',
    modAllow: MOD_READ_ONLY,
    modDeny:  [SendMessages],
    botAllow: BOT_WRITE,
  },
  {
    name: 'briefing-brainee',
    type: ChannelType.GuildText,
    topic: 'Rapport hebdomadaire de Brainee — lecture seule',
    modAllow: MOD_READ_ONLY,
    modDeny:  [SendMessages],
    botAllow: BOT_WRITE,
  },
  {
    name: 'idées-serveur',
    type: ChannelType.GuildText,
    topic: 'Idées et suggestions pour améliorer le serveur (mods uniquement)',
    modAllow: MOD_READ_WRITE,
    botAllow: BOT_FULL,
  },
  {
    name: '🔊・réunion',
    type: ChannelType.GuildVoice,
    modAllow: [ViewChannel, Connect, Speak, Stream],
    botAllow: [ViewChannel],
  },
];

async function run() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', async () => {
    console.log(`✅  Connecté en tant que ${client.user.tag}`);

    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.channels.fetch();

      // ── Vérification idempotente ──────────────────────────────
      const existing = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === '🛡️ MODÉRATION'
      );
      if (existing) {
        console.log('ℹ️  La catégorie 🛡️ MODÉRATION existe déjà — rien à faire.');
        client.destroy();
        return;
      }

      // ── Rôle Modérateur ───────────────────────────────────────
      await guild.roles.fetch();
      const modRole = guild.roles.cache.find(r => r.name === 'Modérateur');
      if (!modRole) {
        console.error('❌  Rôle "Modérateur" introuvable sur le serveur.');
        client.destroy();
        return;
      }

      const botId = client.user.id;
      const everyoneId = guild.id;

      // ── Création de la catégorie ──────────────────────────────
      console.log('📁  Création de la catégorie 🛡️ MODÉRATION...');
      const category = await guild.channels.create({
        name: '🛡️ MODÉRATION',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: everyoneId, deny: [ViewChannel] },
          { id: modRole.id, allow: MOD_READ_WRITE },
          { id: botId,      allow: BOT_FULL },
        ],
      });
      console.log(`   ✓ Catégorie créée (id: ${category.id})`);

      // ── Création des salons ───────────────────────────────────
      for (const cfg of CHANNELS) {
        const overwrites = [
          { id: everyoneId, deny: [ViewChannel] },
          { id: modRole.id, allow: cfg.modAllow, ...(cfg.modDeny ? { deny: cfg.modDeny } : {}) },
          { id: botId,      allow: cfg.botAllow },
        ];

        const created = await guild.channels.create({
          name: cfg.name,
          type: cfg.type,
          parent: category.id,
          ...(cfg.topic ? { topic: cfg.topic } : {}),
          permissionOverwrites: overwrites,
        });
        console.log(`   ✓ #${cfg.name} (${cfg.type === ChannelType.GuildVoice ? 'vocal' : 'texte'})`);

        // Petit délai pour éviter le rate-limit Discord
        await new Promise(r => setTimeout(r, 600));
      }

      console.log('\n🎉  Catégorie modération créée avec succès !');
      console.log('   → Colle les IDs dans botConfig si nécessaire (sinon modLogger les trouve par nom).\n');

    } catch (err) {
      console.error(`❌  Erreur : ${err.message}`);
    } finally {
      client.destroy();
    }
  });

  await client.login(TOKEN);
}

run().catch(err => { console.error(err); process.exit(1); });
