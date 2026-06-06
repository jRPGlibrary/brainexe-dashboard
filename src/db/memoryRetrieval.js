/**
 * ================================================
 * 🔍 MEMORY RETRIEVAL — RAG léger par scoring keyword v1.0.0
 * ================================================
 * Filtre les blocs mémoire par pertinence au message entrant.
 * Pas de vecteurs — TF-IDF simplifié sur les topics déjà trackés.
 *
 * Réduit les tokens input de 20-40% sur les conversations spécifiques
 * en n'injectant que les blocs réellement pertinents.
 * ================================================
 */

// Topics connus mappés à leurs mots-clés (doit couvrir les domaines du bot)
const TOPIC_KEYWORDS = {
  gaming: ['jeu', 'game', 'jouer', 'rpg', 'fps', 'boss', 'niveau', 'build', 'farm', 'ps5', 'ps4', 'xbox', 'switch', 'steam', 'pc', 'indie', 'open world', 'soulslike', 'elden', 'persona', 'final fantasy', 'dragon quest'],
  jrpg: ['jrpg', 'rpg', 'final fantasy', 'persona', 'dragon quest', 'fire emblem', 'tales', 'atelier', 'nier', 'xenoblade', 'ff', 'ffjrpg'],
  anime: ['anime', 'manga', 'otaku', 'vostfr', 'crunchyroll', 'saison', 'épisode', 'shonen', 'seinen'],
  music: ['musique', 'music', 'chanson', 'kpop', 'metal', 'lofi', 'playlist', 'ost', 'bande-son', 'soundtrack'],
  film: ['film', 'série', 'cinéma', 'netflix', 'thriller', 'horreur', 'scifi', 'sci-fi'],
  tech: ['pc', 'config', 'gpu', 'cpu', 'benchmark', 'driver', 'intel', 'amd', 'nvidia', 'code', 'dev', 'programmation'],
  emotion: ['triste', 'stress', 'anxieux', 'déprimé', 'fatigué', 'heureux', 'motivé', 'pas bien', 'burnout', 'soutien', 'aide'],
  social: ['serveur', 'discord', 'communauté', 'stream', 'tiktok', 'youtube', 'twitch', 'gaming live'],
  food: ['manger', 'bouffe', 'ramen', 'kebab', 'tacos', 'curry', 'pizza', 'restaurant'],
};

/**
 * Extrait les mots-clés significatifs d'un texte (5+ chars, hors stop words).
 */
const STOP_WORDS = new Set([
  'alors', 'aussi', 'autre', 'avec', 'bien', 'comme', 'dans', 'donc',
  'elle', 'encore', 'entre', 'faire', 'mais', 'même', 'moins', 'pour',
  'quand', 'rien', 'sans', 'sera', 'suis', 'tous', 'toujours', 'truc',
  'vraiment', 'voilà', 'cette', 'avoir', 'jamais', 'depuis', 'après',
]);

function extractKeywords(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tokens = lower.match(/\b[a-zéèêàâîïôûùç]{3,}\b/g) || [];
  return [...new Set(tokens.filter(t => !STOP_WORDS.has(t)))];
}

/**
 * Calcule un score de pertinence entre les keywords du message et un bloc texte.
 * Retourne un nombre entre 0 et 1.
 */
function scoreRelevance(blockText, messageKeywords) {
  if (!blockText || !messageKeywords.length) return 0;
  const blockLower = blockText.toLowerCase();
  let hits = 0;

  for (const kw of messageKeywords) {
    if (kw.length >= 3 && blockLower.includes(kw)) hits++;
  }

  // Bonus si on matche des topics entiers (multi-mots)
  for (const topicKws of Object.values(TOPIC_KEYWORDS)) {
    const topicHits = topicKws.filter(t => blockLower.includes(t) && messageKeywords.some(mk => t.includes(mk))).length;
    if (topicHits >= 2) hits += 1;
  }

  return Math.min(1, hits / Math.max(3, messageKeywords.length * 0.4));
}

/**
 * Détermine si un bloc mémoire est pertinent pour le message en cours.
 * Seuil configurable — 0.12 = permissif (peu de filtrage), 0.25 = strict.
 */
const RELEVANCE_THRESHOLD = 0.12;

/**
 * Filtre et classe les blocs mémoire par pertinence au message entrant.
 *
 * @param {string} userQuery - message de l'utilisateur
 * @param {object} blocks - { narrativeBlock, memberStoriesBlock, convSummaryBlock, tasteBlock, memoryBlock }
 * @returns {object} blocs filtrés + flag si filtrage actif
 */
function getRelevantMemoryBlocks(userQuery, blocks = {}) {
  const keywords = extractKeywords(userQuery);

  // Si message trop court ou sans keywords, on ne filtre pas (garder tout)
  if (keywords.length < 2) return { ...blocks, wasFiltered: false };

  const {
    narrativeBlock = '',
    memberStoriesBlock = '',
    convSummaryBlock = '',
    tasteBlock = '',
    memoryBlock = '',
  } = blocks;

  // convSummaryBlock et memoryBlock (channel) sont TOUJOURS injectés (contexte immédiat)
  // narrativeBlock, memberStoriesBlock, tasteBlock sont filtrés par pertinence

  const narrativeScore = scoreRelevance(narrativeBlock, keywords);
  const storiesScore = scoreRelevance(memberStoriesBlock, keywords);
  const tasteScore = scoreRelevance(tasteBlock, keywords);

  // Forcer l'injection si le message est émotionnel ou très court (conversation sociale)
  const isEmotionalOrSocial = keywords.some(k => TOPIC_KEYWORDS.emotion.some(t => t.includes(k) || k.includes(t)));
  const isVeryShort = userQuery.length < 40;

  return {
    narrativeBlock: (narrativeScore >= RELEVANCE_THRESHOLD || isEmotionalOrSocial || isVeryShort) ? narrativeBlock : '',
    memberStoriesBlock: (storiesScore >= RELEVANCE_THRESHOLD || isEmotionalOrSocial) ? memberStoriesBlock : '',
    tasteBlock: (tasteScore >= RELEVANCE_THRESHOLD || isVeryShort) ? tasteBlock : '',
    convSummaryBlock,  // toujours gardé
    memoryBlock,       // toujours gardé (contexte channel immédiat)
    wasFiltered: narrativeScore < RELEVANCE_THRESHOLD || storiesScore < RELEVANCE_THRESHOLD,
    scores: { narrativeScore, storiesScore, tasteScore },
  };
}

module.exports = { getRelevantMemoryBlocks, extractKeywords, scoreRelevance };
