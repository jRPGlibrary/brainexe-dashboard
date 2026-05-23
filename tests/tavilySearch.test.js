/**
 * Tests — src/ai/tavilySearch.js
 * Cache LRU, searchGamingNews, searchIGDB, gamingToolHandler, getAvailableTools
 */

jest.mock('../src/config', () => ({
  TAVILY_API_KEY: 'tvly-test',
  IGDB_API_KEY: 'igdb-test',
  IGDB_CLIENT_ID: 'client-test',
}));

jest.mock('../src/logger', () => ({ pushLog: jest.fn() }));

const {
  searchGamingNews,
  searchIGDB,
  gamingToolHandler,
  getAvailableTools,
  getCacheStats,
  GAMING_NEWS_TOOL,
  IGDB_GAME_TOOL,
} = require('../src/ai/tavilySearch');

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(responseData, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => responseData,
  });
}

function mockFetchError(message) {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

const TAVILY_RESULTS = {
  results: [
    { title: 'GTA VI delayed to 2026', url: 'https://ign.com/gta6', content: 'Rockstar announced...', published_date: '2025-05-01' },
    { title: 'GTA VI new trailer', url: 'https://gamespot.com/gta6', content: 'The second trailer shows...', published_date: '2025-04-15' },
  ],
};

const IGDB_RESULTS = [
  {
    id: 1,
    name: 'Elden Ring',
    slug: 'elden-ring',
    summary: 'An action RPG set in the Lands Between.',
    release_dates: [{ human: 'Feb 25, 2022', platform: { name: 'PC' } }],
    platforms: [{ name: 'PC' }, { name: 'PS5' }],
    genres: [{ name: 'RPG' }, { name: 'Action' }],
    involved_companies: [{ company: { name: 'FromSoftware' }, developer: true }],
    rating: 95,
  },
];

// ── Cache LRU ────────────────────────────────────────────────────────────────

describe('Cache LRU', () => {
  beforeEach(() => {
    // Vider le cache entre les tests en le vidant via une requête réelle
    // On réimporte pour avoir un cache frais... non disponible sans jest.isolateModules
    // On utilise getCacheStats pour vérifier l'état
  });

  test('getCacheStats retourne la structure attendue', () => {
    const stats = getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize', 50);
    expect(stats).toHaveProperty('ttlMin', 30);
  });
});

// ── Schémas des outils ───────────────────────────────────────────────────────

describe('Schémas outils Anthropic', () => {
  test('GAMING_NEWS_TOOL a le bon format', () => {
    expect(GAMING_NEWS_TOOL.name).toBe('rechercher_actu_gaming');
    expect(GAMING_NEWS_TOOL.input_schema.required).toContain('query');
    expect(GAMING_NEWS_TOOL.input_schema.properties).toHaveProperty('query');
  });

  test('IGDB_GAME_TOOL a le bon format', () => {
    expect(IGDB_GAME_TOOL.name).toBe('rechercher_jeu_igdb');
    expect(IGDB_GAME_TOOL.input_schema.required).toContain('game_name');
    expect(IGDB_GAME_TOOL.input_schema.properties).toHaveProperty('game_name');
  });
});

// ── getAvailableTools ────────────────────────────────────────────────────────

describe('getAvailableTools', () => {
  test('retourne les deux outils quand les clés sont présentes', () => {
    const tools = getAvailableTools();
    expect(tools).toHaveLength(2);
    expect(tools.map(t => t.name)).toContain('rechercher_actu_gaming');
    expect(tools.map(t => t.name)).toContain('rechercher_jeu_igdb');
  });
});

// ── searchGamingNews ─────────────────────────────────────────────────────────

describe('searchGamingNews', () => {
  beforeEach(() => jest.clearAllMocks());

  test('retourne les résultats formatés depuis Tavily', async () => {
    mockFetch(TAVILY_RESULTS);
    const results = await searchGamingNews('GTA VI release');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      title: 'GTA VI delayed to 2026',
      url: 'https://ign.com/gta6',
    });
    expect(results[0].snippet).toBeDefined();
    expect(results[0].publishedDate).toBeDefined();
  });

  test('préfixe la requête avec "gaming"', async () => {
    mockFetch(TAVILY_RESULTS);
    await searchGamingNews('GTA VI');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.query).toBe('gaming GTA VI');
  });

  test('lève une erreur si Tavily répond non-ok', async () => {
    mockFetch({}, false, 429);
    await expect(searchGamingNews('test')).rejects.toThrow('Tavily 429');
  });

  test('lève une erreur si fetch échoue (réseau)', async () => {
    mockFetchError('network timeout');
    await expect(searchGamingNews('test query réseau')).rejects.toThrow('network timeout');
  });

  test('utilise le cache sur la deuxième requête identique', async () => {
    mockFetch(TAVILY_RESULTS);
    const q = 'cache-test-unique-' + Date.now();
    await searchGamingNews(q);
    await searchGamingNews(q);
    // fetch ne doit être appelé qu'une seule fois
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('normalise la clé de cache (casse + espaces)', async () => {
    mockFetch(TAVILY_RESULTS);
    const base = 'normalise-test-' + Date.now();
    await searchGamingNews(base);
    await searchGamingNews(base.toUpperCase());
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ── searchIGDB ───────────────────────────────────────────────────────────────

describe('searchIGDB', () => {
  beforeEach(() => jest.clearAllMocks());

  test('retourne les fiches jeu formatées', async () => {
    mockFetch(IGDB_RESULTS);
    const games = await searchIGDB('Elden Ring');
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      name: 'Elden Ring',
      developers: ['FromSoftware'],
      rating: '95/100',
    });
    expect(games[0].platforms).toContain('PC');
    expect(games[0].genres).toContain('RPG');
  });

  test('filtre les jeux sans nom', async () => {
    mockFetch([{ id: 999, summary: 'No name game' }]);
    const games = await searchIGDB('unknown');
    expect(games).toHaveLength(0);
  });

  test('lève une erreur si IGDB répond non-ok', async () => {
    mockFetch({}, false, 503);
    await expect(searchIGDB('Elden Ring')).rejects.toThrow('IGDB 503');
  });
});

// ── gamingToolHandler ────────────────────────────────────────────────────────

describe('gamingToolHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('gère rechercher_actu_gaming et retourne du texte formaté', async () => {
    mockFetch(TAVILY_RESULTS);
    const result = await gamingToolHandler('rechercher_actu_gaming', { query: 'handler-unique-' + Date.now() });
    expect(typeof result).toBe('string');
    expect(result).toContain('GTA VI delayed to 2026');
    expect(result).toContain('https://ign.com/gta6');
  });

  test('retourne un fallback JSON si Tavily échoue', async () => {
    mockFetchError('connection refused');
    const result = await gamingToolHandler('rechercher_actu_gaming', { query: 'fallback-unique-' + Date.now() });
    const parsed = JSON.parse(result);
    expect(parsed.fallback).toBe(true);
    expect(parsed.error).toContain('connection refused');
  });

  test('gère rechercher_jeu_igdb et retourne du texte formaté', async () => {
    mockFetch(IGDB_RESULTS);
    const result = await gamingToolHandler('rechercher_jeu_igdb', { game_name: 'Elden Ring' });
    expect(typeof result).toBe('string');
    expect(result).toContain('Elden Ring');
    expect(result).toContain('FromSoftware');
  });

  test('retourne un fallback JSON si IGDB échoue', async () => {
    mockFetchError('igdb down');
    const result = await gamingToolHandler('rechercher_jeu_igdb', { game_name: 'Fallback Game' });
    const parsed = JSON.parse(result);
    expect(parsed.fallback).toBe(true);
  });

  test('retourne une erreur JSON pour un outil inconnu', async () => {
    const result = await gamingToolHandler('outil_inexistant', {});
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('inconnu');
  });

  test('gère une query vide sans crash', async () => {
    mockFetch({ results: [] });
    const result = await gamingToolHandler('rechercher_actu_gaming', { query: '' });
    expect(typeof result).toBe('string');
  });
});
