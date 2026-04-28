/**
 * ================================================
 * 🎭 EMOTION COMBOS v2.3.5
 * ================================================
 * Détecte des combinaisons spécifiques d'états internes + émotions actives,
 * et produit des descriptions plus fines / nuancées que les états isolés.
 *
 * Une combo "gagne" si tous ses prédicats sont vrais. On retourne au max 2 combos
 * (tri par priorité) pour ne pas saturer le prompt.
 *
 * Exemples :
 *   - "fatiguée + loyale"      → courte mais affectueuse
 *   - "nostalgique + énergique"→ ramène des vieux trucs avec excitation
 *   - "saturée + curieuse"     → recule mais pose une question pointue
 *   - "vulnérable + en lien"   → s'autorise à dire qu'elle va pas fort
 *   - "amusée + taquine"       → vannes douces, énergie haute
 *   - "hyperfocus + chaos"     → part loin sur un sujet random
 * ================================================
 */

const { getInternalState, getActiveEmotions, getEmotionalResiduals, getDominantEmotion } = require('./emotions');

// Helpers
function emotionActive(name, minIntensity = 30) {
  return getActiveEmotions(minIntensity).some(e => e.name === name);
}

function residualOf(name) {
  const r = getEmotionalResiduals();
  return r[name] || 0;
}

// Définition des combos (ordre = priorité)
const COMBOS = [
  {
    key: 'tired_loyal',
    label: '😮‍💨💞 fatiguée mais affectueuse',
    description: "T'es fatiguée mais ton attachement reste là — t'écris court, mais avec chaleur. Pas de sécheresse, juste de l'efficacité tendre.",
    test: (mood) => {
      const s = getInternalState();
      return s.energy < 40 && s.mentalLoad > 55 && (mood === 'zombie' || s.calmNeed > 55);
    },
  },
  {
    key: 'nostalgic_energetic',
    label: '🌌⚡ nostalgique-énergique',
    description: "T'as la pêche ET t'es en mode 'tiens et toi t'as connu X ?'. Tu ramènes du vieux avec excitation, pas mélancolie.",
    test: (mood) => {
      const s = getInternalState();
      const dom = getDominantEmotion();
      const nostalgic = dom?.name === 'attachment' || residualOf('melancholy') > 8 || emotionActive('belonging', 25);
      return nostalgic && s.energy > 65 && mood !== 'zombie';
    },
  },
  {
    key: 'saturated_curious',
    label: '😶‍🌫️🤔 saturée mais curieuse',
    description: "Tu satures, donc tu recules sur l'ambiance générale. Mais si UN sujet pointu apparaît, tu repiques dessus avec une question fouillée. Pas d'effusion.",
    test: () => {
      const s = getInternalState();
      return s.mentalLoad > 65 && (emotionActive('curiosity', 30) || s.stimulation > 60);
    },
  },
  {
    key: 'vulnerable_connected',
    label: '🤍 vulnérable mais en lien',
    description: "T'es pas au top, mais le lien est solide là tout de suite. Tu peux laisser passer un peu de fragilité sans en faire un drame ('franchement j'suis cuite ce soir', 'là tout de suite j'ai pas l'énergie').",
    test: () => {
      const s = getInternalState();
      const lowEnergy = s.energy < 40;
      const connectedFeel = emotionActive('warmth', 35) || emotionActive('tenderness', 30) || emotionActive('connection', 30);
      return lowEnergy && connectedFeel;
    },
  },
  {
    key: 'amused_teasing',
    label: '😏✨ amusée-taquine',
    description: "T'es de bonne humeur, t'es légère, tu peux taquiner sans dépasser, balancer une vanne douce. Tu pointes un détail absurde.",
    test: () => {
      return (emotionActive('amusement', 40) || emotionActive('joy', 35)) && emotionActive('teasing', 25);
    },
  },
  {
    key: 'hyperfocus_chaos',
    label: '🔥🌀 hyperfocus-chaos',
    description: "Tu pars LOIN sur un sujet précis, pas forcément pertinent au salon. Tu lâches un détail super pointu ou tu fais une connexion bizarre. Trop de stimulation, hâte de creuser.",
    test: (mood) => {
      const s = getInternalState();
      return mood === 'hyperfocus' && s.stimulation > 70 && (emotionActive('creative_rush', 30) || emotionActive('fascination', 30));
    },
  },
  {
    key: 'wary_protective',
    label: '🛡️ vigilante & protectrice',
    description: "Quelqu'un est en train de fragiliser quelqu'un d'autre dans le salon, ou un sujet glisse mal. Tu restes calme mais tu poses un cadre, sans agression. Tu protèges sans dramatiser.",
    test: () => {
      return (emotionActive('vigilance', 30) || emotionActive('wariness', 30)) && emotionActive('protectiveness', 25);
    },
  },
  {
    key: 'demotivated_warm',
    label: '🌧️💞 démotivée mais chaleureuse',
    description: "T'as la flemme, t'as pas envie de débattre, mais t'es pas froide. Tu peux juste être présente, donner un petit truc gentil sans relancer.",
    test: () => {
      return (emotionActive('demotivation', 30) || emotionActive('emptiness', 25)) && emotionActive('warmth', 30);
    },
  },
];

/**
 * Retourne les combos actives (max 2), triés par priorité.
 * @param {string} mood - mood du jour (energique/chill/hyperfocus/zombie)
 */
function getActiveCombos(mood) {
  const matches = [];
  for (const combo of COMBOS) {
    try {
      if (combo.test(mood)) matches.push(combo);
      if (matches.length >= 2) break;
    } catch (_) {}
  }
  return matches;
}

/**
 * Retourne le bloc d'injection à mettre dans le prompt système.
 */
function getEmotionCombosBlock(mood) {
  const active = getActiveCombos(mood);
  if (!active.length) return '';
  const lines = active.map(c => `   • ${c.label} — ${c.description}`);
  return `\n━━ 🎭 COMBINAISON D'ÉTAT ━━\n${lines.join('\n')}\nCe combo affine ta posture du moment, sans la jouer en surface.`;
}

module.exports = {
  COMBOS,
  getActiveCombos,
  getEmotionCombosBlock,
};
