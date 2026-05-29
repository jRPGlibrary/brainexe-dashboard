function formatRelativeTime(ts) {
  const now = new Date();
  const msgDate = new Date(ts);
  const toParisDateStr = d => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  const nowStr = toParisDateStr(now);
  const msgStr = toParisDateStr(msgDate);
  const timeStr = msgDate.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

  if (msgStr === nowStr) return `aujourd'hui ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (msgStr === toParisDateStr(yesterday)) return `hier ${timeStr}`;

  return msgDate.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short' }) + ` ${timeStr}`;
}

function formatContext(messages, currentMessageId = null, limit = 15) {
  return [...messages.values()]
    .filter(m => currentMessageId ? m.id !== currentMessageId : true)
    .reverse()
    .slice(-limit)
    .map(m => {
      if (!m.author) return null;
      const who = m.author.bot ? '[Brainee]' : m.author.username;
      const when = m.createdTimestamp ? ` (${formatRelativeTime(m.createdTimestamp)})` : '';
      let replyInfo = '';
      if (m.reference?.messageId) {
        const ref = messages.get(m.reference.messageId);
        if (ref && ref.author) {
          const target = ref.author.bot ? 'Brainee' : ref.author.username;
          const preview = (ref.content || '').slice(0, 40).replace(/\n/g, ' ');
          replyInfo = ` [↩ répond à ${target}: "${preview}${preview.length >= 40 ? '...' : ''}"]`;
        } else replyInfo = ' [↩ reply (hors contexte)]';
      }
      let content = m.content || '';
      if (m.mentions?.users?.size) {
        m.mentions.users.forEach((u, id) => {
          content = content.replace(new RegExp(`<@!?${id}>`, 'g'), `@${u.username}`);
        });
      }
      return `[${who}${when}${replyInfo}]: ${content.slice(0, 200)}`;
    })
    .filter(Boolean)
    .join('\n');
}

// Mots français courants à ne PAS inclure dans l'anti-répétition
const STOP_WORDS_FR = new Set([
  'alors', 'après', 'aussi', 'autre', 'avant', 'avec', 'avoir', 'bien', 'ça', 'cette',
  'ceux', 'comme', 'dans', 'donc', 'dont', 'elle', 'elles', 'encore', 'entre', 'eux',
  'fait', 'faire', 'genre', 'haha', 'mais', 'même', 'moins', 'nous', 'ouais', 'para',
  'parce', 'plus', 'pour', 'quand', 'quoi', 'rien', 'sans', 'sauf', 'sera', 'suis',
  'tout', 'tous', 'très', 'trop', 'truc', 'leur', 'leurs', 'voilà', 'vraiment', 'vois',
  'vrai', 'vent', 'toujours', 'souvent', 'avoir', 'avait', 'ainsi', 'autant', 'jamais',
  'cela', 'celui', 'belle', 'beau', 'bonne', 'bref', 'coup', 'déjà', 'depuis', 'deux',
  'dire', 'dont', 'enfin', 'faut', 'fais', 'hier', 'là', 'maintenant', 'mieux', 'moment',
  'non', 'nous', 'okay', 'part', 'pas', 'peut', 'peut-être', 'pire', 'puis', 'quand',
  'quelle', 'quelque', 'sais', 'surtout', 'tenir', 'alors', 'trop', 'type', 'vers',
  'voix', 'vrai', 'vite', 'zéro',
]);

/**
 * Extrait les mots-clés (noms concrets) des N derniers messages de Brainee
 * pour alimenter le bloc anti-répétition lexicale.
 * @param {Map|Collection} messages - messages Discord fetchés
 * @param {number} limit - nombre de messages Brainee à analyser (défaut 4)
 * @param {string} botId - ID Discord du bot
 * @returns {string[]} liste de mots à éviter
 */
function extractRecentBraineeWords(messages, limit = 4, botId = null) {
  const msgArr = [...messages.values()].reverse();
  const braineeMessages = msgArr
    .filter(m => m.author?.bot && (!botId || m.author.id === botId))
    .slice(0, limit);

  const words = new Set();
  for (const m of braineeMessages) {
    const text = (m.content || '').toLowerCase();
    // Extraire les mots de 5+ caractères, pas dans la stop-list
    const tokens = text.match(/\b[a-zéèêàâîïôûùç]{5,}\b/g) || [];
    for (const w of tokens) {
      if (!STOP_WORDS_FR.has(w)) words.add(w);
    }
  }
  return [...words];
}

module.exports = { formatContext, extractRecentBraineeWords };
