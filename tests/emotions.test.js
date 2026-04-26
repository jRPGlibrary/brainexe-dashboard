/**
 * Tests — src/bot/emotions.js
 * Système d'états internes, d'émotions et de tempérament
 */

jest.mock('../src/shared', () => ({ mongoDb: null }));
jest.mock('../src/logger', () => ({ pushLog: jest.fn() }));

const {
  TEMPERAMENT,
  ALL_EMOTIONS,
  getInternalState,
  getEmotionStack,
  getTemperament,
  setInternalStateValue,
  triggerEmotion,
  decayEmotions,
  getDominantEmotion,
  getActiveEmotions,
  adjustMaxTokens,
  updateInternalStatesForSlot,
  getHumanizationSignal,
} = require('../src/bot/emotions');

// Réinitialise l'état entre chaque test pour éviter les interférences
beforeEach(() => {
  // Remet les états internes aux valeurs par défaut connues
  setInternalStateValue('energy', 65);
  setInternalStateValue('socialNeed', 50);
  setInternalStateValue('calmNeed', 30);
  setInternalStateValue('stimulation', 55);
  setInternalStateValue('mentalLoad', 35);
  setInternalStateValue('recognitionNeed', 40);
});

// ── getInternalState ──────────────────────────────────────────────
describe('getInternalState', () => {
  test('retourne un objet avec les 6 clés attendues', () => {
    const s = getInternalState();
    expect(s).toHaveProperty('energy');
    expect(s).toHaveProperty('socialNeed');
    expect(s).toHaveProperty('calmNeed');
    expect(s).toHaveProperty('stimulation');
    expect(s).toHaveProperty('mentalLoad');
    expect(s).toHaveProperty('recognitionNeed');
  });

  test('les valeurs sont dans la plage 0-100', () => {
    const s = getInternalState();
    for (const [k, v] of Object.entries(s)) {
      if (k === 'lastUpdate') continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  test('retourne une copie (pas une référence directe)', () => {
    const s1 = getInternalState();
    s1.energy = 999;
    const s2 = getInternalState();
    expect(s2.energy).not.toBe(999);
  });
});

// ── getTemperament ────────────────────────────────────────────────
describe('getTemperament', () => {
  test('retourne un objet avec les traits attendus', () => {
    const t = getTemperament();
    expect(t).toHaveProperty('humor');
    expect(t).toHaveProperty('loyalty');
    expect(t).toHaveProperty('curiosity');
    expect(t).toHaveProperty('empathy');
    expect(t).toHaveProperty('debateLove');
  });

  test('toutes les valeurs de tempérament sont 0-100', () => {
    const t = getTemperament();
    for (const v of Object.values(t)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  test('loyalty est très élevé (≥ 90)', () => {
    expect(getTemperament().loyalty).toBeGreaterThanOrEqual(90);
  });
});

// ── setInternalStateValue ─────────────────────────────────────────
describe('setInternalStateValue', () => {
  test('définit une valeur valide', () => {
    setInternalStateValue('energy', 80);
    expect(getInternalState().energy).toBe(80);
  });

  test('clamp : valeur > 100 → 100', () => {
    setInternalStateValue('energy', 150);
    expect(getInternalState().energy).toBe(100);
  });

  test('clamp : valeur < 0 → 0', () => {
    setInternalStateValue('mentalLoad', -20);
    expect(getInternalState().mentalLoad).toBe(0);
  });

  test('ignore une clé inconnue sans lever d\'exception', () => {
    expect(() => setInternalStateValue('inexistant', 50)).not.toThrow();
  });
});

// ── triggerEmotion ────────────────────────────────────────────────
describe('triggerEmotion', () => {
  beforeEach(() => {
    // Vider la stack avant chaque test de cette suite
    decayEmotions();
  });

  test('ajoute une émotion valide à la stack', () => {
    const before = getEmotionStack().length;
    triggerEmotion('curiosity', 50);
    expect(getEmotionStack().length).toBeGreaterThan(before);
  });

  test('l\'émotion ajoutée a le bon nom', () => {
    triggerEmotion('joy', 60);
    const stack = getEmotionStack();
    const found = stack.find(e => e.name === 'joy');
    expect(found).toBeDefined();
  });

  test('ignore une émotion inconnue', () => {
    const before = getEmotionStack().length;
    triggerEmotion('colère_cosmique', 80);
    expect(getEmotionStack().length).toBe(before);
  });

  test('l\'intensité est dans la plage 0-100', () => {
    triggerEmotion('amusement', 120);
    const stack = getEmotionStack();
    const found = stack.find(e => e.name === 'amusement');
    expect(found.intensity).toBeLessThanOrEqual(100);
  });

  test('la stack ne dépasse pas 12 émotions', () => {
    for (let i = 0; i < 20; i++) {
      triggerEmotion('curiosity', 50);
    }
    expect(getEmotionStack().length).toBeLessThanOrEqual(12);
  });
});

// ── getEmotionStack ───────────────────────────────────────────────
describe('getEmotionStack', () => {
  test('retourne un tableau', () => {
    expect(Array.isArray(getEmotionStack())).toBe(true);
  });

  test('retourne une copie (pas une référence directe)', () => {
    const s1 = getEmotionStack();
    s1.push({ name: 'fake', intensity: 99 });
    const s2 = getEmotionStack();
    expect(s2.find(e => e.name === 'fake')).toBeUndefined();
  });
});

// ── updateInternalStatesForSlot ───────────────────────────────────
describe('updateInternalStatesForSlot', () => {
  test('slot sleep diminue l\'énergie', () => {
    setInternalStateValue('energy', 65);
    updateInternalStatesForSlot({ status: 'sleep' });
    expect(getInternalState().energy).toBeLessThan(65);
  });

  test('slot gaming augmente l\'énergie', () => {
    setInternalStateValue('energy', 50);
    updateInternalStatesForSlot({ status: 'gaming' });
    expect(getInternalState().energy).toBeGreaterThan(50);
  });

  test('ne lève pas d\'exception pour un slot inconnu', () => {
    expect(() => updateInternalStatesForSlot({ status: 'inconnu' })).not.toThrow();
  });

  test('ne lève pas d\'exception si slot est undefined', () => {
    expect(() => updateInternalStatesForSlot(undefined)).not.toThrow();
  });
});

// ── adjustMaxTokens ───────────────────────────────────────────────
describe('adjustMaxTokens', () => {
  test('réduit les tokens si énergie faible (< 30)', () => {
    setInternalStateValue('energy', 20);
    setInternalStateValue('mentalLoad', 30);
    expect(adjustMaxTokens(1000)).toBeLessThan(1000);
  });

  test('réduit les tokens si charge mentale élevée (> 75)', () => {
    setInternalStateValue('energy', 65);
    setInternalStateValue('mentalLoad', 80);
    expect(adjustMaxTokens(1000)).toBeLessThan(1000);
  });

  test('augmente les tokens si énergie haute et charge faible', () => {
    setInternalStateValue('energy', 85);
    setInternalStateValue('mentalLoad', 30);
    expect(adjustMaxTokens(1000)).toBeGreaterThan(1000);
  });

  test('retourne les tokens de base dans un état normal', () => {
    setInternalStateValue('energy', 65);
    setInternalStateValue('mentalLoad', 35);
    expect(adjustMaxTokens(1000)).toBe(1000);
  });
});

// ── ALL_EMOTIONS ──────────────────────────────────────────────────
describe('ALL_EMOTIONS', () => {
  test('contient au moins 20 émotions', () => {
    expect(ALL_EMOTIONS.length).toBeGreaterThanOrEqual(20);
  });

  test('contient des émotions de base attendues', () => {
    expect(ALL_EMOTIONS).toContain('curiosity');
    expect(ALL_EMOTIONS).toContain('amusement');
    expect(ALL_EMOTIONS).toContain('joy');
    expect(ALL_EMOTIONS).toContain('annoyance');
    expect(ALL_EMOTIONS).toContain('melancholy');
  });
});
