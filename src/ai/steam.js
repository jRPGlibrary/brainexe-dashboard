const { callClaude } = require('./claude');
const { pushLog } = require('../logger');
const { sanitizeForJson } = require('../utils');

async function extractGameName(userQuery, botReply = '') {
  const combined = sanitizeForJson(`${userQuery} ${botReply}`.trim().slice(0, 400));
  const { text: result } = await callClaude(
    'Tu identifies si un jeu vidéo PRÉCIS est mentionné dans ce texte. Réponds UNIQUEMENT avec le nom exact du jeu (ex: "Elden Ring"), ou "aucun" si aucun jeu précis n\'est nommé. Un genre ou une plateforme générique (RPG, PS5, indie...) n\'est pas un jeu.',
    `Texte : "${combined}"`,
    25,
    null,
    'claude-haiku-4-5-20251001'
  );
  const name = result.replace(/["'.]/g, '').trim();
  return name.toLowerCase() === 'aucun' || name.length < 2 ? null : name;
}

async function searchSteam(gameName) {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=french&cc=FR`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items?.length) return null;
    const hit = data.items[0];
    return { title: hit.name, url: `https://store.steampowered.com/app/${hit.id}/` };
  } catch (err) {
    pushLog('ERR', `Steam search échoué : ${err.message}`, 'error');
    return null;
  }
}

module.exports = { extractGameName, searchSteam };
