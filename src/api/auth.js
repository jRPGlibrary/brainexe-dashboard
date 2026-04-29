const { ADMIN_PASSWORD } = require('../config');

// Stockage partagé des sessions
const activeSessions = new Set();
module.exports.activeSessions = activeSessions;

function createSession(res) {
  const sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
  activeSessions.add(sessionToken);
  res.cookie('admin_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return sessionToken;
}

function requireAuth(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return next();
  }
  const token = req.cookies?.admin_session;
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ ok: false, error: 'Non authentifié' });
  }
  next();
}

function destroySession(req) {
  const token = req.cookies?.admin_session;
  if (token) activeSessions.delete(token);
}

function isSessionValid(token) {
  return activeSessions.has(token);
}

module.exports = { requireAuth, createSession, destroySession, isSessionValid };
