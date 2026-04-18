const { THREAD_TRIGGERS, THREAD_ALLOWED_CHANNELS, REACTION_POOL, GAMING_REACTIONS } = require('./keywords');
const { normalizeLoose } = require('./channelIntel');

function getRandomReaction(content) {
  const lower = content.toLowerCase();
  const isGaming = THREAD_TRIGGERS.some(kw => lower.includes(kw));
  const pool = isGaming ? [...REACTION_POOL, ...GAMING_REACTIONS] : REACTION_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

function shouldCreateThread(content, channelName = '', hasEngagement = false) {
  if (!hasEngagement) return false;
  if (content.length < 100) return false;
  const slug = normalizeLoose(channelName);
  const allowed = THREAD_ALLOWED_CHANNELS.some(c => normalizeLoose(c) === slug);
  if (!allowed) return false;
  const lower = content.toLowerCase();
  return THREAD_TRIGGERS.some(kw => lower.includes(kw));
}

module.exports = { getRandomReaction, shouldCreateThread };
