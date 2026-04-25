const shared = require('../shared');
const { pushLog } = require('../logger');
const { GAMING_KEYWORDS } = require('../bot/keywords');

// Preference keywords
const PREFERENCE_KEYWORDS = {
  tech_lover: ['api', 'code', 'dev', 'javascript', 'python', 'rust', 'golang', 'backend', 'frontend', 'react', 'vue', 'node', 'database', 'sql', 'nosql', 'git', 'github', 'programming', 'coding', 'stack', 'framework'],
  anime_fan: ['anime', 'manga', 'weeb', 'otaku', 'kawaii', 'sensei', 'san', 'chan', 'shinobi', 'shonen', 'shoujo', 'seinen', 'isekai', 'harem'],
  debate_lover: ['débat', 'argument', 'réflexion', 'philosophie', 'opinion', 'contredit', 'discute', 'pensez', 'croyez', 'théorie', 'hypoth'],
  gaming_lover: [...GAMING_KEYWORDS, 'game', 'gamer', 'gaming', 'gameplay', 'speedrun', 'esport'],
  music_lover: ['musique', 'chanson', 'chanson', 'album', 'artiste', 'playlist', 'beat', 'rhythm', 'rap', 'rock', 'metal', 'jazz', 'électro'],
};

async function getMemberProfile(userId) {
  if (!shared.mongoDb) return null;
  try { return await shared.mongoDb.collection('memberProfiles').findOne({ userId }); } catch { return null; }
}

/**
 * Détecte les préférences dans le contenu du message
 */
function detectPreferencesFromMessage(content = '') {
  const lower = content.toLowerCase();
  const detected = [];

  Object.entries(PREFERENCE_KEYWORDS).forEach(([prefType, keywords]) => {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(prefType);
    }
  });

  return [...new Set(detected)]; // Remove duplicates
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

    // Merge preferences: detect new ones, keep existing
    const detectedPrefs = detectPreferencesFromMessage(content);
    let preferences = existing?.preferences ?? [];
    detectedPrefs.forEach(pref => {
      if (!preferences.includes(pref)) preferences.push(pref);
    });
    if (preferences.length > 10) preferences = preferences.slice(-10);

    await shared.mongoDb.collection('memberProfiles').updateOne(
      { userId },
      { $set: { userId, username, lastSeen: new Date().toLocaleDateString('fr-CA'), toneScore, topics, preferences, interactionCount: (existing?.interactionCount ?? 0) + 1, receptiveToBanter: toneScore >= 5, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) { pushLog('ERR', `Profile update échoué : ${err.message}`, 'error'); }
}

function getToneInstruction(profile, targetUsername) {
  if (!profile) return `Tu parles à ${targetUsername} — membre que tu connais peu. Reste chaleureuse, accessible, aucun tacle ni pique.`;
  const score = profile.toneScore ?? 3;
  const topicsStr = profile.topics?.length ? `Sujets déjà abordés : ${profile.topics.join(', ')}.` : '';
  const toneRule = score <= 3 ? 'Ton chaleureux uniquement. Pas de pique.' : score <= 6 ? 'Ironie légère si naturelle.' : 'Piques et sarcasme léger assumés.';

  // Preference-based instructions
  let prefInstructions = '';
  if (profile.preferences?.length) {
    const prefMap = {
      tech_lover: 'Cette personne aime la tech : parle APIs, code, dev avec confiance et détail.',
      anime_fan: 'Cette personne aime l\'anime et manga : n\'hésite pas à citer des références.',
      debate_lover: 'Cette personne aime débattre : engage-la sur des angles intéressants, pose des questions provoc mais bienveillantes.',
      gaming_lover: 'Gamer confirmé(e) : tu peux citer des jeux et mécaniques de gameplay naturellement.',
      music_lover: 'Passionné(e) de musique : parle styles, artistes, ambiances sans hésiter.',
    };
    const activePrefTexts = profile.preferences
      .filter(p => prefMap[p])
      .map(p => prefMap[p]);
    if (activePrefTexts.length) {
      prefInstructions = '\nPréférences détectées : ' + activePrefTexts.join(' ');
    }
  }

  return `Tu parles à ${targetUsername} (${profile.interactionCount} interactions, complicité ${score}/10).\n${topicsStr}\n${toneRule}\nRÈGLE : sujet difficile/sensible → ton doux TOUJOURS.${prefInstructions}`;
}

module.exports = { getMemberProfile, updateMemberProfile, getToneInstruction, detectPreferencesFromMessage };
