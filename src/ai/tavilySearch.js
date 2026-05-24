const { TAVILY_API_KEY, IGDB_API_KEY, IGDB_CLIENT_ID, GOOGLE_CSE_API_KEY, GOOGLE_CSE_CX } = require('../config');
const { pushLog } = require('../logger');

const TAVILY_TIMEOUT_MS = 8000;
const IGDB_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_SIZE = 50;

// Cache LRU simple : Map préserve l'ordre d'insertion → le premier = le plus vieux
const searchCache = new Map();

function getCacheKey(query) {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCached(query) {
  const key = getCacheKey(query);
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  // Rafraîchit la position LRU (delete + re-set)
  searchCache.delete(key);
  searchCache.set(key, entry);
  return entry.results;
}

function setCache(query, results) {
  const key = getCacheKey(query);
  if (searchCache.size >= CACHE_MAX_SIZE) {
    searchCache.delete(searchCache.keys().next().value);
  }
  searchCache.set(key, { results, timestamp: Date.now() });
}

function getCacheStats() {
  return { size: searchCache.size, maxSize: CACHE_MAX_SIZE, ttlMin: CACHE_TTL_MS / 60000 };
}

// ─── OUTIL 1 : Tavily — actualités gaming temps réel ────────────────────────

const GAMING_NEWS_TOOL = {
  name: 'rechercher_actu_gaming',
  description: "Recherche des actualités gaming récentes sur internet en temps réel. Utiliser quand quelqu'un demande des infos récentes sur un jeu, une annonce, une sortie, un événement gaming, un leak ou l'actualité du moment. Ne pas utiliser pour des questions sur l'histoire ou des faits établis.",
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Requête de recherche optimisée (ex: "GTA VI release date 2025", "Elden Ring DLC news", "Nintendo Direct juin 2025")',
      },
    },
    required: ['query'],
  },
};

async function searchGamingNews(query) {
  if (!TAVILY_API_KEY) throw new Error('TAVILY_API_KEY manquante');

  const cached = getCached(query);
  if (cached) {
    pushLog('DBG', `Tavily cache hit pour "${query}" (${searchCache.size} entrées)`, 'debug');
    return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `gaming ${query}`,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
        include_domains: [
          'ign.com', 'gamespot.com', 'eurogamer.net', 'kotaku.com',
          'jeuxvideo.com', 'gamekult.com', 'pcgamer.com',
          'rockpapershotgun.com', 'destructoid.com', 'polygon.com',
          'thegamer.com', 'vg247.com', 'gamesradar.com',
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Tavily ${res.status}: ${res.statusText}`);
    const data = await res.json();

    const results = (data.results || []).map(r => ({
      title: r.title || '',
      url: r.url || '',
      snippet: (r.content || '').slice(0, 350),
      publishedDate: r.published_date || null,
    }));

    setCache(query, results);
    pushLog('DBG', `Tavily: ${results.length} résultat(s) pour "${query}" → mis en cache`, 'debug');
    return results;
  } catch (err) {
    clearTimeout(timer);
    pushLog('DBG', `Tavily erreur: ${err.message}`, 'debug');
    throw err;
  }
}

// ─── OUTIL 2 : IGDB — fiche jeu précise ─────────────────────────────────────

const IGDB_GAME_TOOL = {
  name: 'rechercher_jeu_igdb',
  description: "Recherche la fiche officielle d'un jeu vidéo : date de sortie, plateformes, genres, note, développeur. Utiliser quand quelqu'un demande des infos précises sur un jeu spécifique (pas les actus du moment). Exemples : 'c'est sorti quand ?', 'sur quelles plateformes ?', 'c'est quel genre ?', 'qui a fait ce jeu ?'.",
  input_schema: {
    type: 'object',
    properties: {
      game_name: {
        type: 'string',
        description: "Nom exact ou approché du jeu (ex: 'Elden Ring', 'The Last of Us Part II', 'Zelda Tears of the Kingdom')",
      },
    },
    required: ['game_name'],
  },
};

async function searchIGDB(gameName) {
  if (!IGDB_API_KEY || !IGDB_CLIENT_ID) throw new Error('Clés IGDB manquantes');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IGDB_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': `Bearer ${IGDB_API_KEY}`,
        'Accept': 'application/json',
      },
      body: `search "${gameName}"; fields name, summary, release_dates.human, release_dates.platform.name, platforms.name, genres.name, involved_companies.company.name, involved_companies.developer, rating, slug; limit 3;`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`IGDB ${res.status}: ${res.statusText}`);
    const games = await res.json();

    return games
      .filter(g => g?.name)
      .map(g => {
        const devs = (g.involved_companies || [])
          .filter(c => c.developer)
          .map(c => c.company?.name)
          .filter(Boolean);
        const platforms = (g.platforms || []).map(p => p.name).filter(Boolean);
        const genres = (g.genres || []).map(g2 => g2.name).filter(Boolean);
        const releaseDate = g.release_dates?.[0]?.human || null;
        const rating = g.rating ? `${Math.round(g.rating)}/100` : null;

        return {
          name: g.name,
          summary: (g.summary || '').slice(0, 300),
          releaseDate,
          platforms,
          genres,
          developers: devs,
          rating,
          url: `https://www.igdb.com/games/${g.slug || g.id}`,
        };
      });
  } catch (err) {
    clearTimeout(timer);
    pushLog('DBG', `IGDB erreur: ${err.message}`, 'debug');
    throw err;
  }
}

