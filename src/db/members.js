const shared = require('../shared');
const { pushLog } = require('../logger');
const { GAMING_KEYWORDS } = require('../bot/keywords');

async function getMemberProfile(userId) {
  if (!shared.mongoDb) return null;
  try { return await shared.mongoDb.collection('memberProfiles').findOne({ userId }); } catch { return null; }
}

async function updateMemberProfile(userId, username, messageContent) {
  if (!shared.mongoDb) return;
  try {
    const existing = await getMemberProfile(userId);
    const content = messageContent || '';
    let toneScore = existing?.toneScore ?? 3;
    if (/😂|🤣|😆|😅|🤭|😏|😄|💀|☠️/.test(content)) toneScore = Math.min(10, toneScore + 0.15);
    if (content.length > 60) toneScore = Math.min(10, toneScore + 0.1);
    if (content.length < 10) toneScore = Math.max(1, toneScore - 0.05);
    toneScore = Math.round(toneScore * 10) / 10;
    let topics = existing?.topics ?? [];
    const lower = content.toLowerCase();
    GAMING_KEYWORDS.forEach(kw => { if (lower.includes(kw) && !topics.includes(kw)) topics.push(kw); });
    if (topics.length > 15) topics = topics.slice(-15);
    await shared.mongoDb.collection('memberProfiles').updateOne(
      { userId },
      { $set: { userId, username, lastSeen: new Date().toLocaleDateString('fr-CA'), toneScore, topics, interactionCount: (existing?.interactionCount ?? 0) + 1, receptiveToBanter: toneScore >= 5, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `Profile update échoué : ${err.message}`, 'error'); }
}

function getToneInstruction(profile, targetUsername) {
  if (!profile) return `Tu parles à ${targetUsername} — membre que tu connais peu. Reste chaleureuse, accessible, aucun tacle ni pique.`;
  const score = profile.toneScore ?? 3;
  const topicsStr = profile.topics?.length ? `Sujets déjà abordés : ${profile.topics.join(', ')}.` : '';
  const toneRule = score <= 3 ? 'Ton chaleureux uniquement. Pas de pique.' : score <= 6 ? 'Ironie légère si naturelle.' : 'Piques et sarcasme léger assumés.';
  return `Tu parles à ${targetUsername} (${profile.interactionCount} interactions, complicité ${score}/10).\n${topicsStr}\n${toneRule}\nRÈGLE : sujet difficile/sensible → ton doux TOUJOURS.`;
}

module.exports = { getMemberProfile, updateMemberProfile, getToneInstruction };
