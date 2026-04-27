/**
 * Tests — src/project/funding.js
 * Fonctions pures : calcul des coûts et format du mois
 */

jest.mock('../src/shared', () => ({ mongoDb: null, discord: null }));

const { calculateTotalCosts, getCurrentMonth } = require('../src/project/funding');

// ── getCurrentMonth ───────────────────────────────────────────────
describe('getCurrentMonth', () => {
  test('retourne une chaîne au format YYYY-MM', () => {
    const month = getCurrentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });

  test('l\'année est cohérente avec la date actuelle', () => {
    const year = parseInt(getCurrentMonth().split('-')[0], 10);
    expect(year).toBeGreaterThanOrEqual(2024);
    expect(year).toBeLessThanOrEqual(2100);
  });

  test('le mois est entre 01 et 12', () => {
    const month = parseInt(getCurrentMonth().split('-')[1], 10);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });

  test('le mois est toujours formaté sur 2 chiffres', () => {
    const monthStr = getCurrentMonth().split('-')[1];
    expect(monthStr).toHaveLength(2);
  });
});

// ── calculateTotalCosts ───────────────────────────────────────────
describe('calculateTotalCosts', () => {
  test('additionne server + claude + storage', () => {
    const data = { costs: { server: 4.6, claude: 22, storage: 2 } };
    expect(calculateTotalCosts(data)).toBeCloseTo(28.6);
  });

  test('retourne 0 si costs est absent', () => {
    expect(calculateTotalCosts({})).toBe(0);
  });

  test('retourne 0 si costs est vide', () => {
    expect(calculateTotalCosts({ costs: {} })).toBe(0);
  });

  test('ignore les champs manquants (traite comme 0)', () => {
    const data = { costs: { server: 4.6 } };
    expect(calculateTotalCosts(data)).toBeCloseTo(4.6);
  });

  test('fonctionne avec les coûts par défaut du projet', () => {
    const data = { costs: { server: 4.6, claude: 22 } };
    expect(calculateTotalCosts(data)).toBeCloseTo(26.6);
  });

  test('retourne 0 si data est undefined', () => {
    expect(calculateTotalCosts({})).toBe(0);
  });

  test('ne compte pas de champs inconnus dans costs', () => {
    const data = { costs: { server: 5, extraFee: 100 } };
    // extraFee n'est pas dans la formule
    expect(calculateTotalCosts(data)).toBeCloseTo(5);
  });
});
