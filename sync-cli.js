#!/usr/bin/env node
/**
 * ================================================
 * 🧠 BRAINEXE — CLI Sync Bidirectionnel v1.0
 * ================================================
 * Discord ⟷ discord-template.json (sans serveur web)
 *
 * Usage :
 *   node sync-cli.js pull     Discord → fichier  ← TOUJOURS commencer par ça
 *   node sync-cli.js push     fichier → Discord
 *   node sync-cli.js watch    pull initial + watch fichier + push auto
 *   node sync-cli.js status   diff Discord live vs fichier local
 * ================================================
 */

require('dotenv').config();
const fs      = require('fs');
const path    = require('path');
const { Client, GatewayIntentBits, ChannelType, Partials } = require('discord.js');

let chokidar;
try { chokidar = require('chokidar'); } catch {}

// ── ANSI colors (zero deps) ───────────────────────────────────
const c = {
  reset:   '\x1b[0m',  bold:    '\x1b[1m',  dim:    '\x1b[2m',
  green:   '\x1b[32m', yellow:  '\x1b[33m', blue:   '\x1b[34m',
  cyan:    '\x1b[36m', red:     '\x1b[31m', magenta:'\x1b[35m',
  gray:    '\x1b[90m', white:   '\x1b[37m',
};

const TEMPLATE_FILE = path.resolve(process.cwd(), 'discord-template.json');
const TOKEN    = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1481022956816830669';

// ── Helpers ───────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(dir, msg, level = 'info') {
  const time  = new Date().toLocaleTimeString('fr-FR');
  const cols  = { info: c.blue, success: c.green, error: c.red, warn: c.yellow };
  const icons = { info: 'ℹ', success: '✓', error: '✗', warn: '⚠' };
  const col   = cols[level]  || c.blue;
  const icon  = icons[level] || '·';
  const dirPad = dir.padEnd(3);
  console.log(`${c.gray}[${time}]${c.reset} ${col}${icon}${c.reset} ${c.bold}[${dirPad}]${c.reset} ${msg}`);
}

function banner() {
  console.log(`
${c.bold}${c.magenta}╔══════════════════════════════════════════════╗
║  🧠  BRAINEXE · CLI Sync Bidirectionnel v1.0  ║
╚══════════════════════════════════════════════╝${c.reset}
`);
}

function createClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel],
  });
}

// ── Lecture état Discord ──────────────────────────────────────
async function readGuildState(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();

  const roles = guild.roles.cache
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map(r => ({
      id:       r.id,
      name:     r.name,
      color:    '#' + r.color.toString(16).padStart(6, '0'),
      hoist:    r.hoist,
      position: r.position,
    }));

  const categories = guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  const structure = [];
  for (const [, cat] of categories) {
    const channels = guild.channels.cache
      .filter(ch => ch.parentId === cat.id)
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map(ch => ({
        id:    ch.id,
        name:  ch.name,
        type:  ch.type === ChannelType.GuildVoice ? 'voice' : 'text',
        topic: ch.topic || '',
      }));
    structure.push({ id: cat.id, category: cat.name, channels });
  }

  return {
    name:          guild.name,
    roles,
    structure,
    totalRoles:    roles.length,
    totalChannels: structure.reduce((a, s) => a + s.channels.length, 0),
  };
}

// ── PULL : Discord → Fichier ──────────────────────────────────
async function cmdPull(guild) {
  log('D→F', 'Lecture de l\'état Discord en cours...', 'info');

  const state = await readGuildState(guild);

  const template = {
    _info: {
      lastSync:      new Date().toISOString(),
      source:        'discord',
      server:        state.name,
      totalRoles:    state.totalRoles,
      totalChannels: state.totalChannels,
    },
    roles:     state.roles,
    structure: state.structure,
  };

  fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(template, null, 2), 'utf8');

  log('D→F', `${state.totalRoles} rôles · ${state.totalChannels} salons`, 'success');
  log('D→F', `Fichier mis à jour → ${path.basename(TEMPLATE_FILE)}`, 'success');

  return state;
}

