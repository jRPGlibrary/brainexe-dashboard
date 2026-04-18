const { YOUTUBE_API_KEY } = require('../config');
const { callClaude } = require('./claude');
const { pushLog } = require('../logger');

async function extractYoutubeQuery(userMessage) {
  const q = await callClaude(
    'Tu extrais une requête YouTube optimale depuis un message Discord. Réponds UNIQUEMENT avec la requête, max 8 mots.',
    `Message : "${userMessage}"\nQuelle est la meilleure requête YouTube ?`,
    50
  );
  return q.replace(/["']/g, '').trim();
}

async function searchYoutube(query, maxResults = 3) {
  if (!YOUTUBE_API_KEY) return [];
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
