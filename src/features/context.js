function formatContext(messages, currentMessageId = null, limit = 80) {
  return [...messages.values()]
    .filter(m => currentMessageId ? m.id !== currentMessageId : true)
    .reverse()
    .slice(-limit)
    .map(m => {
      const who = m.author.bot ? '[Brainee]' : m.author.username;
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
      return `[${who}${replyInfo}]: ${content.slice(0, 200)}`;
    })
    .join('\n');
}

module.exports = { formatContext };