// ── PUSH : Fichier → Discord ──────────────────────────────────
async function cmdPush(guild) {
  if (!fs.existsSync(TEMPLATE_FILE)) {
    log('F→D', `Fichier introuvable : ${path.basename(TEMPLATE_FILE)}`, 'error');
    log('F→D', 'Lance d\'abord : node sync-cli.js pull', 'warn');
    return 0;
  }

  let template;
  try {
    template = JSON.parse(fs.readFileSync(TEMPLATE_FILE, 'utf8'));
  } catch {
    log('F→D', 'JSON invalide — vérifie la syntaxe du fichier', 'error');
    return 0;
  }

  await guild.channels.fetch();
  await guild.roles.fetch();

  log('F→D', 'Application du template sur Discord...', 'info');
  let changes = 0;

  // ── Rôles ─────────────────────────────────────────────────
  for (const rd of template.roles || []) {
    const color    = parseInt((rd.color || '#000000').replace('#', ''), 16);
    const existing = guild.roles.cache.find(r => r.name === rd.name);

    if (!existing) {
      await guild.roles.create({
        name: rd.name, color, hoist: rd.hoist || false,
        permissions: [], reason: 'CLI sync · BrainEXE',
      });
      log('F→D', `Rôle créé      : ${rd.name}`, 'success');
      changes++;
      await sleep(400);
    } else if (existing.color !== color || existing.hoist !== rd.hoist) {
      await existing.edit({ color, hoist: rd.hoist, reason: 'CLI sync · BrainEXE' });
      log('F→D', `Rôle modifié   : ${rd.name}`, 'info');
      changes++;
      await sleep(300);
    }
  }

  // ── Structure (catégories + salons) ───────────────────────
  for (const block of template.structure || []) {
    let cat = guild.channels.cache.find(
      ch => ch.name === block.category && ch.type === ChannelType.GuildCategory
    );

    if (!cat) {
      cat = await guild.channels.create({
        name: block.category, type: ChannelType.GuildCategory,
        reason: 'CLI sync · BrainEXE',
      });
      log('F→D', `Catégorie créée : ${block.category}`, 'success');
      changes++;
      await sleep(400);
    }

    for (const ch of block.channels || []) {
      const chType   = ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
      const existing = guild.channels.cache.find(
        c => c.name === ch.name && c.parentId === cat.id
      );

      if (!existing) {
        const opts = { name: ch.name, type: chType, parent: cat.id, reason: 'CLI sync · BrainEXE' };
        if (ch.topic) opts.topic = ch.topic;
        await guild.channels.create(opts);
        log('F→D', `Salon créé     : ${ch.name}`, 'success');
        changes++;
        await sleep(350);
      } else if (ch.topic && existing.topic !== ch.topic) {
        await existing.setTopic(ch.topic, 'CLI sync · BrainEXE');
        log('F→D', `Topic màj      : ${ch.name}`, 'info');
        changes++;
        await sleep(300);
      }
    }
  }

  if (changes > 0) {
    log('F→D', `${changes} changement(s) appliqué(s) ✓`, 'success');
    log('D→F', 'Re-pull pour synchroniser les IDs Discord...', 'info');
    await cmdPull(guild);
  } else {
    log('F→D', 'Aucun changement — Discord déjà à jour ✓', 'success');
  }

  return changes;
}

// ── STATUS : diff Discord vs fichier ─────────────────────────
async function cmdStatus(guild) {
  log('STS', 'Analyse comparative Discord ↔ fichier...', 'info');
  const live = await readGuildState(guild);

  if (!fs.existsSync(TEMPLATE_FILE)) {
    log('STS', 'Aucun fichier local — lance : node sync-cli.js pull', 'warn');
    return;
  }

  let fileTemplate;
  try {
    fileTemplate = JSON.parse(fs.readFileSync(TEMPLATE_FILE, 'utf8'));
  } catch {
    log('STS', 'Fichier local illisible ou JSON invalide', 'error');
    return;
  }

  const syncDate = fileTemplate._info
    ? new Date(fileTemplate._info.lastSync).toLocaleString('fr-FR')
    : 'inconnue';

  console.log(`
${c.bold}${c.cyan}── Discord (LIVE) ─────────────────────────────${c.reset}
  Serveur  : ${c.bold}${live.name}${c.reset}
  Rôles    : ${c.green}${live.totalRoles}${c.reset}
  Salons   : ${c.green}${live.totalChannels}${c.reset}

${c.bold}${c.yellow}── Fichier local · ${path.basename(TEMPLATE_FILE)} ─────────────${c.reset}
  Dernière sync : ${c.yellow}${syncDate}${c.reset}
  Rôles         : ${fileTemplate._info?.totalRoles ?? '?'}
  Salons        : ${fileTemplate._info?.totalChannels ?? '?'}`);

  const liveRoles = new Set(live.roles.map(r => r.name));
  const fileRoles = new Set((fileTemplate.roles || []).map(r => r.name));

  const onlyOnDiscord = [...liveRoles].filter(n => !fileRoles.has(n));
  const onlyInFile    = [...fileRoles].filter(n => !liveRoles.has(n));

  const liveCats = new Set(live.structure.map(s => s.category));
  const fileCats = new Set((fileTemplate.structure || []).map(s => s.category));
  const onlyOnDiscordCats = [...liveCats].filter(n => !fileCats.has(n));
  const onlyInFileCats    = [...fileCats].filter(n => !liveCats.has(n));

  const hasDiff = onlyOnDiscord.length || onlyInFile.length
               || onlyOnDiscordCats.length || onlyInFileCats.length;

  if (hasDiff) {
    console.log(`\n${c.bold}${c.red}── Différences ────────────────────────────────${c.reset}`);
    if (onlyOnDiscord.length)     console.log(`  ${c.green}Rôles Discord non dans fichier :${c.reset} ${onlyOnDiscord.join(', ')}`);
    if (onlyInFile.length)        console.log(`  ${c.yellow}Rôles fichier non sur Discord  :${c.reset} ${onlyInFile.join(', ')}`);
    if (onlyOnDiscordCats.length) console.log(`  ${c.green}Cats Discord non dans fichier  :${c.reset} ${onlyOnDiscordCats.join(', ')}`);
    if (onlyInFileCats.length)    console.log(`  ${c.yellow}Cats fichier non sur Discord   :${c.reset} ${onlyInFileCats.join(', ')}`);
    console.log(`
${c.bold}  → node sync-cli.js pull${c.reset}  pour mettre le fichier à jour depuis Discord
  → ${c.bold}node sync-cli.js push${c.reset}  pour pousser le fichier vers Discord`);
  } else {
    console.log(`\n${c.bold}${c.green}  ✓ Fichier et Discord sont parfaitement synchronisés${c.reset}`);
  }
  console.log('');
}

