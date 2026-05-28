/**
 * Tests — src/bot/currentGame.js
 * Jeu du moment : cohérence (stable dans la journée), variété (pas de
 * monopole Elden Ring), structure du pool.
 */

const { getCurrentGame, getCurrentGameName, GAME_POOL } = require('../src/bot/currentGame');

describe('GAME_POOL', () => {
  test('contient au moins 20 jeux variés', () => {
    expect(GAME_POOL.length).toBeGreaterThanOrEqual(20);
  });

  test('chaque entrée a un name et un genre', () => {
    for (const g of GAME_POOL) {
      expect(typeof g.name).toBe('string');
      expect(g.name.length).toBeGreaterThan(1);
      expect(typeof g.genre).toBe('string');
    }
  });

  test('les soulslike sont minoritaires (fin du monopole Elden Ring)', () => {
    const soulslike = GAME_POOL.filter(g => g.genre === 'soulslike').length;
    expect(soulslike / GAME_POOL.length).toBeLessThan(0.2);
  });

  test('Elden Ring est présent mais une seule fois', () => {
    const elden = GAME_POOL.filter(g => g.name === 'Elden Ring').length;
    expect(elden).toBe(1);
  });
});

describe('getCurrentGame', () => {
  test('retourne un jeu valide du pool', () => {
    const game = getCurrentGame();
    expect(game).toHaveProperty('name');
    expect(GAME_POOL.map(g => g.name)).toContain(game.name);
  });

  test('est stable au sein de la même journée (appels répétés identiques)', () => {
    const a = getCurrentGameName();
    const b = getCurrentGameName();
    const c = getCurrentGameName();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  test('getCurrentGameName retourne une string non vide', () => {
    expect(typeof getCurrentGameName()).toBe('string');
    expect(getCurrentGameName().length).toBeGreaterThan(1);
  });
});
