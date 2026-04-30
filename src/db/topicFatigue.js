/**
 * ================================================
 * 📊 TOPIC FATIGUE TRACKER v2.2.4
 * ================================================
 * Suivi des sujets pour éviter la redondance.
 * Si un sujet est abordé 5+ fois par semaine,
 * Brainee suggère un changement de sujet.
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

/**
 * Enregistre qu'on parle d'un sujet donné
 */
async function recordTopic(topic) {
  if (!shared.mongoDb) return;
  try {
    const now = new Date();
    const topicLower = topic.toLowerCase().trim();
    if (!topicLower || topicLower.length < 2) return;

    await shared.mongoDb.collection('topicFatigue').updateOne(
      { topic: topicLower },
      {
        $push: { dates: now },
        $inc: { count: 1 },
      },
      { upsert: true }
    );
  } catch (err) {
    pushLog('ERR', `recordTopic: ${err.message}`, 'error');
  }
}

/**
 * Retourne combien de fois on a parlé d'un sujet cette semaine
 */
async function getTopicFatigue(topic) {
  if (!shared.mongoDb) return 0;
  try {
    const topicLower = topic.toLowerCase().trim();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const doc = await shared.mongoDb.collection('topicFatigue').findOne({
      topic: topicLower,
    });

    if (!doc || !doc.dates) return 0;

    // Count dates within the last week
    const recentDates = doc.dates.filter(d => d >= weekAgo);
    return recentDates.length;
  } catch (err) {
    pushLog('ERR', `getTopicFatigue: ${err.message}`, 'error');
    return 0;
  }
}

/**
 * Détecte si le message parle d'un sujet redondant (5+ fois cette semaine)
 * Retourne { isRedundant: bool, topic: string, count: number, warning: string }
 */
async function checkTopicRedundance(messageContent) {
  if (!shared.mongoDb || !messageContent) return { isRedundant: false };

  try {
    // Simple topic extraction: keywords common (gaming, anime, tech, etc.)
    const topics = [];
    const contentLower = messageContent.toLowerCase();

    const topicKeywords = {
      'elden ring': ['elden ring', 'elden-ring', 'erdtree', 'grace'],
      eternights: ['eternights', 'eternight', 'dating sim', 'post-apocalyptic'],
      'gaming-general': ['game', 'gamer', 'gaming', 'gameplay', 'fps', 'speedrun', 'indie'],
      anime: ['anime', 'manga', 'weeb', 'otaku', 'isekai', 'shonen'],
      tech: ['api', 'code', 'dev', 'javascript', 'python', 'database', 'git'],
      debate: ['débat', 'argument', 'opinion', 'philosophie', 'contredit'],
      music: ['musique', 'album', 'artiste', 'playlist', 'chanson'],
      crypto: ['bitcoin', 'ethereum', 'nft', 'crypto', 'blockchain', 'web3'],
      politics: ['politique', 'gouvernement', 'élection', 'parti', 'président'],
      sports: ['sport', 'football', 'tennis', 'basket', 'olympic', 'match'],
      rpg: ['rpg', 'jrpg', 'turn-based', 'moba'],
      silence: ['silence', 'silence des mondes', 'hérité', 'héritage'],
    };

    for (const [topicName, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => contentLower.includes(kw))) {
        topics.push(topicName);
      }
    }

    // Check fatigue for detected topics (seuil abaissé à 3 pour éviter la répétition)
    for (const topic of topics) {
      const count = await getTopicFatigue(topic);
      if (count >= 3) {
        return {
          isRedundant: true,
          topic,
          count,
          warning: `On a déjà parlé de ${topic} ${count} fois cette semaine, non? Peut-être qu'un nouveau sujet serait sympa...`,
        };
      }
    }

    return { isRedundant: false };
  } catch (err) {
    pushLog('ERR', `checkTopicRedundance: ${err.message}`, 'error');
    return { isRedundant: false };
  }
}

/**
 * Récupère les sujets les plus fatigués de la semaine
 */
async function getTopFatigueTopics(limit = 5) {
  if (!shared.mongoDb) return [];
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const allTopics = await shared.mongoDb
      .collection('topicFatigue')
      .find({})
      .toArray();

    const withWeeklyCount = allTopics.map(doc => ({
      topic: doc.topic,
      count: (doc.dates || []).filter(d => d >= weekAgo).length,
    }));

    return withWeeklyCount
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (err) {
    pushLog('ERR', `getTopFatigueTopics: ${err.message}`, 'error');
    return [];
  }
}

/**
 * Réinitialise le tracker (optionnel)
 */
async function resetTopicFatigue() {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection('topicFatigue').deleteMany({});
    pushLog('SYS', `📊 Topic fatigue tracker réinitialisé`, 'info');
  } catch (err) {
    pushLog('ERR', `resetTopicFatigue: ${err.message}`, 'error');
  }
}

module.exports = {
  recordTopic,
  getTopicFatigue,
  checkTopicRedundance,
  getTopFatigueTopics,
  resetTopicFatigue,
};
