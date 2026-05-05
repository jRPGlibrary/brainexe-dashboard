const { sleep } = require('../utils');
const { humanize, maybeAddOccasionalEmoji } = require('./humanize');
const { getHumanizationSignal } = require('./emotions');
const { getBondSignal } = require('../db/memberBonds');
const { getDailyMood } = require('./mood');
const { getCurrentSlot } = require('./scheduling');

// Normalise un nom pour comparaison : lowercase, strip diacritiques, strip emojis,
// strip tout sauf lettres/chiffres/_/- (mais garde les caractères Unicode lettres)
function normalizeName(s) {
  if (!s) return '';
  try {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/[^\p{L}\p{N}_.\-]/gu, '')
      .replace(/^[-._]+|[-._]+$/g, '')
      .trim();
  } catch (_) {
    return s.toLowerCase().replace(/[^a-z0-9_.\-]/g, '');
  }
}

function stripEmDash(text) {
  if (!text) return text;
  return text
    .replace(/ *[—–] */g, ', ')
    .replace(/^, /, '')
    .replace(/, ([.!?\n])/g, '$1')
    .replace(/, $/, '');
}

function resolveMentionsInText(text, guild) {
  if (!text || !guild) return text;
  let out = text;

  // Extraction permissive : tout après @ ou # jusqu'au prochain délimiteur non-pseudo
  const MENTION_CHARS = "[^\\s@#<>()\\[\\]{}\"',;:!?\\n\\r\\t]+";

  // @mentions → membres
  out = out.replace(new RegExp(`@(${MENTION_CHARS})`, 'g'), (match, rawName) => {
    const normInput = normalizeName(rawName);
    if (!normInput || normInput.length < 2) return match;

    const members = guild.members.cache;

    let member = members.find(m => {
      const username = normalizeName(m.user?.username);
      const displayName = normalizeName(m.displayName);
      const globalName = normalizeName(m.user?.globalName);
      const nickname = normalizeName(m.nickname);

      return (username && username === normInput) ||
             (displayName && displayName === normInput) ||
             (globalName && globalName === normInput) ||
             (nickname && nickname === normInput);
    });

    if (!member) {
      member = members.find(m => {
        const username = normalizeName(m.user?.username);
        const displayName = normalizeName(m.displayName);
        const globalName = normalizeName(m.user?.globalName);
        const nickname = normalizeName(m.nickname);

        const exact = [username, displayName, globalName, nickname].filter(Boolean);
        if (exact.length === 0) return false;

        return exact.some(name =>
          (name.includes(normInput) || normInput.includes(name)) &&
          Math.min(name.length, normInput.length) >= 3
        );
      });
    }

    return member ? `<@${member.id}>` : match;
  });

  // #channels → salons
  out = out.replace(new RegExp(`#(${MENTION_CHARS})`, 'g'), (match, rawName) => {
    const normInput = normalizeName(rawName);
    if (!normInput) return match;

    const channels = guild.channels.cache.filter(c => c.name);
    let channel = channels.find(c => normalizeName(c.name) === normInput);

    if (!channel) {
      channel = channels.find(c => {
        const n = normalizeName(c.name);
        if (!n || n.length < 2) return false;
        return (n.length >= 3 && normInput.length >= 3 && (n.includes(normInput) || normInput.includes(n)));
      });
    }

    return channel ? `<#${channel.id}>` : match;
  });

  return out;
}

async function simulateTyping(channel, durationMs = 2000) {
  try {
    await channel.sendTyping();
    if (durationMs > 1000) await sleep(Math.min(durationMs, 8000));
  } catch (_) {}
}

async function sendHuman(channel, content, replyTo = null, opts = {}) {
  const guild = channel?.guild || replyTo?.guild || null;
  content = stripEmDash(resolveMentionsInText(content, guild));

  if (opts.skipHumanize !== true) {
    try {
      const bond = opts.bond || null;
      const ctx = {
        emotionalSignal: getHumanizationSignal(),
        bondSignal: getBondSignal(bond),
        mood: getDailyMood(),
        slotStatus: getCurrentSlot()?.status || 'active',
      };
      content = humanize(content, ctx);
      // Emoji occasionnel (~10% serveur, ~15% DM)
      if (opts.skipEmoji !== true) {
        content = maybeAddOccasionalEmoji(content, { isDM: !!opts.isDM });
      }
    } catch (_) {}
  }

  const shouldFragment = Math.random() < 0.20 && content.length > 60;
  if (!shouldFragment) {
    await simulateTyping(channel, 1000 + Math.random() * 2000);
    if (replyTo) return replyTo.reply(content);
    return channel.send(content);
  }

  const mid = Math.floor(content.length / 2);
  let cutIndex = -1;
  for (let offset = 0; offset < mid; offset++) {
    for (const p of ['. ', '! ', '? ', '\n']) {
      const idx = content.indexOf(p, mid - offset);
      if (idx !== -1 && idx < content.length - 5) { cutIndex = idx + p.length - 1; break; }
    }
    if (cutIndex !== -1) break;
  }

  if (cutIndex === -1 || cutIndex < 20) {
    await simulateTyping(channel, 1000 + Math.random() * 2000);
    if (replyTo) return replyTo.reply(content);
    return channel.send(content);
  }

  const part1 = content.slice(0, cutIndex).trim();
  const part2 = content.slice(cutIndex).trim();
  await simulateTyping(channel, 800 + Math.random() * 1500);
  if (replyTo) await replyTo.reply(part1); else await channel.send(part1);
  await sleep(1000 + Math.random() * 2000);
  await simulateTyping(channel, 600 + Math.random() * 1000);
  return channel.send(part2);
}

module.exports = { resolveMentionsInText, simulateTyping, sendHuman, normalizeName, stripEmDash };
