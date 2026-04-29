const shared = require('../shared');

// Cache les éléments constants par jour pour éviter les recalculs
// (émotions, narratives, humeurs) ne changent que 1-2 fois par jour

const CACHE_TTL = 60 * 60 * 1000; // 1 heure

function getDailyCache() {
  if (!shared.dailyCache) {
    shared.dailyCache = {
      emotionalBlock: '',
      temperamentBlock: '',
      narrativeBlock: '',
      lastCached: 0,
    };
  }
  return shared.dailyCache;
}

function isCacheValid() {
  const cache = getDailyCache();
  return Date.now() - cache.lastCached < CACHE_TTL && cache.emotionalBlock;
}

function setCacheBlocks(emotionalBlock, temperamentBlock, narrativeBlock) {
  const cache = getDailyCache();
  cache.emotionalBlock = emotionalBlock;
  cache.temperamentBlock = temperamentBlock;
  cache.narrativeBlock = narrativeBlock;
  cache.lastCached = Date.now();
}

function getCachedBlocks() {
  if (!isCacheValid()) return null;
  const cache = getDailyCache();
  return {
    emotionalBlock: cache.emotionalBlock,
    temperamentBlock: cache.temperamentBlock,
    narrativeBlock: cache.narrativeBlock,
  };
}

function invalidateCache() {
  if (shared.dailyCache) {
    shared.dailyCache.lastCached = 0;
  }
}

module.exports = {
  getDailyCache,
  isCacheValid,
  setCacheBlocks,
  getCachedBlocks,
  invalidateCache,
};
