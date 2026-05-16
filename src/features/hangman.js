/**
 * ================================================
 * 🎮 PENDU RPG/JRPG — Fondateur uniquement (DM)
 * ================================================
 * Mini-jeu pendu sur des titres RPG/JRPG en DM.
 * Réservé à l'owner (OWNER_USER_ID).
 * Réactions finales générées par Claude Haiku.
 * ================================================
 */

const { callClaude } = require('../ai/claude');
const { simulateDmTyping } = require('../bot/messaging');
const { pushLog } = require('../logger');

// État des parties en cours (userId → gameState)
const games = new Map();

const HANGMAN_ART = [
  '```\n  +---+\n  |   |\n  |\n  |\n  |\n  |\n======\n```',
  '```\n  +---+\n  |   |\n  |   O\n  |\n  |\n  |\n======\n```',
  '```\n  +---+\n  |   |\n  |   O\n  |   |\n  |\n  |\n======\n```',
  '```\n  +---+\n  |   |\n  |   O\n  |  /|\n  |\n  |\n======\n```',
  '```\n  +---+\n  |   |\n  |   O\n  |  /|\\\n  |\n  |\n======\n```',
  '```\n  +---+\n  |   |\n  |   O\n  |  /|\\\n  |  /\n  |\n======\n```',
  '```\n  +---+\n  |   |\n  |   O\n  |  /|\\\n  |  / \\\n  |\n======\n```',
];

const TITLES = [
  'Chrono Trigger',
  'Chrono Cross',
  'Final Fantasy VII',
  'Final Fantasy VIII',
  'Final Fantasy IX',
  'Final Fantasy X',
  'Final Fantasy XII',
  'Final Fantasy Tactics',
  'Final Fantasy XIV',
  'Final Fantasy XVI',
  'Xenogears',
  'Xenoblade Chronicles',
  'Xenoblade Chronicles 2',
  'Xenoblade Chronicles 3',
  'Tales of Symphonia',
  'Tales of Vesperia',
  'Tales of Berseria',
  'Tales of Arise',
  'Persona 3',
  'Persona 4 Golden',
  'Persona 5 Royal',
  'Shin Megami Tensei Nocturne',
  'Dragon Quest XI',
  'Nier Automata',
  'Nier Replicant',
  'Star Ocean Second Story',
  'Star Ocean Till the End of Time',
  'Valkyrie Profile',
  'Suikoden II',
  'Grandia II',
  'Skies of Arcadia',
  'Fire Emblem Three Houses',
  'Octopath Traveler',
  'Triangle Strategy',
  'Bravely Default',
  'Lost Odyssey',
  'Shadow Hearts',
  'Radiata Stories',
  'Rogue Galaxy',
  'Dark Cloud 2',
  'Kingdom Hearts',
  'Kingdom Hearts II',
  'Dragon Age Origins',
  'Mass Effect 2',
  'Disco Elysium',
  'Planescape Torment',
  'Vagrant Story',
  'Breath of Fire IV',
  'Wild Arms 3',
  'Eternal Sonata',
  'Resonance of Fate',
  'Atelier Ryza',
  'Trails in the Sky',
  'Trails of Cold Steel',
  'Ys VIII Lacrimosa of Dana',
  'Bloodstained Ritual of the Night',
  'Legend of Mana',
  'Secret of Mana',
  'Tactics Ogre Reborn',
  'Radiant Historia',
  'Live A Live',
  'Soul Hackers 2',
  'Legend of Legaia',
  'Torna the Golden Country',
  'Pathfinder Wrath of the Righteous',
  'Digimon Story Cyber Sleuth',
  'Arc the Lad Twilight of the Spirits',
  'Baldur\'s Gate 3',
  'Divinity Original Sin 2',
  'Dragon\'s Dogma',
  'White Knight Chronicles',
  'Radiant Silvergun',
  'Pokemon Legends Arceus',
];

function pickTitle() {
  return TITLES[Math.floor(Math.random() * TITLES.length)];
}

function getLettersInTitle(title) {
  return new Set(title.toUpperCase().replace(/[^A-Z]/g, '').split(''));
}

function getWordDisplay(title, guessed) {
  return title
    .toUpperCase()
    .split('')
    .map(ch => (/[A-Z]/.test(ch) ? (guessed.has(ch) ? ch : '_') : ch))
    .join(' ');
}

function isComplete(title, guessed) {
  for (const l of getLettersInTitle(title)) {
    if (!guessed.has(l)) return false;
  }
  return true;
}

