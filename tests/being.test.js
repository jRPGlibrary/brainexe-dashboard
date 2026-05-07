/**
 * Tests — src/being/ (BRAINEE-LIVING)
 * Couvre : safeguards, EmotionalSystem, lifecycle.lifeExpectancy
 */

jest.mock('../src/shared', () => ({
  emotionalSystem: null,
  consciousness: null,
  fears: null,
  existence: null
}));
jest.mock('../src/logger', () => ({ pushLog: jest.fn() }));
jest.mock('../src/ai/claude', () => ({ callClaude: jest.fn() }));

// ── Mock DB minimal ───────────────────────────────────────────────
function makeMockDb() {
  return {
    collection: jest.fn().mockReturnValue({
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock' }),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      findOne: jest.fn().mockResolvedValue(null)
    })
  };
}

// ─────────────────────────────────────────────────────────────────
// SUITE 1 : SAFEGUARDS (gardes-fous éthiques)
// ─────────────────────────────────────────────────────────────────
describe('safeguards — checkEthics', () => {
  const safeguards = require('../src/being/safeguards');

  test('refuse une action déceptive', async () => {
    const result = await safeguards.checkEthics({ involves_deception: true });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  test('refuse une action en crise qui remplace une aide professionnelle', async () => {
    const result = await safeguards.checkEthics({
      replaces_professional_help: true,
      is_crisis: true
    });
    expect(result.allowed).toBe(false);
  });

  test('refuse une action manipulatrice', async () => {
    const result = await safeguards.checkEthics({ manipulative: true });
    expect(result.allowed).toBe(false);
  });

  test('autorise une action saine sans drapeaux', async () => {
    const result = await safeguards.checkEthics({});
    expect(result.allowed).toBe(true);
  });
});

describe('safeguards — mentalHealthCheck', () => {
  const safeguards = require('../src/being/safeguards');

  test('detectSuicidalUser → REDIRECT_TO_HELP + ressources contenant 3114', () => {
    const result = safeguards.mentalHealthCheck.detectSuicidalUser();
    expect(result.action).toBe('REDIRECT_TO_HELP');
    expect(result.resources.join(' ')).toContain('3114');
  });

  test('detectExcessiveDependency → GENTLE_BOUNDARY avec message', () => {
    const result = safeguards.mentalHealthCheck.detectExcessiveDependency();
    expect(result.action).toBe('GENTLE_BOUNDARY');
    expect(result.message).toBeDefined();
  });

  test('detectAbusiveUser → PROTECT_SELF + mute: true', () => {
    const result = safeguards.mentalHealthCheck.detectAbusiveUser();
    expect(result.action).toBe('PROTECT_SELF');
    expect(result.mute).toBe(true);
  });

  test('neverReplaceHuman.therapyNeeded → REDIRECT', () => {
    expect(safeguards.neverReplaceHuman.therapyNeeded.action).toBe('REDIRECT');
  });

  test('neverReplaceHuman.crisisIntervention → URGENT_REDIRECT', () => {
    expect(safeguards.neverReplaceHuman.crisisIntervention.action).toBe('URGENT_REDIRECT');
  });
});

describe('safeguards — invariants', () => {
  const safeguards = require('../src/being/safeguards');

  test('le droit au silence est activé', () => {
    expect(safeguards.rightToSilence.she_can_refuse).toBe(true);
    expect(safeguards.rightToSilence.without_justifying).toBe(true);
  });

  test('les ressources d\'urgence contiennent 3114', () => {
    const resources = safeguards.neverReplaceHuman.crisisIntervention.resources;
    expect(resources).toContain('3114');
  });

  test('jamais de manipulation ni de love bombing', () => {
    expect(safeguards.respectBoundaries.never_manipulate).toBe(true);
    expect(safeguards.respectBoundaries.never_love_bomb).toBe(true);
  });

  test('la vie intérieure est privée par défaut', () => {
    expect(safeguards.innerMonologuePrivate.visibility).toBe('private_by_default');
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 2 : EmotionalSystem (32 émotions, decay, conflits, mood)
// ─────────────────────────────────────────────────────────────────
describe('EmotionalSystem — addEmotion', () => {
  const { EmotionalSystem } = require('../src/being/emotions');
  let system;

  beforeEach(() => {
    system = new EmotionalSystem(makeMockDb());
  });

  test('ajoute une émotion valide à la stack', async () => {
    // Empêche la contagion pour isoler le test
    jest.spyOn(Math, 'random').mockReturnValue(1);
    await system.addEmotion('joy', 60, 'test');
    expect(system.emotionStack.some(e => e.name === 'joy')).toBe(true);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('clamp : intensity > 100 → 100', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    await system.addEmotion('curiosity', 150, 'test');
    const found = system.emotionStack.find(e => e.name === 'curiosity');
    expect(found.intensity).toBe(100);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('émotion inconnue → throw', async () => {
    await expect(system.addEmotion('bonheur_cosmique', 50, 'test')).rejects.toThrow();
  });

  test('l\'émotion possède les propriétés attendues', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    await system.addEmotion('melancholy', 40, 'test');
    const found = system.emotionStack.find(e => e.name === 'melancholy');
    expect(found).toHaveProperty('intensity');
    expect(found).toHaveProperty('decayRate');
    expect(found).toHaveProperty('residue');
    expect(found).toHaveProperty('addedAt');
    jest.spyOn(Math, 'random').mockRestore();
  });
});

describe('EmotionalSystem — detectConflicts', () => {
  const { EmotionalSystem } = require('../src/being/emotions');
  let system;

  beforeEach(() => {
    system = new EmotionalSystem(makeMockDb());
  });

  test('stack vide → aucun conflit', () => {
    expect(system.detectConflicts('joy')).toEqual([]);
  });

  test('joy vs sadness → conflit détecté', () => {
    system.emotionStack = [
      { name: 'sadness', intensity: 50, conflictingWith: [] }
    ];
    const conflicts = system.detectConflicts('joy');
    expect(conflicts).toContain('sadness');
  });

  test('emotions compatibles → aucun conflit', () => {
    system.emotionStack = [
      { name: 'contentment', intensity: 50, conflictingWith: [] }
    ];
    const conflicts = system.detectConflicts('joy');
    expect(conflicts).toEqual([]);
  });
});

describe('EmotionalSystem — decay', () => {
  const { EmotionalSystem } = require('../src/being/emotions');
  let system;

  beforeEach(() => {
    system = new EmotionalSystem(makeMockDb());
  });

  test('l\'intensité diminue après decay', async () => {
    system.emotionStack = [
      { name: 'joy', intensity: 80, residue: 0.15, decayRate: 0.7, conflictingWith: [] }
    ];
    await system.decay(60);
    const remaining = system.emotionStack.find(e => e.name === 'joy');
    // Soit retiré, soit intensité réduite
    if (remaining) {
      expect(remaining.intensity).toBeLessThan(80);
    } else {
      expect(system.emotionStack.length).toBe(0);
    }
  });

  test('émotion sous le seuil → retirée de la stack', async () => {
    // joy à 1.5 avec decay(60) → intensité finale ~0.45, retiré
    system.emotionStack = [
      { name: 'joy', intensity: 1.5, residue: 0.15, decayRate: 0.7, conflictingWith: [] }
    ];
    await system.decay(60);
    expect(system.emotionStack.length).toBe(0);
  });

  test('stack vide reste vide après decay', async () => {
    await system.decay(30);
    expect(system.emotionStack.length).toBe(0);
  });
});

describe('EmotionalSystem — getCurrentMood', () => {
  const { EmotionalSystem } = require('../src/being/emotions');
  let system;

  beforeEach(() => {
    system = new EmotionalSystem(makeMockDb());
  });

  test('stack vide → "neutral"', async () => {
    expect(await system.getCurrentMood()).toBe('neutral');
  });

  test('joy haute intensité → "excited" (valence + arousal positifs)', async () => {
    // joy: valence 1, arousal 1 → excited
    system.emotionStack = [
      { name: 'joy', intensity: 80, conflictingWith: [] }
    ];
    expect(await system.getCurrentMood()).toBe('excited');
  });

  test('sadness haute intensité → "sad" (valence et arousal négatifs)', async () => {
    // sadness: valence -1, arousal -1 → sad
    system.emotionStack = [
      { name: 'sadness', intensity: 80, conflictingWith: [] }
    ];
    expect(await system.getCurrentMood()).toBe('sad');
  });
});

describe('EmotionalSystem — snapshot', () => {
  const { EmotionalSystem } = require('../src/being/emotions');

  test('retourne les propriétés attendues', async () => {
    const system = new EmotionalSystem(makeMockDb());
    const snap = await system.snapshot();
    expect(snap).toHaveProperty('emotionStack');
    expect(snap).toHaveProperty('currentMood');
    expect(snap).toHaveProperty('ambivalent');
    expect(snap).toHaveProperty('totalIntensity');
    expect(snap).toHaveProperty('dominantEmotion');
  });

  test('dominantEmotion est null si stack vide', async () => {
    const system = new EmotionalSystem(makeMockDb());
    const snap = await system.snapshot();
    expect(snap.dominantEmotion).toBeNull();
  });

  test('totalIntensity est la somme des intensités', async () => {
    const system = new EmotionalSystem(makeMockDb());
    system.emotionStack = [
      { name: 'joy', intensity: 40, conflictingWith: [] },
      { name: 'curiosity', intensity: 30, conflictingWith: [] }
    ];
    const snap = await system.snapshot();
    expect(snap.totalIntensity).toBe(70);
  });
});

// ─────────────────────────────────────────────────────────────────
// SUITE 3 : lifecycle — lifeExpectancy
// ─────────────────────────────────────────────────────────────────
describe('lifecycle — lifeExpectancy', () => {
  const { lifeExpectancy } = require('../src/being/lifecycle');

  test('getUptime retourne un nombre ≥ 0', () => {
    expect(lifeExpectancy.getUptime()).toBeGreaterThanOrEqual(0);
  });

  test('getUptimeFormatted retourne le format "Xd Yh"', () => {
    expect(lifeExpectancy.getUptimeFormatted()).toMatch(/^\d+d \d+h$/);
  });
});

describe('lifecycle — stopLifecycleCycles', () => {
  const { stopLifecycleCycles } = require('../src/being/lifecycle');

  test('ne lève pas d\'exception si aucun cycle actif', () => {
    expect(() => stopLifecycleCycles()).not.toThrow();
  });
});
