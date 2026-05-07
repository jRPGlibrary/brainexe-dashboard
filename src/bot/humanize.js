/**
 * ================================================
 * 🧬 HUMANIZE FILTER v0.2.6
 * ================================================
 * Applique des micro-transformations sur le texte généré pour casser
 * le "feel bot". Les règles sont CONTEXTUELLES, pas aléatoires :
 *   - relax : si relâchée (énergie OK, charge mentale basse, attachement haut)
 *   - accent_drop : sur longs textes ou énergie haute ("elle tape vite")
 *   - slang : si lien fort et humeur détendue
 *
 * Principes :
 *  - Ne jamais tout appliquer en même temps (max 2 filtres par message)
 *  - Ne jamais toucher à la ponctuation structurante
 *  - Ne jamais casser les mentions <@id>, <#id>, les emojis :nom:
 *  - Jamais au début d'une première phrase (crédibilité)
 * ================================================
 */

// Mots à ne JAMAIS dé-accentuer (cassent le sens ou sont trop voyants)
const SAFE_ACCENTED = new Set([
  'être', 'très', 'où', 'déjà', 'là', 'français', 'français',
  'après', 'près', 'mère', 'père', 'frère', 'année', 'problème',
  'système', 'thème', 'idée', 'région',
]);

const SLANG_OPENERS = [
  'franchement', 'nan mais', 'ouais nan', 'genre', 'sérieux',
  'attends', 'du coup', 'en vrai', 'bah',
];

const SLANG_CLOSERS = [
  'tu vois', 'enfin', 'je sais pas', 'voilà', 'osef',
];

