/**
 * Tests — src/bot/scheduling.js
 * Fonctions de planning horaire (Paris timezone)
 */

jest.mock('../src/config', () => ({
  MIN_GAP_ANY_POST: 15 * 60 * 1000,
}));

const {
  WEEKDAY_SLOTS,
  SATURDAY_SLOTS,
  SUNDAY_SLOTS,
  getParisHour,
  getParisDay,
  getCurrentSlot,
  setForcedSlot,
  getForcedSlot,
  getAllSlots,
  getMentionDelayMs,
  getSlotIntervalMs,
} = require('../src/bot/scheduling');

afterEach(() => {
  setForcedSlot(null);
});

// ── Grilles de slots ──────────────────────────────────────────────
describe('Grilles de slots', () => {
  test('WEEKDAY_SLOTS couvre 24h sans trou', () => {
    let h = 0;
    for (const slot of WEEKDAY_SLOTS) {
      expect(slot.start).toBe(h);
      h = slot.end;
    }
    expect(h).toBe(24);
  });

  test('SATURDAY_SLOTS couvre 24h sans trou', () => {
    let h = 0;
    for (const slot of SATURDAY_SLOTS) {
      expect(slot.start).toBe(h);
      h = slot.end;
    }
    expect(h).toBe(24);
  });

  test('SUNDAY_SLOTS couvre 24h sans trou', () => {
    let h = 0;
    for (const slot of SUNDAY_SLOTS) {
      expect(slot.start).toBe(h);
      h = slot.end;
    }
    expect(h).toBe(24);
  });

  test('chaque slot possède les champs requis', () => {
    const all = [...WEEKDAY_SLOTS, ...SATURDAY_SLOTS, ...SUNDAY_SLOTS];
    for (const slot of all) {
      expect(typeof slot.status).toBe('string');
      expect(typeof slot.label).toBe('string');
      expect(typeof slot.maxConv).toBe('number');
      expect(Array.isArray(slot.modes)).toBe(true);
    }
  });
});

// ── getParisHour / getParisDay ────────────────────────────────────
describe('getParisHour / getParisDay', () => {
  test('getParisHour retourne un nombre entre 0 et 24', () => {
    const h = getParisHour();
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(24);
  });

  test('getParisDay retourne un entier entre 0 et 6', () => {
    const d = getParisDay();
    expect(Number.isInteger(d)).toBe(true);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(6);
  });
});

// ── getAllSlots ───────────────────────────────────────────────────
describe('getAllSlots', () => {
  test('retourne des statuts uniques', () => {
    const slots = getAllSlots();
    const statuses = slots.map(s => s.status);
    expect(statuses.length).toBe(new Set(statuses).size);
  });

  test('contient les statuts de base attendus', () => {
    const statuses = getAllSlots().map(s => s.status);
    expect(statuses).toContain('sleep');
    expect(statuses).toContain('active');
    expect(statuses).toContain('gaming');
  });
});

// ── setForcedSlot / getForcedSlot ─────────────────────────────────
describe('setForcedSlot / getForcedSlot', () => {
  test('getForcedSlot est null par défaut', () => {
    expect(getForcedSlot()).toBeNull();
  });

  test('setForcedSlot + getForcedSlot aller-retour', () => {
    setForcedSlot('gaming');
    expect(getForcedSlot()).toBe('gaming');
  });

  test('setForcedSlot(null) réinitialise le forçage', () => {
    setForcedSlot('sleep');
    setForcedSlot(null);
    expect(getForcedSlot()).toBeNull();
  });

  test('setForcedSlot("") réinitialise le forçage', () => {
    setForcedSlot('sleep');
    setForcedSlot('');
    expect(getForcedSlot()).toBeNull();
  });
});

// ── getCurrentSlot ────────────────────────────────────────────────
describe('getCurrentSlot', () => {
  test('retourne le slot forcé quand défini', () => {
    setForcedSlot('gaming');
    const slot = getCurrentSlot();
    expect(slot.status).toBe('gaming');
  });

  test('retourne un slot valide sans forçage', () => {
    const slot = getCurrentSlot();
    expect(typeof slot.status).toBe('string');
    expect(typeof slot.label).toBe('string');
    expect(typeof slot.maxConv).toBe('number');
  });

  test('le slot retourné a un statut connu', () => {
    const knownStatuses = ['sleep', 'wakeup', 'active', 'lunch', 'productive', 'transition', 'gaming', 'latenight'];
    const slot = getCurrentSlot();
    expect(knownStatuses).toContain(slot.status);
  });
});

// ── getMentionDelayMs ─────────────────────────────────────────────
describe('getMentionDelayMs', () => {
  test('retourne 0 si mentionDelay est null', () => {
    const sleepSlot = WEEKDAY_SLOTS.find(s => s.status === 'sleep');
    expect(getMentionDelayMs(sleepSlot)).toBe(0);
  });

  test('retourne 0 si slot est undefined', () => {
    expect(getMentionDelayMs(undefined)).toBe(0);
  });

  test('retourne un nombre positif pour un slot avec mentionDelay', () => {
    const gamingSlot = WEEKDAY_SLOTS.find(s => s.status === 'gaming');
    const delay = getMentionDelayMs(gamingSlot);
    expect(delay).toBeGreaterThan(0);
  });

  test('le délai est dans la plage définie par le slot', () => {
    const activeSlot = WEEKDAY_SLOTS.find(s => s.status === 'active');
    const [mn, mx] = activeSlot.mentionDelay;
    const delay = getMentionDelayMs(activeSlot);
    expect(delay).toBeGreaterThanOrEqual(Math.floor(mn * 60 * 1000));
    expect(delay).toBeLessThanOrEqual(Math.ceil(mx * 60 * 1000));
  });
});

// ── getSlotIntervalMs ─────────────────────────────────────────────
describe('getSlotIntervalMs', () => {
  test('retourne au moins 15 min pour un slot avec interval', () => {
    const gamingSlot = WEEKDAY_SLOTS.find(s => s.status === 'gaming');
    const ms = getSlotIntervalMs(gamingSlot);
    expect(ms).toBeGreaterThanOrEqual(15 * 60 * 1000);
  });

  test('retourne MIN_GAP_ANY_POST pour un slot sans interval', () => {
    const sleepSlot = WEEKDAY_SLOTS.find(s => s.status === 'sleep');
    expect(getSlotIntervalMs(sleepSlot)).toBe(15 * 60 * 1000);
  });

  test('retourne MIN_GAP_ANY_POST si slot undefined', () => {
    expect(getSlotIntervalMs(undefined)).toBe(15 * 60 * 1000);
  });
});