// ── WATCH : pull initial + surveillance fichier ───────────────
async function cmdWatch(guild) {
  log('WCH', 'Mode watch — pull initial...', 'info');
  await cmdPull(guild);

  if (!chokidar) {
    log('WCH', 'chokidar introuvable — npm install chokidar', 'error');
    return;
  }

  console.log('');
  log('WCH', `Surveillance active → ${path.basename(TEMPLATE_FILE)}`, 'success');
  log('WCH', 'Modifie le fichier JSON → push automatique vers Discord', 'info');
  log('WCH', 'Ctrl+C pour arrêter', 'info');
  console.log('');

  let debounce = null;

  chokidar.watch(TEMPLATE_FILE, {
    persistent:     true,
    ignoreInitial:  true,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 },
  }).on('change', () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async () => {
      console.log('');
      log('WCH', 'Changement détecté → push en cours...', 'warn');
      await cmdPush(guild);
    }, 1500);
  });

  // Keepalive infini
  await new Promise(() => {});
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  const cmd = process.argv[2];
  banner();

  if (!['pull', 'push', 'watch', 'status'].includes(cmd)) {
    console.log(`${c.bold}Commandes disponibles :${c.reset}

  ${c.green}node sync-cli.js pull${c.reset}    Discord → fichier  ${c.gray}← TOUJOURS commencer par là${c.reset}
  ${c.cyan}node sync-cli.js push${c.reset}    fichier → Discord
  ${c.yellow}node sync-cli.js watch${c.reset}   pull initial + surveillance auto
  ${c.blue}node sync-cli.js status${c.reset}  diff Discord ↔ fichier

${c.bold}Scripts npm (après package.json) :${c.reset}
  npm run sync:pull
  npm run sync:push
  npm run sync:watch
  npm run sync:status

${c.bold}Workflow recommandé :${c.reset}
  1.  ${c.green}pull${c.reset}   ← récupère l'état Discord  (template à jour)
  2.  ✏️  édite discord-template.json si besoin
  3.  ${c.cyan}push${c.reset}   ← applique le fichier sur Discord
  4.  ${c.yellow}watch${c.reset}  ← mode dev : push auto à chaque sauvegarde
`);
    process.exit(0);
  }

  if (!TOKEN) {
    log('ERR', 'DISCORD_TOKEN manquant dans .env', 'error');
    log('ERR', 'Crée un fichier .env : DISCORD_TOKEN=ton_token_bot', 'warn');
    process.exit(1);
  }

  const client = createClient();
  log('SYS', 'Connexion à Discord...', 'info');

  await new Promise((resolve, reject) => {
    client.once('ready', resolve);
    client.once('error', reject);
    client.login(TOKEN).catch(reject);
  });

  log('SYS', `Connecté   : ${c.bold}${client.user.tag}${c.reset}`, 'success');

  const guild = await client.guilds.fetch(GUILD_ID);
  log('SYS', `Serveur    : ${c.bold}${guild.name}${c.reset} · ${guild.memberCount} membres`, 'success');
  console.log('');

  try {
    switch (cmd) {
      case 'pull':   await cmdPull(guild);   break;
      case 'push':   await cmdPush(guild);   break;
      case 'watch':  await cmdWatch(guild);  break;
      case 'status': await cmdStatus(guild); break;
    }
  } catch (err) {
    log('ERR', err.message, 'error');
    process.exit(1);
  }

  if (cmd !== 'watch') {
    await client.destroy();
    log('SYS', 'Déconnexion propre ✓', 'info');
    console.log('');
  }
}

main().catch(err => {
  console.error(`\n${c.red}✗ Erreur fatale :${c.reset}`, err.message);
  process.exit(1);
});
