const { sleep } = require('../utils');
const { humanize } = require('./humanize');
const { getHumanizationSignal } = require('./emotions');
const { getBondSignal } = require('../db/memberBonds');
const { getDailyMood } = require('./mood');
const { getCurrentSlot } = require('./scheduling');

function resolveMentionsInText(text, guild) {
  if (!text || !guild) return text;
  let out = text;

  out = out.replace(/@([A-Za-z0-9_\-\u00C0-\u024F]{2,})/g, (match, rawName) => {
    const name = rawName.toLowerCase();
    const member = guild.members.cache.find(m =>
      m.user.username?.toLowerCase() === name ||
      m.displayName?.toLowerCase() === name
    );
    return member ? `<@${member.id}>` : match;
  });

  out = out.replace(/#([a-z0-9_\-\u00C0-\u024F]+)/g, (match, rawName) => {
    const name = rawName.toLowerCase();
    const channel = guild.channels.cache.find(c =>
      c.name?.toLowerCase() === name ||
      c.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') === name
    );
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
  content = resolveMentionsInText(content, guild);

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
    for (const p of ['. ', '! ', '? ', '— ', '\n']) {
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

module.exports = { resolveMentionsInText, simulateTyping, sendHuman };
