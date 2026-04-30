const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const { callClaude } = require('../ai/claude');
const { sleep, sanitizeForJson } = require('../utils');

async function getChannelDirectory(channelId) {
  if (!shared.mongoDb) return null;
  try { return await shared.mongoDb.collection('channelDirectory').findOne({ channelId }); }
  catch { return null; }
}

async function initChannelDirectory() {
  if (!shared.mongoDb) return;
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const cfg = shared.botConfig.conversations;
    let initialized = 0;

    for (const ch of cfg.channels) {
      try {
        const channel = guild.channels.cache.get(ch.channelId);
        if (!channel) continue;

        const existing = await shared.mongoDb.collection('channelDirectory').findOne({ channelId: ch.channelId });
        if (existing?.officialDescription) continue;

        const msgs = await channel.messages.fetch({ limit: 10, after: '0' });
        const sorted = [...msgs.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        const firstMsg = sorted.find(m => !m.author.bot || m.content.length > 50) || sorted[0];
        if (!firstMsg || !firstMsg.content) continue;

        const description = sanitizeForJson(firstMsg.content.slice(0, 1000));
        let purpose = '';
        const { ANTHROPIC_API_KEY } = require('../config');
        if (ANTHROPIC_API_KEY) {
          ({ text: purpose } = await callClaude(
            'Tu analyses la description officielle d\'un salon Discord pour en extraire le but en 1-2 phrases très courtes, directes, sans formatting.',
            `Salon : #${sanitizeForJson(ch.channelName)}\nDescription : "${description}"\nRéponds uniquement avec le but du salon en 1-2 phrases.`,
            80
          ));
        }

        await shared.mongoDb.collection('channelDirectory').updateOne(
          { channelId: ch.channelId },
          { $set: {
            channelId: ch.channelId,
            channelName: ch.channelName,
            officialDescription: description,
            purpose: purpose || ch.topic,
            firstMessageId: firstMsg.id,
            firstMessageAuthor: firstMsg.author.username,
            initializedAt: new Date(),
            updatedAt: new Date()
          }},
          { upsert: true }
        );

        initialized++;
        await sleep(500);
      } catch (chErr) {
        pushLog('ERR', `initChannelDirectory échoué pour ${ch.channelName}: ${chErr.message}`, 'error');
      }
    }
    pushLog('SYS', `📚 channelDirectory initialisé : ${initialized} salon(s) mis à jour`, 'success');
  } catch (err) {
    pushLog('ERR', `initChannelDirectory global échoué : ${err.message}`, 'error');
  }
}

module.exports = { getChannelDirectory, initChannelDirectory };
