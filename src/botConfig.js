const fs = require('fs');
const { CONFIG_FILE } = require('./config');

const DEFAULT_CONFIG = {
  anecdote: {
    enabled: true, hour: 10, randomDelayMax: 30, lastPostedDate: null,
    channels: [
      { channelId: '1481028260753051739', channelName: '🕹️・retro-général',   topic: 'jeux rétro, consoles classiques, années 80/90/2000', enabled: true },
      { channelId: '1481028247415296231', channelName: '🐉・jrpg-corner',      topic: 'JRPG, Final Fantasy, Persona, Dragon Quest', enabled: true },
      { channelId: '1481028244500385946', channelName: '⚔️・rpg-général',      topic: 'RPG toutes catégories, mécaniques surprenantes', enabled: true },
      { channelId: '1481028272090386584', channelName: '🌿・indie-général',    topic: 'jeux indépendants, histoires de dev solo', enabled: true },
      { channelId: '1481028283486175245', channelName: '🚀・next-gen-général', topic: 'jeux PS5, Xbox Series, PC, innovations', enabled: true },
      { channelId: '1481028264410484837', channelName: '🏆・hidden-gems',      topic: 'jeux méconnus, hidden gems oubliés', enabled: true },
      { channelId: '1481028254721773588', channelName: '🃏・lore-et-théories', topic: 'lore gaming, easter eggs, secrets', enabled: true },
    ],
  },
  welcome: {
    enabled: true, channelId: '1481028178389635292', channelName: '👋・présentations',
    messages: [
      "T'inquiète, ici on a tous un cerveau un peu chaotique. T'es au bon endroit. 🧠",
      "Nouveau cerveau détecté. Initialisation en cours... 100%. Bienvenue !",
      "On sait pas encore si t'es RPG Addict ou Indie Explorer, mais on va vite le découvrir. 🎮",
      "BrainEXE t'a scanné. Résultat : tu vas te sentir chez toi ici. ✅",
      "Un de plus dans le chaos organisé. Parfait. 🎲",
      "Ton hyperfocus a enfin trouvé un serveur à sa hauteur. ⚡",
      "Loading nouvel ami... 100% — Chargement réussi !",
      "Cool tu arrives, on avait besoin de quelqu'un pour débattre si FF7 ou Persona 5 est meilleur.",
      "T'as trouvé la planque des cerveaux en surchauffe. Installe-toi. 🔥",
      "BrainEXE te souhaite la bienvenue. Le serveur aussi. Les memes aussi. 😂",
    ],
  },
  actus: {
    enabled: true, lastPostedSlots: [],
    channels: [
      { channelId: "1481028286892081183", channelName: "📰・actus-gaming",       topic: "gaming général, gros titres du mois", enabled: true },
      { channelId: "1481028247415296231", channelName: "🐉・jrpg-corner",        topic: "JRPG sorties, DLC, remasters", enabled: true },
      { channelId: "1481028244500385946", channelName: "⚔️・rpg-général",        topic: "RPG large, action-RPG, tactique", enabled: true },
      { channelId: "1481028272090386584", channelName: "🌿・indie-général",      topic: "indie sorties notables", enabled: true },
      { channelId: "1481028274590322850", channelName: "🔭・à-découvrir",        topic: "kickstarters et jeux annoncés", enabled: true },
      { channelId: "1481028283486175245", channelName: "🚀・next-gen-général",   topic: "PS5 Xbox Series PC actus", enabled: true },
      { channelId: "1481028291094904995", channelName: "🎮・game-of-the-moment", topic: "le jeu que tout le monde joue", enabled: true },
      { channelId: "1481028260753051739", channelName: "🕹️・retro-général",     topic: "retro remasters, anniversaires", enabled: true },
      { channelId: "1481028304206041243", channelName: "🤖・ia-et-tools",        topic: "IA et outils devs créateurs", enabled: true },
    ],
  },
  conversations: {
    enabled: true, maxPerDay: 16, dailyCount: 0, lastPostDate: null, lastPostByChannel: {}, canReply: true,
    channels: [
      { channelId: "1481028189680570421", channelName: "💬・général",            topic: "gaming général et vie communauté", enabled: true },
      { channelId: "1481028192088100977", channelName: "🧠・cerveau-en-feu",     topic: "hyperfocus, pensées random TDAH", enabled: true },
      { channelId: "1481028195032760531", channelName: "😂・memes-et-chaos",     topic: "humour, memes, questions fun", enabled: true },
      { channelId: "1481028197515788360", channelName: "🎲・off-topic",          topic: "questions insolites et random", enabled: true },
      { channelId: "1481028199948222584", channelName: "🖼️・partage-créations",  topic: "défi créatif et inspiration", enabled: true },
      { channelId: "1481028244500385946", channelName: "⚔️・rpg-général",        topic: "débats RPG, mécaniques, perso préféré", enabled: true },
      { channelId: "1481028247415296231", channelName: "🐉・jrpg-corner",        topic: "JRPG, OST, waifu tier list", enabled: true },
      { channelId: "1481028250741506189", channelName: "🗺️・open-world-rpg",     topic: "exploration vs histoire, open world favori", enabled: true },
      { channelId: "1481028254721773588", channelName: "🃏・lore-et-théories",   topic: "théorie du moment, lore deep-dive", enabled: true },
      { channelId: "1481028260753051739", channelName: "🕹️・retro-général",     topic: "console et souvenirs retro", enabled: true },
      { channelId: "1481028264410484837", channelName: "🏆・hidden-gems",        topic: "hidden gem à partager", enabled: true },
      { channelId: "1481028266830860340", channelName: "📼・nostalgie",          topic: "souvenirs gaming et nostalgie", enabled: true },
      { channelId: "1481028272090386584", channelName: "🌿・indie-général",      topic: "indie chouchou, underrated", enabled: true },
      { channelId: "1481028274590322850", channelName: "🔭・à-découvrir",        topic: "jeux attendus, futures sorties", enabled: true },
      { channelId: "1481028277182402701", channelName: "🎨・pixel-art-love",     topic: "coup de coeur visuel, DA préférée", enabled: true },
      { channelId: "1481028283486175245", channelName: "🚀・next-gen-général",   topic: "next-gen vs génération précédente", enabled: true },
      { channelId: "1481028291094904995", channelName: "🎮・game-of-the-moment", topic: "avancement dans le jeu du moment", enabled: true },
      { channelId: "1481028228515631307", channelName: "⚡・tips-focus",         topic: "tips productivité, technique focus", enabled: true },
      { channelId: "1481028238955249796", channelName: "🎧・playlist-focus",     topic: "playlist et musique de focus", enabled: true },
      { channelId: "1481028304206041243", channelName: "🤖・ia-et-tools",        topic: "outils IA utilisés en ce moment", enabled: true },
      { channelId: "1481028297025650771", channelName: "💻・code-talk",          topic: "question dev, langage favori", enabled: true },
    ],
  },
  reactionRoles: {
    enabled: true, messageId: '1481033797800693790', channelId: '1481028181485027471',
    mappings: [
      { emoji: '📱', roleName: '📱 TikToker' }, { emoji: '🧠', roleName: '🧠 TDAH' },
      { emoji: '💜', roleName: '💜 Borderline' }, { emoji: '💻', roleName: '💻 Web Dev' },
      { emoji: '⚔️', roleName: '⚔️ RPG Addict' }, { emoji: '🕹️', roleName: '🕹️ Retro Gamer' },
      { emoji: '🌿', roleName: '🌿 Indie Explorer' }, { emoji: '🚀', roleName: '🚀 Next-Gen Player' },
      { emoji: '🔔', roleName: '🔔 Notif Lives' }, { emoji: '👁️', roleName: '👁️ Lurker' },
    ],
  },
  tiktokLive: {
    enabled: true, username: process.env.TIKTOK_USERNAME || 'brain.exe_modded',
    channelId: '1481028204897501273', channelName: '🔴・alertes-live', pingRoleName: '🔔 Notif Lives',
  },
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      let anecdoteMerged = { ...DEFAULT_CONFIG.anecdote, ...(raw.anecdote || {}) };
      if (!Array.isArray(anecdoteMerged.channels)) anecdoteMerged.channels = DEFAULT_CONFIG.anecdote.channels;
      return {
        anecdote: anecdoteMerged,
        welcome: { ...DEFAULT_CONFIG.welcome, ...(raw.welcome || {}) },
        actus: { ...DEFAULT_CONFIG.actus, ...(raw.actus || {}) },
        conversations: { ...DEFAULT_CONFIG.conversations, ...(raw.conversations || {}) },
        reactionRoles: { ...DEFAULT_CONFIG.reactionRoles, ...(raw.reactionRoles || {}) },
        tiktokLive: { ...DEFAULT_CONFIG.tiktokLive, ...(raw.tiktokLive || {}) },
      };
    }
  } catch (e) { console.error('Config load error:', e.message); }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig() {
  const shared = require('./shared');
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(shared.botConfig, null, 2), 'utf8'); }
  catch (e) { console.error('Config save error:', e.message); }
}

module.exports = { DEFAULT_CONFIG, loadConfig, saveConfig };
