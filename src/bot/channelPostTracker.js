const WINDOW_MS = 3 * 60 * 60 * 1000;
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const MAX_POSTS = 2;

const _history = {};

function record(channelId) {
  if (!_history[channelId]) _history[channelId] = [];
  const now = Date.now();
  _history[channelId].push(now);
  _history[channelId] = _history[channelId].filter(t => now - t < WINDOW_MS);
}

function getCount(channelId) {
  const now = Date.now();
  return (_history[channelId] || []).filter(t => now - t < WINDOW_MS).length;
}

function getLastPost(channelId) {
  const h = _history[channelId] || [];
  return h.length > 0 ? Math.max(...h) : 0;
}

function isOnCooldown(channelId) {
  const last = getLastPost(channelId);
  return last > 0 && Date.now() - last < COOLDOWN_MS;
}

function isOverLimit(channelId) {
  return getCount(channelId) >= MAX_POSTS;
}

module.exports = { record, getCount, getLastPost, isOnCooldown, isOverLimit, COOLDOWN_MS, WINDOW_MS, MAX_POSTS };
