const { YOUTUBE_API_KEY } = require('../config');
const { callClaude } = require('./claude');
const { pushLog } = require('../logger');
const { sanitizeForJson } = require('../utils');

// Désactivé temporairement : l'API retourne des videoId manquants → URLs cassées + embeds non demandés
const YOUTUBE_DISABLED = true;

const _queryCache = new Map(); // hash → { result, expiresAt }
const QUERY_CACHE_MS = 60 * 60 * 1000;

function _hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

async function extractYoutubeQuery(userMessage) {
  if (YOUTUBE_DISABLED) return '';
  const key = _hash(userMessage.slice(0, 200).toLowerCase());
  const cached = _queryCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  const { text: q } = await callClaude(
    'Tu extrais une requête YouTube optimale depuis un message Discord. Réponds UNIQUEMENT avec la requête, max 8 mots.',
    `Message : "${sanitizeForJson(userMessage)}"\nQuelle est la meilleure requête YouTube ?`,
    50,
    null,
    'claude-haiku-4-5-20251001'
  );
  const result = q.replace(/["']/g, '').trim();
  _queryCache.set(key, { result, expiresAt: Date.now() + QUERY_CACHE_MS });
  return result;
}

async function searchYoutube(query, maxResults = 3) {
  if (YOUTUBE_DISABLED || !YOUTUBE_API_KEY) return [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${YOUTUBE_API_KEY}&relevanceLanguage=fr`;
    const data = await (await fetch(url)).json();
    if (!data.items?.length) return [];
    return data.items.map(i => ({
      title: i.snippet.title,
      url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
      channel: i.snippet.channelTitle,
    }));
  } catch (err) { pushLog('ERR', `YouTube échoué : ${err.message}`, 'error'); return []; }
}

module.exports = { extractYoutubeQuery, searchYoutube };
