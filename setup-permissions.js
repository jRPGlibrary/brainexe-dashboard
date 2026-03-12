/**
 * ================================================
 *  🧠 BRAINEXE — Setup Permissions par Rôle
 * ================================================
 *  Ce script configure les permissions de chaque
 *  catégorie pour que chaque rôle accède uniquement
 *  à ses propres salons.
 *
 *  📋 UTILISATION :
 *  1. Remplace COLLE_TON_TOKEN_ICI par ton token
 *  2. node setup-permissions.js
 *  3. Attends la fin — ça prend ~30 secondes
 * ================================================
 */

const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const TOKEN    = 'MTQ4MTMyNjgyMzExMDM0ODg2NA.Gg8B4N.xTRaocNaCrQ6ES8FBsZTU0KQX60PoF4ZsFOxVw';
const GUILD_ID = '1481022956816830669';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ── PERMISSIONS HELPERS ───────────────────────────────────────
const ALLOW_VIEW = {
  allow: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.UseApplicationCommands,
  ]
};

const ALLOW_VIEW_READONLY = {
  allow: [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AddReactions,
  ]
};

const DENY_VIEW = {
  deny: [PermissionFlagsBits.ViewChannel]
};

// ── MAPPING RÔLES ↔ CATÉGORIES ────────────────────────────────
// Structure :
// - categories : liste des catégories accessibles par ce rôle
// - everyone   : si true, tout le monde y a accès par défaut
// - lurker     : si true, le Lurker y a accès
const MAPPING = [
  {
    category: '📌 ・ ACCUEIL',
    everyone: false,      // @everyone bloqué
    lurker: true,         // Lurker peut voir pour choisir ses rôles
    roles: ['👁️ Lurker', '📱 TikToker', '🧠 TDAH', '💜 Borderline', '💻 Dev', '💻 Web Dev', '⚔️ RPG Addict', '🕹️ Retro Gamer', '🌿 Indie Explorer', '🚀 Next-Gen Player', '🔔 Notif Lives'],
    // Tout le monde a accès à l'accueil
    allRoles: true,
  },
  {
    category: '💬 ・ COMMUNAUTÉ',
    everyone: false,
    allRoles: true,        // Tous les rôles ont accès
    roles: [],
  },
  {
    category: '📱 ・ TIKTOK & LIVES',
    everyone: false,
    allRoles: false,
    roles: ['📱 TikToker', '🔔 Notif Lives'],
  },
  {
    category: '🧠 ・ TDAH & NEURODIVERGENCE',
    everyone: false,
    allRoles: false,
    roles: ['🧠 TDAH', '💜 Borderline'],
  },
  {
    category: '⚔️ ・ RPG & AVENTURE',
    everyone: false,
    allRoles: false,
    roles: ['⚔️ RPG Addict'],
  },
  {
    category: '🕹️ ・ RETRO GAMING',
    everyone: false,
    allRoles: false,
    roles: ['🕹️ Retro Gamer'],
  },
  {
    category: '🌿 ・ INDIE GAMES',
    everyone: false,
    allRoles: false,
    roles: ['🌿 Indie Explorer'],
  },
  {
    category: '🚀 ・ NEXT-GEN & ACTUS',
    everyone: false,
    allRoles: false,
    roles: ['🚀 Next-Gen Player'],
  },
  {
    category: '💻 ・ WEB DEV & TECH',
    everyone: false,
    allRoles: false,
    roles: ['💻 Dev', '💻 Web Dev'],
  },
  {
    category: '🔊 ・ VOCAUX',
    everyone: false,
    allRoles: true,        // Tout le monde accède aux vocaux
    roles: [],
  },
];

// Rôles qui ont accès à TOUT (admins)
const ADMIN_ROLES = ['👑 Fondateur', '🛡️ Modérateur', 'carl-bot', 'Brain.EXE', 'Ticket Tool', 'Statbot', 'News Alerts Bot'];

function log(emoji, msg) {
  const time = new Date().toLocaleTimeString('fr-FR');
  console.log(`[${time}] ${emoji}  ${msg}`);
}

client.once('clientReady', async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🧠 BRAINEXE — Setup Permissions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('✅', `Connecté : ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();

    log('📋', `${guild.roles.cache.size} rôles · ${guild.channels.cache.size} salons trouvés\n`);

    // Récupère tous les rôles par nom
    const roleMap = {};
    guild.roles.cache.forEach(r => { roleMap[r.name] = r; });

    // Récupère @everyone
    const everyoneRole = guild.roles.everyone;

    let processed = 0;

    for (const entry of MAPPING) {
      // Trouve la catégorie
      const cat = guild.channels.cache.find(
        c => c.name === entry.category && c.type === ChannelType.GuildCategory
      );

      if (!cat) {
        log('⚠️ ', `Catégorie introuvable : "${entry.category}" — ignorée`);
        continue;
      }

      log('📂', `Configuration : ${entry.category}`);

      // ── Permissions de la catégorie ───────────────────────
      const permOverwrites = [];

      // @everyone → toujours bloqué par défaut
      permOverwrites.push({ id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] });

      if (entry.allRoles) {
        // Tous les rôles humains ont accès
        guild.roles.cache
          .filter(r => r.name !== '@everyone')
          .forEach(r => {
            permOverwrites.push({ id: r.id, ...ALLOW_VIEW });
          });
        log('✅', `  → Accès : tous les rôles`);
      } else {
        // Accès uniquement aux rôles listés + admins
        const accessRoles = [...entry.roles, ...ADMIN_ROLES];
        for (const roleName of accessRoles) {
          const role = roleMap[roleName];
          if (role) {
            permOverwrites.push({ id: role.id, ...ALLOW_VIEW });
          }
        }
        log('✅', `  → Accès : ${entry.roles.join(', ')} + admins`);
      }

      // Applique les permissions sur la catégorie
      await cat.permissionOverwrites.set(permOverwrites, 'Setup permissions par rôle');
      await sleep(500);

      // Applique les mêmes permissions sur tous les salons enfants
      const children = guild.channels.cache.filter(c => c.parentId === cat.id);
      for (const [, ch] of children) {
        await ch.permissionOverwrites.set(permOverwrites, 'Setup permissions par rôle');
        log('   ', `  #${ch.name} ✅`);
        await sleep(300);
      }

      processed++;
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('🎉', `Permissions configurées sur ${processed} catégories !`);
    console.log('\n📋 Résumé :');
    console.log('  👁️  Lurker          → 📌 Accueil seulement');
    console.log('  📱  TikToker        → 📱 TikTok & Lives');
    console.log('  🧠  TDAH            → 🧠 TDAH & Neurodivergence');
    console.log('  💜  Borderline      → 🧠 TDAH & Neurodivergence');
    console.log('  ⚔️   RPG Addict      → ⚔️  RPG & Aventure');
    console.log('  🕹️   Retro Gamer     → 🕹️  Retro Gaming');
    console.log('  🌿  Indie Explorer  → 🌿 Indie Games');
    console.log('  🚀  Next-Gen Player → 🚀 Next-Gen & Actus');
    console.log('  💻  Dev / Web Dev   → 💻 Web Dev & Tech');
    console.log('  🌍  Tout le monde   → 💬 Communauté + 🔊 Vocaux');
    console.log('  👑  Fondateur       → Tout');
    console.log('  🛡️   Modérateur      → Tout');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    log('❌', `Erreur : ${err.message}`);
    console.error(err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

client.login(TOKEN).catch(err => {
  console.error('\n❌ Token invalide :', err.message);
  process.exit(1);
});
