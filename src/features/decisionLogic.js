/**
 * ================================================
 * 🤔 DECISION LOGIC v2.2.4
 * ================================================
 * Logique d'autonomie pour les réponses et interactions
 * Décide si Brainee doit répondre ou rester silencieuse
 * ================================================
 */

const { checkTopicRedundance, recordTopic } = require('../db/topicFatigue');
const { pushLog } = require('../logger');

/**
 * Décide si Brainee doit répondre à un message
 * Retourne { should: bool, reason: string }
 *
 * Logique :
 * - Si mentalLoad > 80 ET vibe lazy/introvert ET pas urgent → false ("trop fatiguée")
 * - Si sujet redondant (5+ fois semaine) ET pas urgent → maybe ("déjà débattu")
 * - Sinon : true
 */
async function shouldRespond(slot, vibe, mentalLoad, messageContent, isUrgent = false) {
  try {
    // Si urgent, toujours répondre
    if (isUrgent) {
      return {
        should: true,
        reason: 'urgent',
      };
    }

    // Logique fatigue mentale + vibe introvertie
    const isLazyVibe = ['lazy', 'introvert', 'melancholic', 'withdrawn'].includes(vibe?.name || '');
    if (mentalLoad > 80 && isLazyVibe) {
      return {
        should: false,
        reason: 'mental_overload',
        message: `franchement pas le mood là, t'en as trop sur la tête`,
      };
    }

    // Vérifier si le sujet est redondant
    if (messageContent) {
      const redundanceCheck = await checkTopicRedundance(messageContent);
      if (redundanceCheck.isRedundant && mentalLoad > 60) {
        return {
          should: false,
          reason: 'topic_fatigue',
          message: redundanceCheck.warning,
        };
      }
    }

    // Default : répondre
    return {
      should: true,
      reason: 'normal',
    };
  } catch (err) {
    pushLog('ERR', `shouldRespond: ${err.message}`, 'error');
    // Si erreur, répondre par défaut
    return { should: true, reason: 'error_fallback' };
  }
}

/**
 * Enregistre un message pour le tracking de sujets
 */
async function recordMessageTopic(messageContent) {
  try {
    if (!messageContent || messageContent.length < 5) return;

    // Keywords pour détection simple de sujets
    const topicKeywords = {
      gaming: ['game', 'gamer', 'gaming', 'gameplay', 'fps', 'rpg', 'moba', 'speedrun'],
      anime: ['anime', 'manga', 'weeb', 'otaku', 'isekai', 'shonen'],
      tech: ['api', 'code', 'dev', 'javascript', 'python', 'database', 'git'],
      debate: ['débat', 'argument', 'opinion', 'philosophie', 'contredit'],
      music: ['musique', 'album', 'artiste', 'playlist', 'chanson'],
    };

    const contentLower = messageContent.toLowerCase();

    for (const [topicName, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => contentLower.includes(kw))) {
        await recordTopic(topicName);
        break; // Record only the first detected topic
      }
    }
  } catch (err) {
    // Silent fail
  }
}

module.exports = {
  shouldRespond,
  recordMessageTopic,
};
