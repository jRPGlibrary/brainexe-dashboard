const { TAVILY_API_KEY } = require('../config');
const { pushLog } = require('../logger');

const TAVILY_TIMEOUT_MS = 8000;

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

    pushLog('DBG', `Tavily: ${results.length} résultat(s) pour "${query}"`, 'debug');
    return results;
  } catch (err) {
    clearTimeout(timer);
    pushLog('DBG', `Tavily erreur: ${err.message}`, 'debug');
    throw err;
  }
}

async function gamingNewsToolHandler(toolName, toolInput) {
  if (toolName !== 'rechercher_actu_gaming') return JSON.stringify({ error: 'Outil inconnu' });

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
    // Fallback: Claude répondra avec ses propres connaissances
    return JSON.stringify({
      error: err.message,
      fallback: true,
      instruction: "La recherche web a échoué. Réponds avec tes propres connaissances en précisant que tu n'as pas accès au web en ce moment.",
    });
  }
}

module.exports = { searchGamingNews, gamingNewsToolHandler, GAMING_NEWS_TOOL };