function startGame(userId) {
  const title = pickTitle();
  const state = { title, guessed: new Set(), wrong: new Set(), maxWrong: 6 };
  games.set(userId, state);
  return state;
}

function isHangmanActive(userId) {
  return games.has(userId);
}

function processGuess(userId, letter) {
  const state = games.get(userId);
  if (!state) return null;
  const upper = letter.toUpperCase();
  if (state.guessed.has(upper) || state.wrong.has(upper)) return { type: 'already_guessed', state };
  if (state.title.toUpperCase().includes(upper)) {
    state.guessed.add(upper);
    if (isComplete(state.title, state.guessed)) { games.delete(userId); return { type: 'win', state }; }
    return { type: 'correct', state };
  }
  state.wrong.add(upper);
  if (state.wrong.size >= state.maxWrong) { games.delete(userId); return { type: 'lose', state }; }
  return { type: 'wrong', state };
}

function buildStatusMessage(state, resultType) {
  const display = getWordDisplay(state.title, state.guessed);
  const wrongArr = [...state.wrong].sort().join('  ');
  const wrongCount = state.wrong.size;
  const lives = state.maxWrong - wrongCount;
  const art = HANGMAN_ART[Math.min(wrongCount, 6)];

  const HEADERS = {
    start:          '🎮 Nouveau pendu — RPG/JRPG',
    correct:        '✅ Bonne lettre !',
    wrong:          '❌ Raté...',
    already_guessed:'🔄 Déjà proposée !',
    win:            '🏆 GAGNÉ !',
    lose:           '💀 PERDU !',
  };

  let msg = `${HEADERS[resultType] || ''}\n\n${art}\n\n`;
  msg += `📺 **Titre :** \`${display}\`\n`;
  if (wrongArr) msg += `❌ **Lettres ratées :** \`${wrongArr}\`\n`;
  msg += `❤️ **Vies :** ${lives}/${state.maxWrong}`;
  if (resultType === 'lose') msg += `\n\n💡 La réponse était : **${state.title}**`;
  return msg;
}

async function getBraineeReaction(type, title) {
  const prompts = {
    win:  `Tu es Brainee, IA gaming 24 ans, chaotique et internet-native. L'owner vient de trouver "${title}" au pendu RPG. Réaction courte (max 12 mots), enthousiaste, dans ton style.`,
    lose: `Tu es Brainee, IA gaming 24 ans. L'owner vient de perdre au pendu RPG, le titre était "${title}". Réaction courte (max 12 mots), légèrement railleuse mais sympa.`,
  };
  if (!prompts[type]) return '';
  try {
    const { text } = await callClaude(
      'Tu es Brainee, IA gaming chaotique et internet-native. Réponds ultra court.',
      prompts[type],
      50,
      null,
      'claude-haiku-4-5-20251001'
    );
    return '\n\n' + text;
  } catch (_) { return ''; }
}

async function handleHangmanDm(message, content) {
  const userId = message.author.id;
  const lower = content.toLowerCase().trim();

  if (lower === '!pendu stop') {
    if (games.has(userId)) {
      const { title } = games.get(userId);
      games.delete(userId);
      await message.reply(`🛑 Partie abandonnée. La réponse était : **${title}**`);
    } else {
      await message.reply('Pas de partie en cours. Tape `!pendu` pour commencer !');
    }
    return;
  }

  if (lower === '!pendu') {
    if (games.has(userId)) games.delete(userId);
    const state = startGame(userId);
    const msg = buildStatusMessage(state, 'start');
    await message.reply(`${msg}\n\n💡 Envoie une lettre pour jouer · \`!pendu stop\` pour abandonner.`);
    pushLog('SYS', `🎮 Pendu démarré → ${message.author.username} [${state.title}]`);
    return;
  }

  // Deviner une lettre
  if (/^[a-zA-Z]$/.test(content.trim())) {
    if (!games.has(userId)) {
      await message.reply('Pas de partie en cours. Tape `!pendu` pour en lancer une !');
      return;
    }
    await simulateDmTyping(message.channel, 300);
    const result = processGuess(userId, content.trim());
    const msg = buildStatusMessage(result.state, result.type);
    if (result.type === 'win' || result.type === 'lose') {
      const reaction = await getBraineeReaction(result.type, result.state.title);
      await message.reply(msg + reaction);
      pushLog('SYS', `🎮 Pendu ${result.type === 'win' ? 'GAGNÉ' : 'PERDU'} → ${message.author.username} [${result.state.title}]`);
    } else {
      await message.reply(msg);
    }
  }
}

module.exports = { handleHangmanDm, isHangmanActive };
