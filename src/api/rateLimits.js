const rateLimit = require('express-rate-limit');

// Appels Claude (anecdote, actus, conversation) : 5 par minute max
const claudeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Trop de requêtes — max 5 appels Claude par minute.' },
});

// Actions Discord destructives (ban, kick, mute, rôles) : 10 par minute max
const discordActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Trop de requêtes — max 10 actions Discord par minute.' },
});

// Backups (écriture disque) : 3 par 10 minutes max
const backupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Trop de backups — max 3 par 10 minutes.' },
});

// Reste de l'API (lecture, config, posts manuels) : 60 par minute max
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Trop de requêtes — max 60 par minute.' },
});

module.exports = { claudeLimiter, discordActionLimiter, backupLimiter, generalLimiter };
