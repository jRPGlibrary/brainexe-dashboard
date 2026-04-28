/**
 * ================================================
 * 🎯 TASTE PROFILE v2.3.4
 * ================================================
 * Track les goûts précis de chaque membre, au-delà du `preferences`
 * basique de memberProfiles.
 *
 * Track :
 *   - games[]      : titres mentionnés avec un score (love / dislike / neutral)
 *   - genres{}     : genres préférés (jrpg, soulslike, metroidvania...) avec poids
 *   - vibes[]      : "chill", "intense", "narratif", "chaotique"...
 *   - avoidances[] : ce que la personne dit ne PAS aimer
 *   - recommended[] : ce que Brainee a recommandé à cette personne (pour ne pas répéter)
 *
 * Permet à Brainee de :
 *   - Recommander avec confiance ("vu que t'as kiffé X, t'aimerais Y")
 *   - Connecter des membres ("toi et @Y partagez Z")
 *   - Ne pas re-recommander la même chose
 *   - Référencer le goût sans nommer le système ("toi t'es plutôt [vibe]")
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');
const { GAMING_KEYWORDS, THREAD_TRIGGERS } = require('../bot/keywords');

const COLLECTION = 'tasteProfiles';
const MAX_GAMES = 40;
const MAX_RECOMMENDED = 30;

// Genres reconnaissables (extension de THREAD_TRIGGERS)
const GENRE_PATTERNS = {
  jrpg: ['jrpg', 'final fantasy', 'persona', 'dragon quest', 'tales of', 'chrono', 'xenoblade', 'star ocean', 'fire emblem'],
  metroidvania: ['metroidvania', 'metroid', 'castlevania', 'hollow knight', 'blasphemous', 'ori', 'axiom verge', 'dead cells', 'symphony of the night'],
  soulslike: ['soulslike', 'dark souls', 'elden ring', 'sekiro', 'bloodborne', 'lies of p', 'nioh'],
  rpg_western: ['baldur', 'divinity', 'pathfinder', 'pillars of eternity', 'planescape', 'fallout', 'witcher', 'mass effect'],
  retro: ['retro', 'snes', 'megadrive', 'mega drive', 'game boy', 'nes', 'ps1', 'arcade'],
  indie: ['indie', 'stardew', 'celeste', 'hades', 'undertale', 'disco elysium', 'cuphead', 'shovel knight'],
  action_platformer: ['mega man', 'megaman', 'shovel knight', 'celeste', 'cuphead'],
  open_world: ['open world', 'open-world', 'breath of the wild', 'totk', 'witcher 3', 'cyberpunk', 'rdr', 'gta'],
  horror: ['silent hill', 'resident evil', 'horror', 'amnesia', 'outlast'],
  visual_novel: ['ace attorney', 'danganronpa', 'zero escape', 'visual novel', 'vn '],
};

// Vibes textuelles (mots clés détectables)
const VIBE_PATTERNS = {
  chill:     ['chill', 'cosy', 'cosy gaming', 'détente', 'relax', 'tranquille', 'apaisant'],
  intense:   ['intense', 'hardcore', 'tryhard', 'difficile', 'challenge', 'rage', 'punitif'],
  narratif:  ['histoire', 'story', 'narratif', 'lore', 'scénar', 'récit', 'écriture'],
  chaotique: ['chaos', 'délire', 'random', 'absurde', 'wtf', 'fou'],
  esthetique: ['esthétique', 'pixel art', 'art', 'beau', 'visuel', 'da', 'direction artistique'],
  mecanique: ['gameplay', 'mécanique', 'combat system', 'build', 'theorycraft', 'combo', 'stats'],
};

// Sentiments (positif/négatif détectés autour d'une mention)
const POSITIVE_MARKERS = [
  'adore', 'kiffe', 'kiff', 'aime', 'love', 'génial', 'incroyable', 'top', 'parfait',
  'excellent', 'fou', 'ouf', 'banger', 'gem', 'masterpiece', 'chef-d\'œuvre', "gros coup de coeur",
  '😍', '🔥', '💯', "j'adore", 'meilleur',
];
const NEGATIVE_MARKERS = [
  'déteste', 'aime pas', 'beurk', 'nul', 'chiant', 'décevant', 'décu', 'déçu',
  'pas terrible', 'mauvais', 'overrated', 'pète les noix', 'horrible', 'pourri', 'rate',
];
const AVOID_MARKERS = [
  'jamais', "j'évite", 'évite', 'pas mon truc', "c'est pas pour moi", 'supporte pas',
  "j'accroche pas", 'j\'arrive pas à rentrer dans',
];

// ─── DETECTION ───────────────────────────────────────────────────
function detectTasteSignals(content = '') {
  const text = (content || '').toLowerCase();
  if (text.length < 6) return null;

  const signals = {
    games: [],       // [{ title, sentiment }]
    genres: [],      // [{ genre, weight }]
    vibes: [],       // [vibe]
    avoidances: [],  // [string]
  };

  // Sentiment global du message — le négatif gagne (ex : "j'aime pas" contient "aime")
  const isNegative = NEGATIVE_MARKERS.some(m => text.includes(m));
  const isPositive = !isNegative && POSITIVE_MARKERS.some(m => text.includes(m));
  const isAvoid = AVOID_MARKERS.some(m => text.includes(m));

  // GAMES — on cherche les triggers connus
  const foundGames = new Set();
  for (const trig of THREAD_TRIGGERS) {
    if (text.includes(trig.toLowerCase())) foundGames.add(trig);
  }
  for (const game of foundGames) {
    let sentiment = 'neutral';
    if (isNegative) sentiment = 'dislike';
    else if (isPositive) sentiment = 'love';
    signals.games.push({ title: game, sentiment });
  }

  // GENRES
  for (const [genre, kws] of Object.entries(GENRE_PATTERNS)) {
    if (kws.some(kw => text.includes(kw))) {
      let weight = 1;
      if (isPositive) weight = 2;
      else if (isNegative) weight = -1;
      signals.genres.push({ genre, weight });
    }
  }

  // VIBES
  for (const [vibe, kws] of Object.entries(VIBE_PATTERNS)) {
    if (kws.some(kw => text.includes(kw))) {
      signals.vibes.push(vibe);
    }
  }

  // AVOIDANCES
  if (isAvoid) {
    // Capture la chose évitée — heuristique simple
    const avoidMatch = text.match(/(?:j'évite|évite|pas mon truc|supporte pas|jamais)\s+([a-zàâéèêëîïôöùûüç' \-]{3,40})/i);
    if (avoidMatch && avoidMatch[1]) {
      signals.avoidances.push(avoidMatch[1].trim().slice(0, 50));
    }
  }

  if (
    signals.games.length === 0 &&
    signals.genres.length === 0 &&
    signals.vibes.length === 0 &&
    signals.avoidances.length === 0
  ) return null;

  return signals;
}

// ─── CRUD ────────────────────────────────────────────────────────
async function getTasteProfile(userId) {
  if (!shared.mongoDb) return null;
  try {
    return await shared.mongoDb.collection(COLLECTION).findOne({ userId });
  } catch (err) {
    pushLog('ERR', `getTasteProfile: ${err.message}`, 'error');
    return null;
  }
}

async function updateTasteFromMessage(userId, username, content) {
  if (!shared.mongoDb) return null;
  const signals = detectTasteSignals(content);
  if (!signals) return null;

  try {
    const existing = await getTasteProfile(userId) || {
      userId,
      username,
      games: [],
      genres: {},
      vibes: {},
      avoidances: [],
      recommended: [],
    };

    // Merge games (titre = clef)
    for (const g of signals.games) {
      const idx = existing.games.findIndex(x => x.title === g.title);
      if (idx >= 0) {
        const cur = existing.games[idx];
        // Score : love=+2, neutral=+1, dislike=-2
        const delta = g.sentiment === 'love' ? 2 : g.sentiment === 'dislike' ? -2 : 1;
        cur.score = Math.max(-10, Math.min(20, (cur.score || 0) + delta));
        cur.mentions = (cur.mentions || 0) + 1;
        cur.lastMention = new Date();
        if (g.sentiment === 'love') cur.sentiment = 'love';
        else if (g.sentiment === 'dislike' && cur.sentiment !== 'love') cur.sentiment = 'dislike';
      } else {
        existing.games.push({
          title: g.title,
          sentiment: g.sentiment,
          score: g.sentiment === 'love' ? 2 : g.sentiment === 'dislike' ? -2 : 1,
          mentions: 1,
          firstMention: new Date(),
          lastMention: new Date(),
        });
      }
    }
    // Trim
    if (existing.games.length > MAX_GAMES) {
      existing.games = existing.games
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, MAX_GAMES);
    }

    // Merge genres (poids cumulatif borné)
    if (!existing.genres || typeof existing.genres !== 'object') existing.genres = {};
    for (const { genre, weight } of signals.genres) {
      const cur = existing.genres[genre] || 0;
      existing.genres[genre] = Math.max(-15, Math.min(50, cur + weight));
    }

    // Merge vibes (compteur)
    if (!existing.vibes || typeof existing.vibes !== 'object') existing.vibes = {};
    for (const v of signals.vibes) {
      existing.vibes[v] = (existing.vibes[v] || 0) + 1;
    }

    // Avoidances (set unique borné)
    if (!Array.isArray(existing.avoidances)) existing.avoidances = [];
    for (const a of signals.avoidances) {
      if (!existing.avoidances.includes(a)) existing.avoidances.push(a);
    }
    if (existing.avoidances.length > 15) existing.avoidances = existing.avoidances.slice(-15);

    existing.username = username;
    existing.updatedAt = new Date();

    await shared.mongoDb.collection(COLLECTION).updateOne(
      { userId },
      { $set: existing },
      { upsert: true }
    );

    return existing;
  } catch (err) {
    pushLog('ERR', `updateTasteFromMessage: ${err.message}`, 'error');
    return null;
  }
}

// ─── RECOMMENDATIONS TRACKING ────────────────────────────────────
// Permet à Brainee de noter ce qu'elle a déjà recommandé pour ne pas répéter.
async function noteRecommendation(userId, title, context = '') {
  if (!shared.mongoDb || !title) return;
  try {
    const profile = await getTasteProfile(userId);
    if (!profile) return;
    const recommended = Array.isArray(profile.recommended) ? profile.recommended : [];
    if (recommended.find(r => r.title.toLowerCase() === title.toLowerCase())) return;
    recommended.push({ title, context: context.slice(0, 100), date: new Date() });
    if (recommended.length > MAX_RECOMMENDED) recommended.shift();
    await shared.mongoDb.collection(COLLECTION).updateOne(
      { userId },
      { $set: { recommended, updatedAt: new Date() } }
    );
  } catch (err) {
    pushLog('ERR', `noteRecommendation: ${err.message}`, 'error');
  }
}

// ─── INJECTION POUR PROMPT ───────────────────────────────────────
function formatTasteBlock(profile, username) {
  if (!profile) return '';
  const parts = [];

  // Top games (love)
  if (Array.isArray(profile.games) && profile.games.length) {
    const loved = profile.games.filter(g => g.sentiment === 'love' && (g.score || 0) >= 2)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map(g => g.title);
    const disliked = profile.games.filter(g => g.sentiment === 'dislike')
      .slice(0, 3)
      .map(g => g.title);
    if (loved.length) parts.push(`Adore : ${loved.join(', ')}`);
    if (disliked.length) parts.push(`Pas fan de : ${disliked.join(', ')}`);
  }

  // Top genres
  if (profile.genres && typeof profile.genres === 'object') {
    const topGenres = Object.entries(profile.genres)
      .filter(([_, w]) => w >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([g]) => g.replace(/_/g, ' '));
    if (topGenres.length) parts.push(`Genres préférés : ${topGenres.join(', ')}`);
  }

  // Top vibes
  if (profile.vibes && typeof profile.vibes === 'object') {
    const topVibes = Object.entries(profile.vibes)
      .filter(([_, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([v]) => v);
    if (topVibes.length) parts.push(`Vibes recherchées : ${topVibes.join(', ')}`);
  }

  // Avoidances
  if (Array.isArray(profile.avoidances) && profile.avoidances.length) {
    parts.push(`Évite : ${profile.avoidances.slice(-3).join(', ')}`);
  }

  // Déjà recommandé (pour ne pas répéter)
  if (Array.isArray(profile.recommended) && profile.recommended.length) {
    const recent = profile.recommended.slice(-5).map(r => r.title);
    parts.push(`Déjà conseillé par toi : ${recent.join(', ')} — évite de re-recommander pareil sauf demande explicite.`);
  }

  if (!parts.length) return '';

  return `🎯 GOÛTS DE ${username.toUpperCase()} :
${parts.map(p => `   • ${p}`).join('\n')}
Si tu recommandes : appuie-toi sur ces goûts ("vu que t'as kiffé X..."). Pas d'inventaire, juste utilise quand pertinent.`;
}

// ─── HELPERS POUR CONNEXION ENTRE MEMBRES ───────────────────────
async function findCommonTaste(userIdA, userIdB) {
  const a = await getTasteProfile(userIdA);
  const b = await getTasteProfile(userIdB);
  if (!a || !b) return null;
  const lovedA = new Set((a.games || []).filter(g => g.sentiment === 'love').map(g => g.title.toLowerCase()));
  const lovedB = new Set((b.games || []).filter(g => g.sentiment === 'love').map(g => g.title.toLowerCase()));
  const sharedGames = [...lovedA].filter(t => lovedB.has(t));
  const sharedGenres = Object.keys(a.genres || {}).filter(g =>
    (a.genres[g] || 0) >= 3 && (b.genres?.[g] || 0) >= 3
  );
  return { sharedGames, sharedGenres };
}

module.exports = {
  detectTasteSignals,
  getTasteProfile,
  updateTasteFromMessage,
  noteRecommendation,
  formatTasteBlock,
  findCommonTaste,
};
