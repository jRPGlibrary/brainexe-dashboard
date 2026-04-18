// Mutable shared state — all modules read/write from here
module.exports = {
  discord: null,
  mongoDb: null,
  wss: null,
  app: null,
  changeLog: [],
  botConfig: null,
  AUTO_ROLE_NAME: '👁️ Lurker',
  guildCache: null,
  syncStats: { d2f: 0, f2d: 0, startTime: Date.now() },
  isApplyingFile: false,
  isApplyingDiscord: false,
  debounceDiscord: null,
  debounceFile: null,
  lastAnyBotPostTime: 0,
};