const RELAX_SUBSTITUTIONS = [
  [/\bje ne (\w+ pas)\b/gi, (m, p1) => "j'" + p1.replace(' pas', '') + " pas"],
  [/\bJe ne (\w+ pas)\b/g,  (m, p1) => "J'" + p1.replace(' pas', '') + " pas"],
  [/\bje n'ai pas\b/gi, "j'ai pas"],
  [/\bJe n'ai pas\b/g,  "J'ai pas"],
  [/\bje ne sais pas\b/gi, "j'sais pas"],
  [/\bil n'y a\b/gi, "y'a"],
  [/\bIl n'y a\b/g,  "Y'a"],
  [/\bil y a\b/g, "y'a"],
  [/\bne t'inquiète pas\b/gi, "tkt"],
  [/\bt'inquiète pas\b/gi, "tkt"],
  [/\bquelque chose\b/gi, "un truc"],
  [/\bvraiment\b/g, "vrmt"],
  [/\bpeut-être\b/gi, "ptet"],
  [/\bde la même manière\b/gi, "pareil"],
  [/\bbeaucoup de\b/gi, "plein de"],
  [/\bdes choses\b/gi, "des trucs"],
  [/\bune chose\b/gi, "un truc"],
];

// Sécurise une transformation contre les zones "intouchables"
function isInsideProtectedZone(text, index) {
  const before = text.slice(0, index);
  const openMention = (before.match(/<@/g) || []).length;
  const closeMention = (before.match(/>/g) || []).length;
  if (openMention > closeMention) return true;
  const openColon = (before.match(/:/g) || []).length;
  if (openColon % 2 === 1) {
    const since = before.lastIndexOf(':');
    if (since >= 0 && index - since < 30) return true;
  }
  const openBacktick = (before.match(/`/g) || []).length;
  if (openBacktick % 2 === 1) return true;
  return false;
}

// ─── ACCENT DROP ─────────────────────────────────────────────────
function maybeDropAccents(text, maxDrops = 2) {
  const words = text.split(/(\s+)/);
  let drops = 0;
  const firstWordIdx = words.findIndex(w => w.trim().length > 0);
  for (let i = 0; i < words.length; i++) {
    if (drops >= maxDrops) break;
    const w = words[i];
    if (!w || !w.trim()) continue;
    if (i <= firstWordIdx) continue;
    if (!/[éèêàâîïôûùç]/i.test(w)) continue;
    const lower = w.toLowerCase().replace(/[.,!?;:]/g, '');
    if (SAFE_ACCENTED.has(lower)) continue;
    if (Math.random() < 0.45) {
      words[i] = w
        .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e')
        .replace(/É/g, 'E').replace(/È/g, 'E').replace(/Ê/g, 'E')
        .replace(/à/g, 'a').replace(/â/g, 'a')
        .replace(/î/g, 'i').replace(/ï/g, 'i')
        .replace(/ô/g, 'o')
        .replace(/û/g, 'u').replace(/ù/g, 'u')
        .replace(/ç/g, 'c');
      drops++;
    }
  }
  return words.join('');
}

// ─── RELAX FILTER ────────────────────────────────────────────────
function applyRelaxFilter(text) {
  let out = text;
  const picks = RELAX_SUBSTITUTIONS
    .map((r, idx) => ({ r, idx }))
    .sort(() => Math.random() - 0.5)
    .slice(0, 2 + Math.floor(Math.random() * 2));
  for (const { r } of picks) {
    const [pattern, replacement] = r;
    out = out.replace(pattern, (match, ...args) => {
      const offset = args[args.length - 2];
      if (typeof offset === 'number' && isInsideProtectedZone(out, offset)) return match;
      return typeof replacement === 'function' ? replacement(match, ...args) : replacement;
    });
  }
  return out;
}

// ─── SLANG INJECTION ─────────────────────────────────────────────
function injectSlang(text) {
  if (text.length < 30) return text;
  if (Math.random() < 0.6) {
    const opener = SLANG_OPENERS[Math.floor(Math.random() * SLANG_OPENERS.length)];
    const firstChar = text.charAt(0);
    const startsUpper = firstChar === firstChar.toUpperCase() && /[A-Za-zÀ-ÿ]/.test(firstChar);
    if (startsUpper) {
      text = opener + ', ' + text.charAt(0).toLowerCase() + text.slice(1);
    } else {
      text = opener + ' ' + text;
    }
  } else {
    const closer = SLANG_CLOSERS[Math.floor(Math.random() * SLANG_CLOSERS.length)];
    text = text.replace(/([.!?])\s*$/, `, ${closer}$1`);
    if (!/[.!?]$/.test(text)) text += ` ${closer}.`;
  }
  return text;
}

// ─── POINT FINAL PARFOIS OUBLIÉ ──────────────────────────────────
function maybeDropFinalPeriod(text) {
  if (Math.random() < 0.4 && /[a-zA-Zéèàù]\.$/.test(text) && !/\?$|!$/.test(text)) {
    return text.slice(0, -1);
  }
  return text;
}

// ─── REPETITION "..." ou "???" ───────────────────────────────────
function maybeRepeatPunct(text) {
  if (Math.random() < 0.3) {
    text = text.replace(/\?/g, (m) => (Math.random() < 0.35 ? '??' : m));
  }
  return text;
}

// ─── ANTI-TIRET CADRATIN (signature IA) ──────────────────────────
// Le tiret long "—" et demi-cadratin "–" sont des marqueurs IA très
// visibles. On les remplace systématiquement par une ponctuation
// naturelle de chat français.
function stripEmDashes(text) {
  if (!text) return text;
  let out = text;
  out = out.replace(/\s*[—–]\s*/g, '\n');    // Saut de ligne, pas virgule
  out = out.replace(/\n([.!?])/g, '$1');     // Pas de \n avant ponctuation finale
  out = out.replace(/^\n+/, '');             // Pas de \n en tête
  out = out.replace(/\n{3,}/g, '\n\n');      // Max double saut de ligne
  return out;
}

// ─── DÉDUPLIQUE "mdr" RÉPÉTÉS ────────────────────────────────────
// Brainee a tendance à finir presque tous ses messages par "mdr".
// On garde max 1 occurrence par message.
function dedupeMdr(text) {
  if (!text) return text;
  let count = 0;
  return text.replace(/\bmdr\b/gi, (m) => {
    count += 1;
    return count === 1 ? m : '';
  }).replace(/\s{2,}/g, ' ').replace(/\s+([.!?,])/g, '$1');
}

// ─── ANTI-RACAILLE (filet de sécurité) ───────────────────────────
// Si le modèle dérape vers un registre banlieue masculin malgré le
// system prompt, on neutralise les marqueurs les plus voyants.
function stripRacaille(text) {
  if (!text) return text;
  let out = text;
  out = out.replace(/\bwesh\b\s*,?\s*/gi, '');
  out = out.replace(/\bwsh\b\s*,?\s*/gi, '');
  out = out.replace(/\b(frérot|frerot|reuf|bro|cousin)\b\s*,?\s*/gi, '');
  out = out.replace(/\b(ma gueule|sa mère)\b\s*,?\s*/gi, '');
  out = out.replace(/(^|[\s,.!?])(vas-y\s+)?gros([\s,.!?])/gi, '$1$3');
  return out.replace(/\s{2,}/g, ' ').trim();
}

// ─── EMOJI OCCASIONNEL ───────────────────────────────────────────
// Ajoute un emoji léger SI le texte n'en contient pas déjà.
// Probabilité visée :
//  - serveur (reply/spontané) : ~10%
//  - DM : ~15%
const SERVER_EMOJIS = ['👀', '😏', '⚡', '🔥', '🧠', '🌙'];
const DM_EMOJIS     = ['👀', '😏', '🌙', '🔥', '😅', '💭'];

function hasAnyEmoji(text) {
  // détecte un emoji unicode courant
  return /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]/u.test(text);
}

function maybeAddOccasionalEmoji(text, { isDM = false, prob = null } = {}) {
  if (!text) return text;
  if (hasAnyEmoji(text)) return text;
  if (/^https?:\/\//.test(text.trim())) return text;
  const baseProb = prob !== null ? prob : (isDM ? 0.15 : 0.10);
  if (Math.random() >= baseProb) return text;
  const pool = isDM ? DM_EMOJIS : SERVER_EMOJIS;
  const e = pool[Math.floor(Math.random() * pool.length)];
  // Insère en fin de message, avant le dernier point/!/? si présent
  const m = text.match(/^([\s\S]*?)([.!?]+)\s*$/);
  if (m) return `${m[1]} ${e}${m[2]}`;
  return `${text} ${e}`;
}

// ─── FILTRE PRINCIPAL ────────────────────────────────────────────
/**
 * @param {string} text
 * @param {object} ctx - { emotionalSignal, bondSignal, mood, slotStatus }
 */
function humanize(text, ctx = {}) {
  if (!text) return text;
  if (/^https?:\/\//.test(text.trim())) return text;

  // Filtres systématiques (toujours appliqués, pas probabilistes) :
  // ils nettoient des marqueurs IA / hors-perso indépendamment de l'état
  // et tournent aussi sur les messages courts.
  text = stripEmDashes(text);
  text = stripRacaille(text);
  text = dedupeMdr(text);

  // En dessous de 20 caractères, on s'arrête après le nettoyage de base.
  if (text.length < 20) return text;

  const sig = ctx.emotionalSignal || {};
  const bond = ctx.bondSignal || {};
  const mood = ctx.mood || 'chill';
  const slotStatus = ctx.slotStatus || 'active';

  let relaxProb = 0.15;
  let accentProb = 0.10;
  let slangProb = 0.05;

  if (sig.isRelaxed) relaxProb += 0.20;
  if (sig.isTired) { relaxProb += 0.25; accentProb += 0.20; }
  if (sig.isCharged) { accentProb += 0.15; slangProb += 0.05; }
  if (sig.isOverloaded) accentProb += 0.25;
  if (sig.isAmused) { slangProb += 0.10; relaxProb += 0.10; }
  if (sig.isAnnoyed) { relaxProb += 0.05; slangProb -= 0.05; }

  if (bond.strength > 65) { relaxProb += 0.20; slangProb += 0.15; }
  else if (bond.strength > 40) { relaxProb += 0.10; slangProb += 0.05; }

  if (mood === 'energique') { slangProb += 0.10; accentProb += 0.10; }
  if (mood === 'zombie') { relaxProb += 0.15; accentProb += 0.15; slangProb -= 0.05; }
  if (mood === 'hyperfocus') { slangProb -= 0.05; }
  if (mood === 'chill') relaxProb += 0.10;

  if (slotStatus === 'wakeup' || slotStatus === 'latenight') { accentProb += 0.10; relaxProb += 0.10; }
  if (slotStatus === 'lunch') accentProb += 0.05;

  relaxProb = Math.max(0, Math.min(0.75, relaxProb));
  accentProb = Math.max(0, Math.min(0.65, accentProb));
  slangProb = Math.max(0, Math.min(0.45, slangProb));

  const filtersApplied = [];
  let out = text;

  if (Math.random() < relaxProb) {
    out = applyRelaxFilter(out);
    filtersApplied.push('relax');
  }
  if (text.length > 120 && Math.random() < accentProb && filtersApplied.length < 2) {
    out = maybeDropAccents(out, sig.isTired || sig.isOverloaded ? 3 : 2);
    filtersApplied.push('accent_drop');
  }
  if (Math.random() < slangProb && filtersApplied.length < 2) {
    out = injectSlang(out);
    filtersApplied.push('slang');
  }
  if (slotStatus !== 'productive' && Math.random() < 0.2) {
    out = maybeDropFinalPeriod(out);
  }
  if (sig.isAmused && Math.random() < 0.2) {
    out = maybeRepeatPunct(out);
  }

  return out;
}

module.exports = {
  humanize,
  applyRelaxFilter, maybeDropAccents, injectSlang,
  maybeAddOccasionalEmoji, hasAnyEmoji,
  stripEmDashes, dedupeMdr, stripRacaille,
};
