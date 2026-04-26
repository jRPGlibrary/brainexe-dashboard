/**
 * Tests — src/bot/mood.js
 * Humeur quotidienne du bot
 */

jest.mock('../src/logger', () => ({
  pushLog: jest.fn(),
}));

// On mock emotions pour éviter la dépendance à MongoDB
jest.mock('../src/bot/emotions', () => ({
  setInternalStateValue: jest.fn(),
}));

const { MOODS, getDailyMood, setDailyMood, getMoodInjection, resetDailyMoodDate } = require('../src/bot/mood');
const { pushLog } = require('../src/logger');

beforeEach(() => {
  setDailyMood('chill', false);
  jest.clearAllMocks();
});

// ── MOODS ─────────────────────────────────────────────────────────
describe('MOODS', () => {
  test('contient exactement 4 humeurs', () => {
    expect(MOODS).toHaveLength(4);
  });

  test('contient les valeurs attendues', () => {
    expect(MOODS).toContain('energique');
    expect(MOODS).toContain('chill');
    expect(MOODS).toContain('hyperfocus');
    expect(MOODS).toContain('zombie');
  });
});

// ── setDailyMood / getDailyMood ───────────────────────────────────
describe('setDailyMood / getDailyMood', () => {
  test('accepte une humeur valide et retourne true', () => {
    expect(setDailyMood('energique', false)).toBe(true);
  });

  test('refuse une humeur inconnue et retourne false', () => {
    expect(setDailyMood('stressé', false)).toBe(false);
  });

  test('refuse une chaîne vide et retourne false', () => {
    expect(setDailyMood('', false)).toBe(false);
  });

  test('getDailyMood retourne la dernière humeur définie', () => {
    setDailyMood('hyperfocus', false);
    expect(getDailyMood()).toBe('hyperfocus');
  });

  test('chaque humeur de MOODS est acceptée', () => {
    for (const m of MOODS) {
      expect(setDailyMood(m, false)).toBe(true);
      expect(getDailyMood()).toBe(m);
    }
  });

  test('setDailyMood(valide) appelle pushLog', () => {
    setDailyMood('zombie', false);
    expect(pushLog).toHaveBeenCalledWith('SYS', expect.stringContaining('zombie'), 'success');
  });

  test('setDailyMood(invalide) n\'appelle pas pushLog', () => {
    setDailyMood('inconnu', false);
    expect(pushLog).not.toHaveBeenCalled();
  });
});

// ── getMoodInjection ──────────────────────────────────────────────
describe('getMoodInjection', () => {
  test('retourne une chaîne non vide pour chaque humeur valide', () => {
    for (const m of MOODS) {
      const injection = getMoodInjection(m);
      expect(typeof injection).toBe('string');
      expect(injection.length).toBeGreaterThan(0);
    }
  });

  test('retourne une chaîne vide pour une humeur inconnue', () => {
    expect(getMoodInjection('inconnu')).toBe('');
  });

  test('l\'injection de "zombie" mentionne un état à plat', () => {
    expect(getMoodInjection('zombie')).toMatch(/plat|court|minimaliste/i);
  });

  test('l\'injection de "hyperfocus" mentionne la précision ou le sujet', () => {
    expect(getMoodInjection('hyperfocus')).toMatch(/sujet|précis|stimul/i);
  });
});

// ── resetDailyMoodDate ────────────────────────────────────────────
describe('resetDailyMoodDate', () => {
  test('réinitialise la date sans lever d\'exception', () => {
    expect(() => resetDailyMoodDate()).not.toThrow();
  });
});
