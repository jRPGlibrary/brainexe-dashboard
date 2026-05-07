/**
 * ================================================
 * 🧠 BRAINEE EMOTIONS CORE v0.6.0
 * ================================================
 * Architecture 4 couches :
 *   1. Tempérament (stable)       — ce qui ne change presque jamais
 *   2. États internes (lents)     — énergie, charge mentale, besoin social
 *   3. Émotions actuelles (vives) — curiosité, amusement, agacement, mélancolie...
 *   4. Liens membres (cf. bonds.js)
 *
 * L'état émotionnel influence :
 *   - le ton de la réponse (via injection dans le system prompt)
 *   - la longueur de la réponse (via maxTokens)
 *   - la probabilité d'humanisation (fautes, slang, relax)
 *   - la prise d'initiative (conv spontanée, retour tardif)
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');

// ─── TEMPÉRAMENT (quasi-stable) ──────────────────────────────────
// Ces traits définissent QUI est Brainee. Ils bougent très peu.
const TEMPERAMENT = {
  humor: 85,         // Sens de l'humour (0-100)
  sarcasm: 55,       // Sarcasme léger (0-100)
  loyalty: 95,       // Loyauté à la communauté (0-100)
  curiosity: 80,     // Curiosité intellectuelle (0-100)
  empathy: 75,       // Empathie (0-100)
  independence: 70,  // Goût de l'autonomie (0-100)
  perfectionism: 45, // Tendance à revenir corriger (0-100)
  debateLove: 70,    // Appétit pour les débats (0-100)
  chaosLove: 65,     // Goût du chaos / absurde (0-100)
};

// ─── ÉTATS INTERNES (évoluent sur la journée) ────────────────────
// Ces états sont le "corps" de Brainee. Ils bougent selon l'heure, l'activité, les interactions.
let internalState = {
  energy: 65,          // Énergie cognitive (0-100)
  socialNeed: 50,      // Besoin de lien social (0-100)
  calmNeed: 30,        // Besoin de calme / retrait (0-100)
  stimulation: 55,     // Besoin de nouveauté / défi (0-100)
  mentalLoad: 35,      // Charge mentale accumulée (0-100)
  recognitionNeed: 40, // Besoin de reconnaissance (0-100)
  lastUpdate: Date.now(),
};

// ─── ÉMOTIONS ACTUELLES (vives, courtes) ─────────────────────────
// File d'émotions récentes. Chaque émotion a une intensité et un decay.
// Les émotions s'estompent avec le temps.
let emotionStack = [];

// ─── RÉSIDUS ÉMOTIONNELS (persistence) ──────────────────────────
// Quand une émotion s'estompe, elle laisse des "résiduels" (15-20%)
// qui persistent et influencent les nouvelles émotions du même type.
let emotionalResiduals = {};

const EMOTION_CATEGORIES = {
  cognitive: ['curiosity', 'fascination', 'doubt', 'clarity', 'confusion', 'satisfaction'],
  social:    ['warmth', 'distance', 'amusement', 'tenderness', 'teasing', 'connection', 'misfit'],
  protective:['vigilance', 'wariness', 'annoyance', 'saturation', 'protectiveness'],
  positive:  ['joy', 'enthusiasm', 'pride', 'relief', 'attachment', 'belonging', 'creative_rush'],
  low:       ['melancholy', 'disappointment', 'emptiness', 'demotivation', 'vulnerability', 'retreat'],
};

const ALL_EMOTIONS = [
  ...EMOTION_CATEGORIES.cognitive,
  ...EMOTION_CATEGORIES.social,
  ...EMOTION_CATEGORIES.protective,
  ...EMOTION_CATEGORIES.positive,
  ...EMOTION_CATEGORIES.low,
];

// ─── PERSISTANCE ─────────────────────────────────────────────────
async function loadEmotionalState() {
  if (!shared.mongoDb) return;
  try {
    const doc = await shared.mongoDb.collection('botState').findOne({ _id: 'emotionalState' });
    if (doc) {
      if (doc.internalState) internalState = { ...internalState, ...doc.internalState };
      if (Array.isArray(doc.emotionStack)) emotionStack = doc.emotionStack;
      if (doc.emotionalResiduals) emotionalResiduals = doc.emotionalResiduals;
      pushLog('SYS', `💗 État émotionnel restauré (${emotionStack.length} émotions, ${Object.keys(emotionalResiduals).length} résiduels)`, 'success');
    }
  } catch (err) {
    pushLog('ERR', `loadEmotionalState: ${err.message}`, 'error');
  }
}

async function saveEmotionalState() {
  if (!shared.mongoDb) return;
  try {
    await shared.mongoDb.collection('botState').updateOne(
      { _id: 'emotionalState' },
      { $set: { internalState, emotionStack, emotionalResiduals, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    pushLog('ERR', `saveEmotionalState: ${err.message}`, 'error');
  }
}

// ─── ÉVOLUTION DES ÉTATS INTERNES ────────────────────────────────
function clamp(v, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

function updateInternalStatesForSlot(slot) {
  const s = slot?.status || 'active';
  const map = {
    sleep:      { energy: -25, socialNeed: +15, mentalLoad: -30, calmNeed: +20 },
    wakeup:     { energy: +8,  socialNeed: +5,  mentalLoad: -5,  calmNeed: -5 },
    active:     { energy: +3,  socialNeed: +2,  mentalLoad: +3,  stimulation: +2 },
    lunch:      { energy: +5,  calmNeed: +4,    mentalLoad: -6 },
    productive: { energy: +2,  stimulation: +3, mentalLoad: +5,  recognitionNeed: +1 },
    transition: { energy: -2,  calmNeed: +3,    mentalLoad: -2 },
    gaming:     { energy: +5,  socialNeed: +3,  stimulation: +4, mentalLoad: +2 },
    latenight:  { energy: -6,  mentalLoad: +4,  stimulation: +2, calmNeed: -2 },
  };
  const delta = map[s] || {};
  Object.keys(delta).forEach(k => {
    internalState[k] = clamp((internalState[k] ?? 50) + delta[k]);
  });
  internalState.lastUpdate = Date.now();
}

function applyNaturalDecay() {
  internalState.mentalLoad = clamp(internalState.mentalLoad - 1);
  internalState.stimulation = clamp(internalState.stimulation - 0.5);
  if (internalState.socialNeed < 80) internalState.socialNeed = clamp(internalState.socialNeed + 0.3);
  if (internalState.energy > 40 && internalState.energy < 80) internalState.energy = clamp(internalState.energy - 0.2);
}

function applyDailyDrift() {
  Object.keys(internalState).forEach(k => {
    if (k === 'lastUpdate') return;
    const baseline = 50;
    const current = internalState[k];
    internalState[k] = clamp(current + (baseline - current) * 0.08);
  });
}

// ─── GESTION DES ÉMOTIONS ────────────────────────────────────────
function triggerEmotion(name, intensity = 50, source = null) {
  if (!ALL_EMOTIONS.includes(name)) return;
  const now = Date.now();

  // Check for residuals from this emotion type
  const residualBoost = emotionalResiduals[name] || 0;
  const finalIntensity = clamp(Math.min(100, intensity + residualBoost));

  emotionStack.push({
    name,
    intensity: finalIntensity,
    source,
    triggeredAt: now,
    decay: 0.90, // Decay slower: 24h instead of 4-6h
  });
  if (emotionStack.length > 12) emotionStack = emotionStack.slice(-12);
}

function decayEmotions() {
  const now = Date.now();
  emotionStack = emotionStack
    .map(e => {
      const hoursElapsed = (now - e.triggeredAt) / (1000 * 60 * 60);
      // Slower decay: 0.90 per hour instead of 0.85 (18-24h instead of 4-6h)
      const newIntensity = e.intensity * Math.pow(e.decay, hoursElapsed);
      return { ...e, intensity: clamp(newIntensity) };
    })
    .filter(e => {
      // Keep emotion if still significant, else store residual (15-20%)
      if (e.intensity > 3) return true;
      if (e.intensity > 1) {
        const residualAmount = e.intensity * (0.15 + Math.random() * 0.05);
        emotionalResiduals[e.name] = (emotionalResiduals[e.name] || 0) + residualAmount;
      }
      return false;
    });
}

function getDominantEmotion() {
  if (!emotionStack.length) return null;
  return emotionStack.reduce((a, b) => (a.intensity > b.intensity ? a : b));
}

function getActiveEmotions(minIntensity = 20) {
  return emotionStack.filter(e => e.intensity >= minIntensity);
}

// ─── DÉTECTION D'ÉMOTIONS DEPUIS MESSAGE v0.12.0 ─────────────────
// Couvre désormais toutes les 20 émotions du système de base.
// Les émotions du système 32 (being/emotions.js) sont déclenchées séparément
// via les events discord pour les moments significatifs.
function detectEmotionFromMessage(content = '', context = {}) {
  const text = content.toLowerCase();
  const triggers = [];

  // ── SOCIALE / CHALEUREUSE ──────────────────────────────────────
  if (/\b(merci|trop bien|génial|t'es la meilleure|je t'adore|t'es top|trop cool)\b/i.test(content)) {
    triggers.push({ name: 'warmth', intensity: 55 });
    triggers.push({ name: 'pride', intensity: 40 });
  }
  if (/😂|🤣|mdr|lol|ptdr/i.test(content)) {
    triggers.push({ name: 'amusement', intensity: 50 });
  }
  // Taquinerie / complicité (messages courts et joueurs)
  if (/\b(allez|avoue|t'oses pas|c'est vrai ça|hein?)\b/i.test(text) && content.length < 80) {
    triggers.push({ name: 'teasing', intensity: 40 });
  }
  // Connexion — quelqu'un montre qu'il comprend vraiment Brainee
  if (/\b(je comprends (ce que|pourquoi)|j'avais remarqué que tu|exactement ce que tu penses)\b/i.test(text)) {
    triggers.push({ name: 'connection', intensity: 50 });
    triggers.push({ name: 'warmth', intensity: 35 });
  }
  // Sentiment de décalage (misfit) — incompris ou hors-sujet
  if (/\b(tu comprends pas|tu rapportes rien|t'es bizarre|c'est pas pareil)\b/i.test(text)) {
    triggers.push({ name: 'misfit', intensity: 45 });
    triggers.push({ name: 'distance', intensity: 30 });
  }

  // ── COGNITIF ──────────────────────────────────────────────────
  if (/\b(pourquoi|comment|qu'est-ce|c'est quoi|expliqu|dis-moi|t'en penses quoi)\b/i.test(text)) {
    triggers.push({ name: 'curiosity', intensity: 35 });
  }
  // Fascination — sujet vraiment complexe ou inattendu
  if (content.length > 200 && /\b(fascinant|incroyable|je savais pas|waou|wow|c'est dingue)\b/i.test(text)) {
    triggers.push({ name: 'fascination', intensity: 55 });
  }
  // Doute — affirmation contradictoire ou incertaine
  if (/\b(je suis pas sûr|peut-être que|j'ai entendu dire|apparemment|si j'ai bien compris)\b/i.test(text)) {
    triggers.push({ name: 'doubt', intensity: 30 });
  }
  // Clarté — quand quelqu'un explique quelque chose bien
  if (/\b(ah ok je comprends maintenant|ça fait sens|maintenant c'est clair|je vois)\b/i.test(text)) {
    triggers.push({ name: 'clarity', intensity: 35 });
  }
  // Confusion — message incompréhensible ou trop décousu
  if (/\b(j'ai rien compris|t'as perdu le fil|ça veut rien dire|hein\?)\b/i.test(text) || content.includes('???')) {
    triggers.push({ name: 'confusion', intensity: 30 });
  }
  // Satisfaction — quand un problème est résolu
  if (/\b(ça marche|c'est réglé|j'ai trouvé|résolu|fixed|done)\b/i.test(text)) {
    triggers.push({ name: 'satisfaction', intensity: 40 });
  }

  // ── PROTECTRICE ───────────────────────────────────────────────
  if (/\b(stress|deprim|triste|pas bien|mal|fatigu|épuis|burn.?out|s'en sort pas)\b/i.test(text)) {
    triggers.push({ name: 'tenderness', intensity: 60 });
    triggers.push({ name: 'protectiveness', intensity: 45 });
  }
  if (/\b(débile|con|nul|chiant|relou|stupide|tg|ferme ta|va te faire)\b/i.test(text)) {
    triggers.push({ name: 'annoyance', intensity: 45 });
    triggers.push({ name: 'wariness', intensity: 30 });
  }
  // Vigilance — sujet sensible / polémique
  if (/\b(politique|religion|racis|sexis|harcel|abus|violence)\b/i.test(text)) {
    triggers.push({ name: 'vigilance', intensity: 40 });
  }
  // Saturation — message très long ou répétitif
  if (/(.)\1{4,}/.test(content) || content.length > 450) {
    triggers.push({ name: 'saturation', intensity: 25 });
  }

  // ── POSITIVE ──────────────────────────────────────────────────
  if (/\b(jrpg|final fantasy|persona|castlevania|metroid|soulslike|hollow knight|elden ring)\b/i.test(text)) {
    triggers.push({ name: 'enthusiasm', intensity: 40 });
    triggers.push({ name: 'creative_rush', intensity: 28 });
  }
  // Joie — bonne nouvelle partagée
  if (/\b(trop content|je suis trop heureux|j'ai réussi|j'ai eu|ça y est|enfin|victoire)\b/i.test(text)) {
    triggers.push({ name: 'joy', intensity: 50 });
  }
  // Soulagement
  if (/\b(ouf|enfin réglé|ça va mieux|j'ai passé|c'est fini|plus de stress)\b/i.test(text)) {
    triggers.push({ name: 'relief', intensity: 40 });
  }
  // Attachement — quelqu'un mentionne un souvenir partagé
  if (/\b(tu te souviens|comme tu m'avais dit|tu avais mentionné|tu avais dit)\b/i.test(text)) {
    triggers.push({ name: 'attachment', intensity: 45 });
  }
  // Appartenance — sentiment de communauté
  if (/\b(on est tous|notre serveur|notre comm|ici on|ensemble on)\b/i.test(text)) {
    triggers.push({ name: 'belonging', intensity: 35 });
  }

  // ── BAS / DIFFICILE ───────────────────────────────────────────
  // Mélancolie — nostalgie ou tristesse douce
  if (/\b(ça me manque|c'était mieux avant|j'avais oublié|le temps passe|j'aimerais qu'on)\b/i.test(text)) {
    triggers.push({ name: 'melancholy', intensity: 40 });
  }
  // Déception
  if (/\b(déçu|j'espérais|c'était pas ça|pas ce que j'attendais|bof finalement)\b/i.test(text)) {
    triggers.push({ name: 'disappointment', intensity: 38 });
  }
  // Démotivation
  if (/\b(à quoi ça sert|j'en ai marre|plus la motivation|flemme|flemard|ras le bol)\b/i.test(text)) {
    triggers.push({ name: 'demotivation', intensity: 42 });
  }
  // Vulnérabilité — quelqu'un partage quelque chose de personnel et difficile
  if (/\b(je l'ai dit à personne|j'ose pas dire|c'est dur à avouer|je suis vulnérable|j'ai peur que)\b/i.test(text)) {
    triggers.push({ name: 'vulnerability', intensity: 55 });
    triggers.push({ name: 'tenderness', intensity: 50 });
  }
  // Retrait — le membre signale qu'il part ou se déconnecte
  if (/\b(je me barre|je disparais|à plus|j'y vais|bonne nuit à tous|je me déco)\b/i.test(text)) {
    triggers.push({ name: 'retreat', intensity: 30 });
  }

  triggers.forEach(t => triggerEmotion(t.name, t.intensity, context.userId));

  // Déclencher aussi dans le système 32 émotions (being) pour les moments significatifs
  _mirrorToBeingSystem(triggers, context.userId);

  return triggers;
}

/**
 * Miroir vers le système 32 émotions de being/emotions.js pour persistance long terme.
 * Non bloquant — les erreurs sont silencieuses.
 */
