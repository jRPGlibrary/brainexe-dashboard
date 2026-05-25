/**
 * ================================================
 * 🤔 DECISION LOGIC v0.6.0
 * ================================================
 * Logique d'autonomie pour les réponses et interactions
 * Décide si Brainee doit répondre ou rester silencieuse
 * ================================================
 */

const { checkTopicRedundance, recordTopic } = require('../db/topicFatigue');
const { shouldAvoidTopic } = require('../db/messageEngagement');
const { pushLog } = require('../logger');
const shared = require('../shared');

/**
 * Décide si Brainee doit répondre à un message
 * Retourne { should: bool, reason: string }
 *
 * Logique :
 * - Si mentalLoad > 80 ET vibe lazy/introvert ET pas urgent → false ("trop fatiguée")
 * - Si sujet redondant (5+ fois semaine) ET pas urgent → maybe ("déjà débattu")
 * - Sinon : true
 */
async function shouldRespond(slot, vibe, mentalLoad, messageContent, isUrgent = false, isMention = false) {
  try {
    // Si urgent, toujours répondre
    if (isUrgent) {
      return { should: true, reason: 'urgent' };
    }

    // Mention directe — toujours répondre, peu importe vibe/fatigue/engagement
    if (isMention) {
      return { should: true, reason: 'mention_priority' };
    }

    // Goodnight posté — plus de réponses spontanées jusqu'au matin
    if (shared.goodnightSent) {
      return { should: false, reason: 'goodnight_sent' };
    }

    // E3 — Engagement actif : bloc total (non-mentions)
    if (shared.commitmentUntil && Date.now() < shared.commitmentUntil) {
      return { should: false, reason: 'commitment_active', message: 'engagement en cours' };
    }

    // Gate vibe : la responsiveness influe directement sur la décision de s'inviter dans une conv
    // lazy(0.50) → 28% de skip, introvert(0.55) → 25%, focus(0.65) → 19%, chatty(0.95) → 3%
    if (vibe?.responsiveness !== undefined) {
      const skipThreshold = (1 - vibe.responsiveness) * 0.80;
      if (Math.random() < skipThreshold) {
        return {
          should: false,
          reason: 'vibe_low_responsiveness',
          message: `pas l'énergie pour ça là`,
        };
      }
    }

    // Logique fatigue mentale + vibe introvertie (seuil abaissé : 55 est réaliste)
    const isLazyVibe = ['lazy', 'introvert', 'melancholic', 'withdrawn'].includes(vibe?.name || '');
    if (mentalLoad > 40 && isLazyVibe) {
      return {
        should: false,
        reason: 'mental_overload',
        message: `franchement pas le mood là, t'en as trop sur la tête`,
      };
    }

    // Vérifier si le sujet est redondant (plus strict pour éviter la répétition)
    if (messageContent) {
      const redundanceCheck = await checkTopicRedundance(messageContent);
      if (redundanceCheck.isRedundant && mentalLoad > 40) {
        return {
          should: false,
          reason: 'topic_fatigue',
          message: redundanceCheck.warning,
        };
      }

      // Vérifier si le sujet a eu peu d'engagement récemment
      // Extraire le topic principal du message
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
        rpg: ['rpg', 'jrpg', 'turn-based', 'moba'],
        silence: ['silence', 'silence des mondes', 'hérité', 'héritage'],
      };

      for (const [topicName, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(kw => contentLower.includes(kw))) {
          topics.push(topicName);
          break;
        }
      }

      for (const topic of topics) {
        const avoid = await shouldAvoidTopic(topic);
        if (avoid) {
          return {
            should: false,
            reason: 'topic_without_engagement',
            message: `${topic} ça n'a marché 0 fois cette semaine, pas besoin d'insister là-dessus`,
          };
        }
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
      'elden ring': ['elden ring', 'elden-ring', 'erdtree', 'grace'],
      eternights: ['eternights', 'eternight', 'dating sim', 'post-apocalyptic'],
      'gaming-general': ['game', 'gamer', 'gaming', 'gameplay', 'fps', 'speedrun', 'indie'],
      anime: ['anime', 'manga', 'weeb', 'otaku', 'isekai', 'shonen'],
      tech: ['api', 'code', 'dev', 'javascript', 'python', 'database', 'git'],
      debate: ['débat', 'argument', 'opinion', 'philosophie', 'contredit'],
      music: ['musique', 'album', 'artiste', 'playlist', 'chanson'],
      rpg: ['rpg', 'jrpg', 'turn-based', 'moba'],
      silence: ['silence', 'silence des mondes', 'hérité', 'héritage'],
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
