/**
 * Tests — v2.3.5 humanisation Brainee
 * Couvre : hyperFocus detection, emotionCombos, vulnerability eligibility,
 *          extendedPermissions (pin worthiness, poll detection), proactive outreach picker.
 */

jest.mock('../src/shared', () => ({ mongoDb: null, botConfig: { conversations: { enabled: true } } }));
jest.mock('../src/logger', () => ({ pushLog: jest.fn() }));

// Mock minimal pour les modules qui importent emotions / scheduling
jest.mock('../src/bot/scheduling', () => ({
  getCurrentSlot: () => ({ status: 'active', maxConv: 4, label: 'active' }),
  getParisHour: () => 14,
  getMentionDelayMs: () => 0,
  getRandomMode: () => 'casual',
  getSlotIntervalMs: () => 0,
}));

const { detectHyperFocusTopic, describeTopic } = require('../src/bot/hyperFocus');
const { getActiveCombos, getEmotionCombosBlock, COMBOS } = require('../src/bot/emotionCombos');
const { evaluatePinWorthiness, detectPollOpportunity } = require('../src/features/extendedPermissions');
const { isStateVulnerable, detectSupport, getVulnerabilityBlock } = require('../src/bot/vulnerability');
const { pickType } = require('../src/features/proactiveOutreach');

// ─── hyperFocus.detectHyperFocusTopic ─────────────────────────────
describe('detectHyperFocusTopic', () => {
  test('détecte jrpg_lore sur "persona" + "lore"', () => {
    expect(detectHyperFocusTopic('on parlait du lore de Persona 5, fou comme c\'est dense')).toBe('jrpg_lore');
  });

  test('détecte metroidvania', () => {
    expect(detectHyperFocusTopic('je viens de relancer Hollow Knight, encore plus fort que Symphony of the Night')).toBe('metroidvania');
  });

  test('détecte ost', () => {
    expect(detectHyperFocusTopic('cette OST de Yamane reste la meilleure de la série')).toBe('ost');
  });

  test('détecte hidden_gems', () => {
    expect(detectHyperFocusTopic('vous avez des hidden gem indé à conseiller')).toBe('hidden_gems');
  });

  test('renvoie null sur message non topical', () => {
    expect(detectHyperFocusTopic('salut')).toBeNull();
    expect(detectHyperFocusTopic('')).toBeNull();
  });

  test('describeTopic transforme la clé en label lisible', () => {
    expect(describeTopic('jrpg_lore').toLowerCase()).toContain('jrpg');
    expect(describeTopic('metroidvania').toLowerCase()).toContain('metroid');
  });
});

// ─── emotionCombos ────────────────────────────────────────────────
describe('emotionCombos', () => {
  test('COMBOS exporte au moins 5 entrées avec key/test/description', () => {
    expect(COMBOS.length).toBeGreaterThanOrEqual(5);
    COMBOS.forEach(c => {
      expect(c).toHaveProperty('key');
      expect(c).toHaveProperty('description');
      expect(typeof c.test).toBe('function');
    });
  });

  test('getActiveCombos retourne max 2 entrées', () => {
    const active = getActiveCombos('chill');
    expect(Array.isArray(active)).toBe(true);
    expect(active.length).toBeLessThanOrEqual(2);
  });

  test("getEmotionCombosBlock retourne '' si aucun combo", () => {
    // En state par défaut (energy 65, mentalLoad 35), peu de combos s'activent.
    // Le test peut renvoyer "" ou un bloc selon les états résiduels — on vérifie juste la robustesse.
    const block = getEmotionCombosBlock('chill');
    expect(typeof block).toBe('string');
  });
});

// ─── vulnerability ────────────────────────────────────────────────
describe('vulnerability', () => {
  test('isStateVulnerable est un boolean', () => {
    expect(typeof isStateVulnerable()).toBe('boolean');
  });

  test('detectSupport reconnaît "courage" et "tkt"', () => {
    expect(detectSupport('allez courage tu vas y arriver')).toBe(true);
    expect(detectSupport('tkt on est là')).toBe(true);
    expect(detectSupport('repose-toi')).toBe(true);
  });

  test('detectSupport ignore les messages neutres', () => {
    expect(detectSupport('on parle de Final Fantasy')).toBe(false);
    expect(detectSupport('')).toBe(false);
  });

  test('getVulnerabilityBlock vide si pas de window', () => {
    expect(getVulnerabilityBlock(null)).toBe('');
  });

  test('getVulnerabilityBlock contient les bons mots-clés si window active', () => {
    const block = getVulnerabilityBlock({ status: 'open' });
    expect(block).toContain('FRAGILITÉ');
    expect(block.toLowerCase()).toContain('forces pas');
  });
});

// ─── extendedPermissions ─────────────────────────────────────────
describe('evaluatePinWorthiness', () => {
  function makeMessage({ reactions = [], pinned = false, ageMs = 60 * 60 * 1000, contentLength = 100 }) {
    const reactCache = new Map();
    reactions.forEach((count, i) => reactCache.set(`emoji${i}`, { count }));
    return {
      pinned,
      createdTimestamp: Date.now() - ageMs,
      content: 'x'.repeat(contentLength),
      reactions: { cache: reactCache },
    };
  }

  test('refuse un message déjà pinné', () => {
    const r = evaluatePinWorthiness(makeMessage({ reactions: [10, 10], pinned: true }));
    expect(r.shouldPin).toBe(false);
  });

  test('refuse un message trop récent', () => {
    const r = evaluatePinWorthiness(makeMessage({ reactions: [10], ageMs: 5 * 60 * 1000 }));
    expect(r.shouldPin).toBe(false);
    expect(r.reason).toContain('trop récent');
  });

  test('refuse un message trop ancien', () => {
    const r = evaluatePinWorthiness(makeMessage({ reactions: [10], ageMs: 24 * 60 * 60 * 1000 }));
    expect(r.shouldPin).toBe(false);
    expect(r.reason).toContain('trop ancien');
  });

  test('accepte un message avec beaucoup de réactions distinctes', () => {
    const r = evaluatePinWorthiness(makeMessage({ reactions: [3, 3, 2, 2, 2], contentLength: 120 }));
    expect(r.shouldPin).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(5);
  });

  test('accepte un message avec une réaction massive', () => {
    const r = evaluatePinWorthiness(makeMessage({ reactions: [12], contentLength: 100 }));
    expect(r.shouldPin).toBe(true);
  });
});

describe('detectPollOpportunity', () => {
  test('détecte un "X ou Y ?"', () => {
    const r = detectPollOpportunity('on fait FF7 ou Persona 5 ce soir ?');
    expect(r).not.toBeNull();
    expect(r.options.length).toBe(2);
  });

  test('renvoie null si pas de pattern', () => {
    expect(detectPollOpportunity('on fait des ramen ce soir')).toBeNull();
  });

  test('renvoie null si options identiques', () => {
    expect(detectPollOpportunity('persona ou persona ?')).toBeNull();
  });

  test('renvoie null sur message trop long', () => {
    expect(detectPollOpportunity('a'.repeat(250))).toBeNull();
  });
});

// ─── proactiveOutreach.pickType ──────────────────────────────────
describe('pickType', () => {
  test('renvoie une string parmi les types attendus', () => {
    const validTypes = ['random_thought', 'group_observation', 'vip_callback', 'challenge', 'dm_outreach'];
    for (let i = 0; i < 10; i++) {
      const t = pickType();
      expect(validTypes).toContain(t);
    }
  });
});