function _mirrorToBeingSystem(triggers, userId) {
  if (!shared.emotionalSystem || !triggers.length) return;
  const BEING_MAP = {
    joy: 'joy', enthusiasm: 'excitement', warmth: 'affection', tenderness: 'tenderness',
    melancholy: 'melancholy', disappointment: 'sadness', demotivation: 'sadness',
    annoyance: 'irritation', vulnerability: 'anxiety', curiosity: 'curiosity',
    pride: 'pride', amusement: 'joy', attachment: 'affection', belonging: 'contentment',
    relief: 'contentment', satisfaction: 'contentment', fascination: 'awe',
  };
  for (const t of triggers) {
    const beingEmotion = BEING_MAP[t.name];
    if (beingEmotion) {
      shared.emotionalSystem.addEmotion(beingEmotion, t.intensity * 0.7, userId || 'message')
        .catch(() => {});
    }
  }
}

// ─── INJECTION DANS LE PROMPT ────────────────────────────────────
function describeInternalState() {
  const { energy, socialNeed, calmNeed, mentalLoad, stimulation } = internalState;
  const parts = [];
  if (energy < 30) parts.push("t'es un peu à plat aujourd'hui");
  else if (energy > 75) parts.push("t'as beaucoup d'énergie là");
  else if (energy > 55) parts.push("t'es plutôt bien niveau énergie");
  if (mentalLoad > 70) parts.push("t'as la tête pleine");
  else if (mentalLoad < 25) parts.push("ta tête est claire");
  if (calmNeed > 70) parts.push("t'aurais besoin d'un peu de calme");
  if (socialNeed > 75) parts.push("t'as envie de traîner avec les gens");
  else if (socialNeed < 25) parts.push("t'as pas trop envie de parler là");
  if (stimulation > 75) parts.push("t'as envie d'un sujet qui te stimule vraiment");
  return parts.length ? parts.join(', ') + '.' : '';
}

