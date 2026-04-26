/**
 * Tests — src/audit.js
 * Journal des actions admin (ring buffer + broadcast)
 */

// On mock shared pour avoir un auditLog isolé par test
const mockShared = { auditLog: [] };
jest.mock('../src/shared', () => mockShared);

const mockBroadcast = jest.fn();
jest.mock('../src/logger', () => ({
  broadcast: mockBroadcast,
}));

// On doit recharger le module après avoir initialisé mockShared
// car audit.js lit shared.auditLog au chargement
let auditLog, getAuditEntries;
beforeAll(() => {
  ({ auditLog, getAuditEntries } = require('../src/audit'));
});

beforeEach(() => {
  mockShared.auditLog = [];
  jest.clearAllMocks();
});

// ── auditLog ──────────────────────────────────────────────────────
describe('auditLog', () => {
  test('ajoute une entrée dans shared.auditLog', () => {
    auditLog('test.action', { foo: 'bar' });
    expect(mockShared.auditLog).toHaveLength(1);
  });

  test('l\'entrée contient les champs requis', () => {
    const entry = auditLog('config.update', { section: 'anecdote' });
    expect(entry).toHaveProperty('ts');
    expect(entry).toHaveProperty('time');
    expect(entry).toHaveProperty('action', 'config.update');
    expect(entry).toHaveProperty('details', { section: 'anecdote' });
  });

  test('ts est un timestamp valide (nombre positif)', () => {
    const entry = auditLog('admin.mood', {});
    expect(typeof entry.ts).toBe('number');
    expect(entry.ts).toBeGreaterThan(0);
  });

  test('time est une chaîne ISO 8601', () => {
    const entry = auditLog('admin.slot', {});
    expect(() => new Date(entry.time)).not.toThrow();
    expect(new Date(entry.time).toISOString()).toBe(entry.time);
  });

  test('appelle broadcast avec "auditUpdate" et l\'entrée', () => {
    const entry = auditLog('backup.create', { name: 'backup_test.json' });
    expect(mockBroadcast).toHaveBeenCalledWith('auditUpdate', entry);
  });

  test('plusieurs appels ajoutent plusieurs entrées dans l\'ordre', () => {
    auditLog('action.a', {});
    auditLog('action.b', {});
    auditLog('action.c', {});
    expect(mockShared.auditLog).toHaveLength(3);
    expect(mockShared.auditLog[0].action).toBe('action.a');
    expect(mockShared.auditLog[2].action).toBe('action.c');
  });

  test('les details vides sont acceptés (valeur par défaut {})', () => {
    expect(() => auditLog('admin.tiktok')).not.toThrow();
    expect(mockShared.auditLog[0].details).toEqual({});
  });
});

// ── Ring buffer (500 entrées max) ─────────────────────────────────
describe('Ring buffer', () => {
  test('supprime la plus ancienne entrée quand le buffer est plein', () => {
    for (let i = 0; i < 500; i++) {
      auditLog(`action.${i}`, {});
    }
    expect(mockShared.auditLog).toHaveLength(500);
    // La 501ème entrée pousse la première hors du buffer
    auditLog('action.nouvelle', {});
    expect(mockShared.auditLog).toHaveLength(500);
    expect(mockShared.auditLog[0].action).toBe('action.1');
    expect(mockShared.auditLog[499].action).toBe('action.nouvelle');
  });
});

// ── getAuditEntries ───────────────────────────────────────────────
describe('getAuditEntries', () => {
  beforeEach(() => {
    auditLog('action.premiere', {});
    auditLog('action.deuxieme', {});
    auditLog('action.troisieme', {});
  });

  test('retourne les entrées en ordre inverse (plus récente en premier)', () => {
    const entries = getAuditEntries(10);
    expect(entries[0].action).toBe('action.troisieme');
    expect(entries[entries.length - 1].action).toBe('action.premiere');
  });

  test('respecte la limite passée en paramètre', () => {
    const entries = getAuditEntries(2);
    expect(entries).toHaveLength(2);
  });

  test('retourne toutes les entrées si limit > nombre d\'entrées', () => {
    const entries = getAuditEntries(100);
    expect(entries).toHaveLength(3);
  });

  test('retourne un tableau vide si auditLog est vide', () => {
    mockShared.auditLog = [];
    expect(getAuditEntries()).toEqual([]);
  });

  test('la limite par défaut est 200', () => {
    for (let i = 0; i < 250; i++) auditLog(`action.${i}`, {});
    const entries = getAuditEntries();
    expect(entries.length).toBeLessThanOrEqual(200);
  });
});
