/**
 * Tests — src/bot/currentActivity.js
 * Moteur d'activité temps réel : déterminisme, cohérence soirée (pas
 * d'oscillation jeu↔série), durées RÉELLES calculées depuis l'heure de début.
 */

const {
  SERIES_POOL, getCurrentSeries, getEveningKind, getEveningStartHour,
  getEveningActivity, getCurrentActivity, buildGoodnightAngle,
  episodesFrom, elapsedLabel,
} = require('../src/bot/currentActivity');

describe('SERIES_POOL', () => {
  test('au moins 8 séries, chaque entrée a un name non vide', () => {
    expect(SERIES_POOL.length).toBeGreaterThanOrEqual(8);
    for (const s of SERIES_POOL) {
      expect(typeof s.name).toBe('string');
      expect(s.name.length).toBeGreaterThan(1);
    }
  });

  test('getCurrentSeries retourne une série du pool, déterministe par jour', () => {
    const s = getCurrentSeries(123);
    expect(SERIES_POOL.map(x => x.name)).toContain(s.name);
    expect(getCurrentSeries(123).name).toBe(s.name);
  });
});

describe('getEveningKind', () => {
  test('retourne toujours gaming / series / chill', () => {
    for (let d = 0; d < 500; d++) {
      expect(['gaming', 'series', 'chill']).toContain(getEveningKind(d));
    }
  });

  test('gaming majoritaire (persona gameuse)', () => {
    let gaming = 0;
    for (let d = 0; d < 1000; d++) if (getEveningKind(d) === 'gaming') gaming++;
    expect(gaming / 1000).toBeGreaterThan(0.5);
  });

  test('déterministe pour un jour donné', () => {
    expect(getEveningKind(42)).toBe(getEveningKind(42));
  });
});

describe('getEveningStartHour', () => {
  test('post-dîner, entre 19h45 et 20h45', () => {
    for (let d = 0; d < 200; d++) {
      const h = getEveningStartHour(d);
      expect(h).toBeGreaterThanOrEqual(19.75);
      expect(h).toBeLessThanOrEqual(20.75);
    }
  });
});

describe('getEveningActivity', () => {
  test('structure cohérente selon le kind', () => {
    for (let d = 0; d < 300; d++) {
      const ev = getEveningActivity(d);
      expect(['gaming', 'series', 'chill']).toContain(ev.kind);
      expect(typeof ev.label).toBe('string');
      if (ev.kind === 'gaming' || ev.kind === 'series') {
        expect(typeof ev.subject).toBe('string');
        expect(ev.label).toContain(ev.subject);
      } else {
        expect(ev.subject).toBeNull();
      }
    }
  });
});

describe('getCurrentActivity — temps réel', () => {
  test('slots simples : label présent, pas de durée', () => {
    for (const s of ['sleep', 'wakeup', 'lunch', 'transition']) {
      const a = getCurrentActivity(s, 12);
      expect(typeof a.label).toBe('string');
      expect(a.elapsedH).toBe(0);
    }
  });

  test('soirée : la durée écoulée croît avec l\'heure et reste réaliste', () => {
    const start = getEveningStartHour();
    const early = getCurrentActivity('gaming', start + 0.5);
    const late = getCurrentActivity('gaming', start + 3);
    expect(early.elapsedH).toBeCloseTo(0.5, 5);
    expect(late.elapsedH).toBeCloseTo(3, 5);
    expect(late.elapsedH).toBeGreaterThan(early.elapsedH);
    // pas de durée négative avant le début de soirée
    expect(getCurrentActivity('gaming', start - 1).elapsedH).toBe(0);
    // soirée série : le nb d'épisodes suit le temps réel (pas 3 en 30 min)
    if (early.episodes !== undefined) {
      expect(early.episodes).toBe(1);
      expect(late.episodes).toBeGreaterThanOrEqual(3);
    }
  });

  test('soirée : gaming et latenight pointent sur la même activité (zéro oscillation)', () => {
    const g = getCurrentActivity('gaming', 22);
    const l = getCurrentActivity('latenight', 23.6);
    expect(g.kind).toBe(l.kind);
    expect(g.subject).toBe(l.subject);
  });
});

describe('episodesFrom / elapsedLabel', () => {
  test('episodesFrom : ~45 min par épisode, minimum 1', () => {
    expect(episodesFrom(0)).toBe(1);
    expect(episodesFrom(0.5)).toBe(1);
    expect(episodesFrom(2.3)).toBe(3);
    expect(episodesFrom(3)).toBe(4);
  });

  test('elapsedLabel renvoie toujours une string', () => {
    expect(typeof elapsedLabel(0.2)).toBe('string');
    expect(typeof elapsedLabel(5)).toBe('string');
  });
});

describe('buildGoodnightAngle — cohérent avec la soirée réelle', () => {
  test('renvoie une string qui mentionne le sujet de la soirée si nommé', () => {
    const angle = buildGoodnightAngle(23);
    expect(typeof angle).toBe('string');
    expect(angle.length).toBeGreaterThan(10);
    const ev = getEveningActivity();
    if (ev.subject) expect(angle).toContain(ev.subject);
  });
});