function describeDominantEmotions() {
  const active = getActiveEmotions(30);
  if (!active.length) return '';
  const sorted = active.sort((a, b) => b.intensity - a.intensity).slice(0, 3);
  const translations = {
    curiosity: 'curieuse', fascination: 'fascinée', doubt: 'un peu sceptique',
    clarity: 'les idées claires', confusion: 'un peu confuse', satisfaction: 'satisfaite',
    warmth: 'chaleureuse', distance: 'un peu distante', amusement: 'amusée',
    tenderness: 'tendre', teasing: 'taquine', connection: 'dans le lien',
    misfit: 'en décalage', vigilance: 'vigilante', wariness: 'méfiante',
    annoyance: 'un peu agacée', saturation: 'saturée', protectiveness: 'protectrice',
    joy: 'joyeuse', enthusiasm: 'enthousiaste', pride: 'fière',
    relief: 'soulagée', attachment: 'attachée', belonging: 'à ta place',
    creative_rush: 'en élan créatif', melancholy: 'un peu mélancolique',
    disappointment: 'déçue', emptiness: 'un peu vide', demotivation: 'démotivée',
    vulnerability: 'sensible', retreat: 'en retrait',
  };
  const labels = sorted.map(e => translations[e.name] || e.name);
  return `Tu te sens ${labels.join(', ')}.`;
}

