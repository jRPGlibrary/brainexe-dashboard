/**
 * Tests — v2.3.4 humanisation Brainee
 * Couvre la détection des stories, des goûts, et le scoring VIP.
 */

jest.mock('../src/shared', () => ({ mongoDb: null }));
jest.mock('../src/logger', () => ({ pushLog: jest.fn() }));

const { detectStoriesFromMessage, formatStoriesBlock } = require('../src/db/memberStories');
const { detectTasteSignals, formatTasteBlock } = require('../src/db/tasteProfile');
const { computeVipScore, getVipTier, getVipBlockForPrompt } = require('../src/db/vipSystem');

// ─── memberStories.detectStoriesFromMessage ─────────────────────
describe('detectStoriesFromMessage', () => {
  test('détecte une quest sur "je cherche..."', () => {
    const r = detectStoriesFromMessage('je cherche un metroidvania chill pour le weekend');
    const quest = r.find(s => s.type === 'quest');
    expect(quest).toBeDefined();
    expect(quest.content.toLowerCase()).toContain('metroidvania');
  });

  test('détecte un project sur "je joue à..."', () => {
    const r = detectStoriesFromMessage('je joue à BG3 en ce moment, c\'est ouf');
    const project = r.find(s => s.type === 'project');
    expect(project).toBeDefined();
    expect(project.content.toLowerCase()).toContain('bg3');
  });

  test('détecte un fact sur "j\'ai fini..."', () => {
    const r = detectStoriesFromMessage("j'ai fini Elden Ring hier soir");
    const fact = r.find(s => s.type === 'fact');
    expect(fact).toBeDefined();
    expect(fact.content.toLowerCase()).toContain('elden ring');
  });

  test('détecte un concern sur "je suis crevé(e)..."', () => {
    const r = detectStoriesFromMessage("je suis crevée en ce moment, trop de boulot, j'en peux plus");
    const concern = r.find(s => s.type === 'concern');
    expect(concern).toBeDefined();
  });

  test("ne détecte rien sur un message vide ou trivial", () => {
    expect(detectStoriesFromMessage('').length).toBe(0);
    expect(detectStoriesFromMessage('ok').length).toBe(0);
  });
});

describe('formatStoriesBlock', () => {
  test("retourne '' si aucune story", () => {
    expect(formatStoriesBlock([], 'Bob')).toBe('');
    expect(formatStoriesBlock(null, 'Bob')).toBe('');
  });

  test('formate un bloc lisible avec contenu', () => {
    const stories = [
      { type: 'quest', content: 'metroidvania chill', lastMentioned: new Date(), status: 'active' },
      { type: 'project', content: 'BG3', lastMentioned: new Date(), status: 'active' },
    ];
    const block = formatStoriesBlock(stories, 'Bob');
    expect(block).toContain('BOB');
    expect(block).toContain('metroidvania');
    expect(block).toContain('BG3');
  });
});

// ─── tasteProfile.detectTasteSignals ────────────────────────────
describe('detectTasteSignals', () => {
  test('détecte un genre depuis un mot clé', () => {
    const s = detectTasteSignals("j'adore les jrpg en général");
    expect(s).not.toBeNull();
    expect(s.genres.find(g => g.genre === 'jrpg')).toBeDefined();
  });

  test('marque un game en "love" avec sentiment positif', () => {
    const s = detectTasteSignals('je kiffe Persona 5, banger absolu');
    expect(s).not.toBeNull();
    expect(s.games.length).toBeGreaterThan(0);
    expect(s.games[0].sentiment).toBe('love');
  });

  test('marque un game en "dislike" avec sentiment négatif', () => {
    const s = detectTasteSignals("j'aime pas Final Fantasy en général, c'est chiant");
    expect(s).not.toBeNull();
    const ff = s.games.find(g => g.title.toLowerCase().includes('final fantasy'));
    expect(ff?.sentiment).toBe('dislike');
  });

  test('détecte une vibe', () => {
    const s = detectTasteSignals("je veux un jeu chill et narratif pour ce soir");
    expect(s).not.toBeNull();
    expect(s.vibes.includes('chill')).toBe(true);
    expect(s.vibes.includes('narratif')).toBe(true);
  });

  test('renvoie null sur message vide', () => {
    expect(detectTasteSignals('')).toBeNull();
    expect(detectTasteSignals('ok')).toBeNull();
  });
});

describe('formatTasteBlock', () => {
  test("retourne '' sur profil vide", () => {
    expect(formatTasteBlock(null, 'Bob')).toBe('');
    expect(formatTasteBlock({}, 'Bob')).toBe('');
  });

  test('inclut les jeux adorés', () => {
    const profile = {
      games: [
        { title: 'Persona 5', sentiment: 'love', score: 5, mentions: 3 },
        { title: 'Final Fantasy 7', sentiment: 'love', score: 4, mentions: 2 },
      ],
      genres: { jrpg: 6 },
      vibes: { narratif: 3 },
      avoidances: [],
      recommended: [],
    };
    const block = formatTasteBlock(profile, 'Alice');
    expect(block).toContain('ALICE');
    expect(block).toContain('Persona 5');
    expect(block).toContain('jrpg');
  });
});

// ─── vipSystem.computeVipScore + getVipTier ──────────────────────
describe('computeVipScore + getVipTier', () => {
  test('newcomer pour bond vide', () => {
    const tier = getVipTier({ baseAttachment: 10, baseTrust: 10, baseComfort: 10 });
    expect(tier.key).toBe('newcomer');
  });

  test('regular pour bond moyen', () => {
    const tier = getVipTier({ baseAttachment: 45, baseTrust: 40, baseComfort: 40 });
    expect(tier.key).toBe('regular');
  });

  test('vip pour bond élevé', () => {
    const tier = getVipTier({
      baseAttachment: 65, baseTrust: 60, baseComfort: 60, interactionStreak: 5,
    });
    expect(tier.key).toBe('vip');
  });

  test('inner_circle pour bond très élevé avec moments positifs', () => {
    const tier = getVipTier({
      baseAttachment: 85, baseTrust: 80, baseComfort: 80, interactionStreak: 14,
      keyMoments: [{ impact: 8 }, { impact: 6 }, { impact: 5 }],
    });
    expect(tier.key).toBe('inner_circle');
  });

  test('moments négatifs réduisent le score', () => {
    const a = computeVipScore({ baseAttachment: 60, baseTrust: 60, baseComfort: 60 });
    const b = computeVipScore({
      baseAttachment: 60, baseTrust: 60, baseComfort: 60,
      keyMoments: [{ impact: -8 }, { impact: -6 }, { impact: -5 }],
    });
    expect(b).toBeLessThan(a);
  });
});

describe('getVipBlockForPrompt', () => {
  test("retourne '' sans tier", () => {
    expect(getVipBlockForPrompt(null, null, 'Bob')).toBe('');
  });

  test('inclut le username', () => {
    const tier = getVipTier({ baseAttachment: 80, baseTrust: 80, baseComfort: 80 });
    const block = getVipBlockForPrompt(tier, { baseAttachment: 80 }, 'Alice');
    expect(block).toContain('Alice');
    expect(block).toContain('INNER CIRCLE');
  });

  test('hint absence si vip+ et lastInteractionDate ancienne', () => {
    const oldDate = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-CA');
    const bond = {
      baseAttachment: 70, baseTrust: 70, baseComfort: 70, lastInteractionDate: oldDate,
    };
    const tier = getVipTier(bond);
    const block = getVipBlockForPrompt(tier, bond, 'Charlie');
    expect(block.toLowerCase()).toContain('jours');
  });
});
