/**
 * ================================================
 * 🖼️ IMAGE ATTACHMENTS
 * ================================================
 * Capture les images envoyées par les utilisateurs et les transforme
 * en blocs multimodal Claude pour que Brainee puisse les voir
 * et les commenter naturellement.
 *
 * Stratégie de chargement (3 tentatives par image) :
 *   1. base64 depuis att.url  (URL CDN Discord signée)
 *   2. base64 depuis att.proxyURL  (CDN proxy, différent réseau)
 *   3. source URL pour Anthropic (Anthropic fait le fetch lui-même)
 * ================================================
 */

const { pushLog } = require('../logger');

const SUPPORTED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
]);

const MAX_IMAGES_PER_MESSAGE = 3;

/**
 * Extrait les images valides d'un message Discord.
 * Inclut proxyURL comme fallback réseau.
 * @param {import('discord.js').Message} message
 * @returns {Array<{url:string, proxyURL:string|null, name:string, mime:string}>}
 */
function extractImageAttachments(message) {
  if (!message?.attachments || message.attachments.size === 0) return [];
  const out = [];
  for (const att of message.attachments.values()) {
    if (out.length >= MAX_IMAGES_PER_MESSAGE) break;
    const mime = (att.contentType || '').toLowerCase();
    if (!mime) {
      const name = (att.name || '').toLowerCase();
      const isImg = /\.(png|jpe?g|webp|gif)$/.test(name);
      if (!isImg) continue;
    } else if (!SUPPORTED_MIME.has(mime)) {
      continue;
    }
    if (!att.url) continue;
    out.push({
      url: att.url,
      proxyURL: att.proxyURL || null,
      name: att.name || 'image',
      mime: mime || 'image/png',
    });
  }
  return out;
}

/**
 * Télécharge une image depuis une URL et retourne le base64.
 * Timeout 15s (augmenté vs 8s initial — images HD sur connexion lente).
 */
async function _fetchImageBase64(url, mime) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BraineeBot/1.0)',
        'Accept': 'image/*,*/*',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      pushLog('WARN', `🖼️ CDN image HTTP ${res.status} : ${url.slice(0, 80)}`, 'error');
      return { ok: false };
    }
    const buf = await res.arrayBuffer();
    return { ok: true, data: Buffer.from(buf).toString('base64'), mediaType: mime || 'image/jpeg' };
  } catch (err) {
    clearTimeout(timer);
    const reason = err.name === 'AbortError' ? 'timeout 15s' : (err.message || 'erreur réseau').slice(0, 60);
    pushLog('WARN', `🖼️ CDN image download échoué (${reason}) : ${url.slice(0, 80)}`, 'error');
    return { ok: false };
  }
}

/**
 * Télécharge toutes les images en essayant 3 méthodes par image :
 *   1. base64 via att.url
 *   2. base64 via att.proxyURL (si différent)
 *   3. source URL pour Anthropic (en dernier recours — Anthropic fait le fetch)
 *
 * Retourne toujours les blocs pour les images qu'on a pu traiter.
 * Un bloc URL-type est inclus si base64 échoue (Anthropic tente le fetch depuis ses serveurs).
 */
async function loadImages(images) {
  if (!images || images.length === 0) return [];
  const blocks = [];
  for (const img of images) {
    // Tentative 1 : base64 depuis l'URL principale
    let result = await _fetchImageBase64(img.url, img.mime);

    // Tentative 2 : base64 depuis proxyURL (cdn différent, parfois accessible quand le CDN principal ne l'est pas)
    if (!result.ok && img.proxyURL && img.proxyURL !== img.url) {
      pushLog('SYS', `🖼️ Retry proxyURL pour ${img.name}`, 'warn');
      result = await _fetchImageBase64(img.proxyURL, img.mime);
    }

    if (result.ok) {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: result.mediaType, data: result.data },
      });
    } else {
      // Tentative 3 : URL-type — Anthropic fait le fetch depuis ses propres serveurs.
      // Si ses serveurs ne peuvent pas non plus accéder à l'URL, l'API retourne une erreur 400
      // qui sera propagée (Brainee ne répond pas) — préférable à "je vois pas l'image".
      pushLog('WARN', `🖼️ Base64 impossible, fallback URL Anthropic pour ${img.name}`, 'error');
      blocks.push({
        type: 'image',
        source: { type: 'url', url: img.url },
      });
    }
  }
  return blocks;
}

/**
 * Transforme un texte utilisateur + images en payload multimodal.
 * Si pas d'image → retourne juste le texte string.
 * Accepte des blocs pré-chargés via loadImages() pour éviter un double téléchargement.
 */
async function buildMultimodalUserContent(textPrompt, images, preloadedBlocks = null) {
  const imageBlocks = preloadedBlocks !== null ? preloadedBlocks : await loadImages(images || []);
  if (imageBlocks.length === 0) return textPrompt;
  return [...imageBlocks, { type: 'text', text: textPrompt }];
}

/**
 * Construit une instruction stricte à injecter dans le system prompt
 * quand des images sont envoyées : Brainee doit COMMENTER simplement,
 * pas lister, pas analyser comme une IA.
 */
function getImageCommentInstruction(count) {
  if (count === 1) {
    return `\n📷 La personne t'a envoyé UNE image. Regarde-la et réagis simplement, comme une humaine — un commentaire court, naturel, perso ("ah pas mal", "wow", "c'est où ?", "joli rendu", "tu joues à quoi là ?"). Pas de description analytique style IA. Reste dans le ton de la conversation.`;
  }
  return `\n📷 La personne t'a envoyé ${count} images. Regarde-les et réagis naturellement, en gardant le ton conversationnel. Tu peux commenter l'ensemble en une ou deux phrases courtes. Pas de liste, pas de description IA.`;
}

module.exports = {
  extractImageAttachments,
  loadImages,
  buildMultimodalUserContent,
  getImageCommentInstruction,
  MAX_IMAGES_PER_MESSAGE,
  SUPPORTED_MIME,
};