// ─── OUTIL 3 : Tavily — soluces, guides, astuces ────────────────────────────

const GAMING_HELP_TOOL = {
  name: 'rechercher_aide_gaming',
  description: "Recherche des soluces, guides, walkthroughs, astuces et conseils pour les jeux vidéo. Utiliser quand quelqu'un demande de l'aide pour passer un niveau, battre un boss, trouver un objet, comprendre les mécaniques d'un jeu, ou veut des conseils stratégiques. Fonctionne pour tous les types de jeux : rétro, indie, AAA, next-gen.",
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: "Requête ciblée incluant le nom du jeu et le problème précis (ex: 'Elden Ring comment battre Malenia', 'Hollow Knight boss Hornet stratégie', 'Zelda TOTK puzzle temple du vent', 'Pokemon guide débutant')",
      },
    },
    required: ['query'],
  },
};

async function searchGamingHelp(query) {
  if (!TAVILY_API_KEY) throw new Error('TAVILY_API_KEY manquante');

  const cacheKey = `help:${query}`;
  const cached = getCached(cacheKey);
  if (cached) {
    pushLog('DBG', `Tavily help cache hit pour "${query}"`, 'debug');
    return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        include_answer: false,
        include_raw_content: false,
        max_results: 6,
        include_domains: [
          'reddit.com', 'gamefaqs.gamespot.com', 'fandom.com',
          'powerpyx.com', 'thegamer.com', 'ign.com',
          'gamespot.com', 'gamesradar.com', 'pcgamer.com',
          'trueachievements.com', 'retroachievements.org', 'gameinformer.com',
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Tavily ${res.status}: ${res.statusText}`);
    const data = await res.json();

    const results = (data.results || []).map(r => ({
      title: r.title || '',
      url: r.url || '',
      snippet: (r.content || '').slice(0, 500),
      source: (r.url || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || 'web',
    }));

    setCache(cacheKey, results);
    pushLog('DBG', `Tavily help: ${results.length} résultat(s) pour "${query}" → mis en cache`, 'debug');
    return results;
  } catch (err) {
    clearTimeout(timer);
    pushLog('DBG', `Tavily help erreur: ${err.message}`, 'debug');
    throw err;
  }
}

// ─── OUTIL 4 : Google Custom Search — 20 sites gaming de référence ──────────

const GOOGLE_GAMING_TOOL = {
  name: 'rechercher_google_gaming',
  description: "Recherche gaming ciblée sur 20 sites de référence via Google : jeuxvideo.com, gamekult.com, gameblog.fr, gamergen.com, actugaming.net, millenium.org, puissance-nintendo.com, switchactu.fr, nintendolife.com, pushsquare.com, purexbox.com, retronauts.com, hardcoregamer.com, digitaltrends.com, pcinvasion.com, thesixthaxis.com, godisageek.com, metacritic.com, ign.com, gamespot.com. Utiliser en complément de Tavily pour des résultats FR ou des sites de niche spécialisés.",
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: "Requête de recherche (ex: 'Zelda TOTK test jeuxvideo', 'GTA VI date sortie PS5', 'meilleur RPG Switch 2025', 'Elden Ring soluce boss')",
      },
    },
    required: ['query'],
  },
};

async function searchGoogleGaming(query) {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) throw new Error('Clés Google CSE manquantes');

  const cacheKey = `google:${query}`;
  const cached = getCached(cacheKey);
  if (cached) {
    pushLog('DBG', `Google CSE cache hit pour "${query}"`, 'debug');
    return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(query)}&num=8`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Google CSE ${res.status}: ${res.statusText}`);
    const data = await res.json();

    const results = (data.items || []).map(item => ({
      title: item.title || '',
      url: item.link || '',
      snippet: (item.snippet || '').slice(0, 400),
      source: (item.link || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || 'web',
    }));

    setCache(cacheKey, results);
    pushLog('DBG', `Google CSE: ${results.length} résultat(s) pour "${query}" → mis en cache`, 'debug');
    return results;
  } catch (err) {
    clearTimeout(timer);
    pushLog('DBG', `Google CSE erreur: ${err.message}`, 'debug');
    throw err;
  }
}

// ─── Handler unifié — reçoit les quatre outils ──────────────────────────────

async function gamingToolHandler(toolName, toolInput) {
  if (toolName === 'rechercher_actu_gaming') {
    try {
      const results = await searchGamingNews(toolInput.query || '');
      if (!results.length) return 'Aucun résultat trouvé pour cette recherche.';

      return results.map((r, i) => {
        const date = r.publishedDate
          ? ` (${new Date(r.publishedDate).toLocaleDateString('fr-FR')})`
          : '';
        return `${i + 1}. ${r.title}${date}\n${r.snippet}\nURL: ${r.url}`;
      }).join('\n\n');
    } catch (err) {
      return JSON.stringify({
        error: err.message,
        fallback: true,
        instruction: "La recherche web a échoué. Réponds avec tes propres connaissances en précisant que tu n'as pas accès au web en ce moment.",
      });
    }
  }

  if (toolName === 'rechercher_jeu_igdb') {
    try {
      const games = await searchIGDB(toolInput.game_name || '');
      if (!games.length) return `Aucun jeu trouvé pour "${toolInput.game_name}".`;

      return games.map(g => {
        const lines = [`🎮 **${g.name}**`];
        if (g.releaseDate) lines.push(`📅 Sortie : ${g.releaseDate}`);
        if (g.platforms.length) lines.push(`🖥️ Plateformes : ${g.platforms.join(', ')}`);
        if (g.genres.length) lines.push(`🏷️ Genres : ${g.genres.join(', ')}`);
        if (g.developers.length) lines.push(`🏗️ Développeur : ${g.developers.join(', ')}`);
        if (g.rating) lines.push(`⭐ Note : ${g.rating}`);
        if (g.summary) lines.push(`📝 ${g.summary}`);
        lines.push(`🔗 ${g.url}`);
        return lines.join('\n');
      }).join('\n\n---\n\n');
    } catch (err) {
      return JSON.stringify({
        error: err.message,
        fallback: true,
        instruction: "La base de données IGDB est inaccessible. Réponds avec tes propres connaissances.",
      });
    }
  }

  if (toolName === 'rechercher_aide_gaming') {
    try {
      const results = await searchGamingHelp(toolInput.query || '');
      if (!results.length) return 'Aucun guide ou soluce trouvé pour cette recherche.';

      return results.map((r, i) =>
        `${i + 1}. [${r.source}] ${r.title}\n${r.snippet}`
      ).join('\n\n');
    } catch (err) {
      return JSON.stringify({
        error: err.message,
        fallback: true,
        instruction: "La recherche de guide a échoué. Réponds avec tes propres connaissances en précisant que tu n'as pas accès au web en ce moment.",
      });
    }
  }

  if (toolName === 'rechercher_google_gaming') {
    try {
      const results = await searchGoogleGaming(toolInput.query || '');
      if (!results.length) return 'Aucun résultat Google CSE trouvé pour cette recherche.';

      return results.map((r, i) =>
        `${i + 1}. [${r.source}] ${r.title}\n${r.snippet}\nURL: ${r.url}`
      ).join('\n\n');
    } catch (err) {
      return JSON.stringify({
        error: err.message,
        fallback: true,
        instruction: "Google Custom Search est inaccessible. Réponds avec tes propres connaissances.",
      });
    }
  }

  return JSON.stringify({ error: 'Outil inconnu' });
}

// Liste des outils disponibles selon les clés présentes
function getAvailableTools() {
  const tools = [];
  if (TAVILY_API_KEY) tools.push(GAMING_NEWS_TOOL, GAMING_HELP_TOOL);
  if (IGDB_API_KEY && IGDB_CLIENT_ID) tools.push(IGDB_GAME_TOOL);
  if (GOOGLE_CSE_API_KEY && GOOGLE_CSE_CX) tools.push(GOOGLE_GAMING_TOOL);
  return tools;
}

module.exports = {
  searchGamingNews,
  searchIGDB,
  searchGamingHelp,
  searchGoogleGaming,
  gamingToolHandler,
  GAMING_NEWS_TOOL,
  IGDB_GAME_TOOL,
  GAMING_HELP_TOOL,
  GOOGLE_GAMING_TOOL,
  getAvailableTools,
  getCacheStats,
};
