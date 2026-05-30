/**
 * ================================================
 * 🖼️ IMAGE ATTACHMENTS
 * ================================================
 * Capture les images envoyées par les utilisateurs et les transforme
 * en blocs multimodal Claude pour que Brainee puisse les voir
 * et les commenter naturellement.
 *
 * On reste simple :
 *   - max 3 images par message (au-delà on coupe)
 *   - on ignore tout ce qui n'est pas image (gif/png/jpg/webp)
 *   - téléchargement base64 (Discord CDN URLs signées/expirantes)
 * ================================================
 */

const SUPPORTED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
]);

const MAX_IMAGES_PER_MESSAGE = 3;

/**
 * Extrait les images valides d'un message Discord.
 * @param {import('discord.js').Message} message
 * @returns {Array<{url:string, name:string, mime:string}>}
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
      name: att.name || 'image',
      mime: mime || 'image/png',
    });
  }
  return out;
}

/**
 * Télécharge une image depuis Discord CDN et retourne le base64.
 * Fallback URL si le fetch échoue (timeout 8s).
 */
async function _fetchImageBase64(url, mime) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BraineeBot/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    return { ok: true, data: Buffer.from(buf).toString('base64'), mediaType: mime || 'image/jpeg' };
  } catch (_) {
    clearTimeout(timer);
    return { ok: false };
  }
}

/**
 * Télécharge toutes les images en base64. Retourne un tableau de blocs image Claude.
 * Retourne [] si aucune image n'a pu être chargée.
 */
async function loadImages(images) {
  if (!images || images.length === 0) return [];
  const blocks = [];
  for (const img of images) {
    const result = await _fetchImageBase64(img.url, img.mime);
    if (result.ok) {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: result.mediaType, data: result.data },
      });
    }
    // Si le téléchargement échoue (URL expirée, réseau), on skip l'image.
    // On n'envoie pas l'URL expirée à Anthropic — ça causerait un "je vois pas ce que c'est".
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
