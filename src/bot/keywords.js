const YOUTUBE_KEYWORDS = [
  'vidéo', 'video', 'trailer', 'gameplay', 'ost', 'musique', 'music',
  'montre', 'lien', 'youtube', 'regarder', 'écouter', 'écoute',
  'cherche', 'trouve', 'extrait', 'opening', 'ending', 'soundtrack',
  'cover', 'clip', 'remix', 'live concert', 'playthrough',
];

const GAMING_KEYWORDS = [
  'rpg', 'jrpg', 'indie', 'retro', 'skyrim', 'zelda', 'persona', 'final fantasy',
  'dragon ball', 'elden ring', 'minecraft', 'pokemon', 'ff7', 'morrowind', 'oblivion',
  'hollow knight', 'dark souls', 'sekiro', 'witcher', 'cyberpunk', 'genshin',
  'valorant', 'fortnite', 'apex', 'overwatch', 'league', 'dota', 'steam', 'ps5',
  'xbox', 'nintendo', 'switch', 'pc gaming', 'indie game', 'metroidvania', 'soulslike',
  'megaman', 'mega man', 'castlevania', 'metroid', 'bloodstained', 'shovel knight',
  'ori', 'axiom verge', 'dead cells', 'blasphemous', 'salt and sanctuary',
  'symphony of the night', 'rondo of blood', 'zero mission', 'super metroid', 'dread',
];

const THREAD_TRIGGERS = [
  'persona', 'final fantasy', 'dragon quest', 'zelda', 'elden ring', 'hollow knight',
  'hades', 'stardew', 'celeste', 'dark souls', 'sekiro', 'witcher', 'cyberpunk',
  'ff7', 'ff6', 'ff9', 'ff10', 'ff12', 'ff14', 'ff16', 'tales of', 'chrono', 'xenoblade',
  'metroid', 'castlevania', 'pokemon', 'mario', 'megaman', 'mega man', 'metroidvania',
  'bloodstained', 'shovel knight', 'ori', 'axiom verge', 'dead cells', 'blasphemous',
  'symphony of the night', 'super metroid', 'dread',
  'baldur', 'divinity', 'pathfinder', 'disco elysium', 'planescape',
  'morrowind', 'oblivion', 'skyrim', 'fallout', 'deus ex', 'system shock',
  'silent hill', 'resident evil', 'metal gear', 'devil may cry',
  'ace attorney', 'danganronpa', 'zero escape',
  'star ocean', 'fire emblem', 'ogre battle',
];

const THREAD_ALLOWED_CHANNELS = [
  'retro-général', 'jrpg-corner', 'rpg-général', 'indie-général',
  'next-gen-général', 'hidden-gems', 'lore-et-théories', 'pixel-art-love',
  'nostalgie', 'game-of-the-moment', 'open-world-rpg',
];

const REACTION_POOL = ['😂', '🔥', '👀', '😏', '⚡', '🧠', '💀', '😭', '🤌', '👏', '🫡', '💯', '🤣', '😤', '🥲'];
const GAMING_REACTIONS = ['🎮', '⚔️', '🕹️', '🏆', '💎', '🐉', '👾', '🌿', '🚀'];

const DRIFT_REDIRECT_MAP = {
  'jrpg': { channelId: '1481028247415296231', channelName: '🐉・jrpg-corner' },
  'final fantasy': { channelId: '1481028247415296231', channelName: '🐉・jrpg-corner' },
  'persona': { channelId: '1481028247415296231', channelName: '🐉・jrpg-corner' },
  'rpg': { channelId: '1481028244500385946', channelName: '⚔️・rpg-général' },
  'retro': { channelId: '1481028260753051739', channelName: '🕹️・retro-général' },
  'indie': { channelId: '1481028272090386584', channelName: '🌿・indie-général' },
  'next-gen': { channelId: '1481028283486175245', channelName: '🚀・next-gen-général' },
  'hidden gem': { channelId: '1481028264410484837', channelName: '🏆・hidden-gems' },
  'nostalgie': { channelId: '1481028266830860340', channelName: '📼・nostalgie' },
  'pixel art': { channelId: '1481028277182402701', channelName: '🎨・pixel-art-love' },
  'lore': { channelId: '1481028254721773588', channelName: '🃏・lore-et-théories' },
  'code': { channelId: '1481028297025650771', channelName: '💻・code-talk' },
  'ia': { channelId: '1481028304206041243', channelName: '🤖・ia-et-tools' },
  'focus': { channelId: '1481028228515631307', channelName: '⚡・tips-focus' },
  'musique': { channelId: '1481028238955249796', channelName: '🎧・playlist-focus' },
  'meme': { channelId: '1481028195032760531', channelName: '😂・memes-et-chaos' },
  'creation': { channelId: '1481028199948222584', channelName: '🖼️・partage-créations' },
};

module.exports = {
  YOUTUBE_KEYWORDS,
  GAMING_KEYWORDS,
  THREAD_TRIGGERS,
  THREAD_ALLOWED_CHANNELS,
  REACTION_POOL,
  GAMING_REACTIONS,
  DRIFT_REDIRECT_MAP,
};