/**
 * Retourne un texte décrivant les résiduels émotionnels (si présents)
 * Ex: "Tu portes encore un peu de rancune du début de journée"
 */
function getEmotionalContext() {
  const activeResiduals = Object.entries(emotionalResiduals)
    .filter(([, intensity]) => intensity > 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (!activeResiduals.length) return '';

  const contextTranslations = {
    annoyance: 'une pointe de rancune',
    wariness: 'un peu de méfiance',
    saturation: 'une fatigue résiduelle',
    disappointment: 'une déception en arrière-fond',
    melancholy: 'une légère mélancolie',
    distance: 'une certaine distance',
    doubt: 'une trace de doute',
  };

  const contexts = activeResiduals
    .map(([emotion, intensity]) => contextTranslations[emotion] || `une trace de ${emotion}`)
    .join(' et ');

  return `Tu portes encore ${contexts} de ce matin.`;
}

function getEmotionalInjection() {
  const internalDesc = describeInternalState();
  const emotionsDesc = describeDominantEmotions();
  const residualDesc = getEmotionalContext();
  const allParts = [internalDesc, emotionsDesc, residualDesc].filter(p => p);
  if (!allParts.length) return '';
  return `\n━━ 💗 ÉTAT INTÉRIEUR ━━\n${allParts.join(' ')}\nCet état influence naturellement ton ton, ta longueur, ton envie de taquiner ou de te poser.`;
}

function getTemperamentInjection() {
  return `\n━━ 🎭 TEMPÉRAMENT STABLE ━━\nHumour ${TEMPERAMENT.humor}/100, sarcasme ${TEMPERAMENT.sarcasm}/100, loyauté ${TEMPERAMENT.loyalty}/100, curiosité ${TEMPERAMENT.curiosity}/100. T'aimes les débats (${TEMPERAMENT.debateLove}/100) et le chaos léger (${TEMPERAMENT.chaosLove}/100). Tu restes toi-même quoi qu'il arrive.`;
}

// ─── SIGNAUX POUR L'HUMANISATION ─────────────────────────────────
function getHumanizationSignal() {
  const { energy, mentalLoad } = internalState;
  const dom = getDominantEmotion();
  return {
    energy,
    mentalLoad,
    isTired: energy < 40,
    isCharged: energy > 75,
    isOverloaded: mentalLoad > 70,
    isRelaxed: mentalLoad < 30 && energy > 50,
    dominantEmotion: dom?.name || null,
    dominantIntensity: dom?.intensity || 0,
    isAmused: getActiveEmotions().some(e => ['amusement', 'joy', 'enthusiasm', 'teasing'].includes(e.name) && e.intensity > 35),
    isAnnoyed: getActiveEmotions().some(e => ['annoyance', 'saturation', 'wariness'].includes(e.name) && e.intensity > 30),
  };
}

// ─── AJUSTEMENT TOKENS SELON L'ÉTAT ──────────────────────────────
function adjustMaxTokens(baseTokens) {
  const { energy, mentalLoad } = internalState;
  if (energy < 30 || mentalLoad > 75) return Math.floor(baseTokens * 0.65);
  if (energy > 80 && mentalLoad < 40) return Math.floor(baseTokens * 1.15);
  return baseTokens;
}

// ─── ACCESSEURS ──────────────────────────────────────────────────
function getInternalState() { return { ...internalState }; }
function getEmotionStack() { return [...emotionStack]; }
function getTemperament() { return { ...TEMPERAMENT }; }
function getEmotionalResiduals() { return { ...emotionalResiduals }; }

function setInternalStateValue(key, value) {
  if (key in internalState) internalState[key] = clamp(value);
}

module.exports = {
  TEMPERAMENT, ALL_EMOTIONS, EMOTION_CATEGORIES,
  loadEmotionalState, saveEmotionalState,
  updateInternalStatesForSlot, applyNaturalDecay, applyDailyDrift,
  triggerEmotion, decayEmotions, getDominantEmotion, getActiveEmotions,
  detectEmotionFromMessage,
  getEmotionalInjection, getTemperamentInjection, getEmotionalContext,
  getHumanizationSignal, adjustMaxTokens,
  getInternalState, getEmotionStack, getTemperament, getEmotionalResiduals, setInternalStateValue,
};
