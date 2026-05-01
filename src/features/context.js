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

function formatContext(messages, currentMessageId = null, limit = 80) {
  return [...messages.values()]
    .filter(m => currentMessageId ? m.id !== currentMessageId : true)
    .reverse()
    .slice(-limit)
    .map(m => {
      const who = m.author.bot ? '[Brainee]' : m.author.username;
      const when = m.createdTimestamp ? ` (${formatRelativeTime(m.createdTimestamp)})` : '';
      let replyInfo = '';
      if (m.reference?.messageId) {
        const ref = messages.get(m.reference.messageId);
        if (ref) {
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
    .join('\n');
}

module.exports = { formatContext };
