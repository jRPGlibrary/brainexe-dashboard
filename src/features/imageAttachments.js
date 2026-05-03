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
 *   - on passe les URLs Discord directement (pas de base64)
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
 * Transforme un texte utilisateur + images en payload multimodal.
 * Si pas d'image → retourne juste le texte string.
 */
function buildMultimodalUserContent(textPrompt, images) {
  if (!images || images.length === 0) return textPrompt;
  const blocks = [];
  for (const img of images) {
    blocks.push({
      type: 'image',
      source: { type: 'url', url: img.url },
    });
  }
  blocks.push({ type: 'text', text: textPrompt });
  return blocks;
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
  buildMultimodalUserContent,
  getImageCommentInstruction,
  MAX_IMAGES_PER_MESSAGE,
  SUPPORTED_MIME,
};
