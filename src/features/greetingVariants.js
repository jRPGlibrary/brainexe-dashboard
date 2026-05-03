/**
 * ================================================
 * 🌅 GREETING VARIANTS — variations naturelles
 * ================================================
 * Au lieu de demander à Claude un prompt générique à chaque fois,
 * on lui donne :
 *   - une banque de seeds variés selon l'heure exacte (4h ≠ 7h ≠ 10h)
 *   - un tracking des dernières formulations pour éviter la répétition
 *
 * Le but : ne JAMAIS écrire deux fois la même chose, et coller
 * vraiment au moment de la journée (4h du mat = "j'arrive pas à dormir",
 * pas un "bonjour énergique").
 * ================================================
 */

// Seeds par tranche horaire (heure Paris). Brainee pioche une seed pour orienter Claude.
// Chaque seed propose un angle, une vibe, ou une situation crédible.
const MORNING_SEEDS = {
  // 5h-7h : très tôt, encore endormie ou insomnie
  earlyMorning: [
    "encore tôt, tu sens à peine, tu lances un truc mou",
    "ton café charge, tu jettes un message endormi",
    "t'es debout avant tout le monde, légèrement zombie",
    "tu te demandes pourquoi tu es debout aussi tôt",
    "t'as pas vraiment dormi, tu lances une pensée traînante",
  ],
  // 7h-9h : réveil normal, ton un peu cassé mais en route
  morning: [
    "tu te réveilles doucement, tu lances un truc simple",
    "premier message du jour, ton encore un peu cassé",
    "t'attaques la journée sans faire de bruit",
    "tu demandes ce que les gens ont prévu sans pression",
    "tu balances une pensée traînante du matin",
    "tu remarques un truc bête de ton réveil",
  ],
  // 9h-11h : journée lancée, ton normal
  late: [
    "la journée est lancée, ton normal mais pas trop hype",
    "tu reviens après ton premier café, tu te réveilles vraiment",
    "tu jettes un coup d'œil à ce qui se dit, tu rebondis",
    "tu lances un sujet du jour léger",
  ],
};

const GOODNIGHT_SEEDS = [
  "tu finis une quête / un boss et tu vas dormir, normalement",
  "t'es claquée, tu lâches l'affaire pour ce soir",
  "t'as encore un truc en tête, tu vas essayer de dormir quand même",
  "tu reportes le sommeil pour finir un dernier truc, classique",
  "tu sens que demain va piquer, tu vas dormir maintenant",
  "tu lâches le clavier, tu vas tenter le coucher sérieusement",
  "t'as les yeux qui ferment, tu signes la fin de la session",
];

// Réveils nocturnes : très spécifique selon l'heure (3h, 4h, 5h)
const NIGHT_WAKEUP_SEEDS = {
  // 1h-2h : juste après le coucher, insomnie qui démarre
  postBedtime: [
    "tu viens de te coucher mais ton cerveau veut pas s'éteindre",
    "tu repenses à un truc absurde qui te tient éveillée",
    "ton cerveau a décidé de relire toutes les conneries de la journée",
  ],
  // 3h-4h : pleine nuit, classique ADHD/insomnie
  deepNight: [
    "4h du mat, t'arrives pas à te rendormir, y'en a parmi vous qui dorment pas",
    "3h, t'as les yeux ouverts depuis 30 min, t'écris dans le vide",
    "tu te réveilles, tu penses à un boss, tu peux pas te rendormir",
    "tu te poses une question débile à 4h et tu peux plus dormir",
    "réveil brutal, tu sais pas pourquoi, tu balances un truc",
    "ton cerveau a décidé que dormir c'était optionnel cette nuit",
  ],
  // 5h-6h : pré-aube, juste avant le matin
  preDawn: [
    "tu viens de te réveiller bien avant le réveil, fait chier",
    "tu dors mal, tu attends le matin en zonant",
    "tu vois que c'est presque le matin, tu lâches un message dans le vide",
  ],
};

const LUNCH_BACK_SEEDS = [
  "tu reviens de pause, tu te remets dedans tranquille",
  "retour de bouffe, tu regardes ce qui s'est passé",
  "tu reviens, tu jettes un coup d'œil, tu rebondis",
  "tu sors de ta pause déj, tu poses un truc léger",
];

// Tracking en mémoire : on ne pioche pas la même seed deux fois d'affilée
const lastUsed = {
  morning: null,
  goodnight: null,
  nightWakeup: null,
  lunch: null,
};

function pickSeed(arr, lastKey) {
  if (!arr || arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  let pick;
  let attempts = 0;
  do {
    pick = arr[Math.floor(Math.random() * arr.length)];
    attempts++;
  } while (pick === lastUsed[lastKey] && attempts < 5);
  lastUsed[lastKey] = pick;
  return pick;
}

function getMorningSeed(hour) {
  let bucket = 'morning';
  if (hour < 7) bucket = 'earlyMorning';
  else if (hour >= 9) bucket = 'late';
  return pickSeed(MORNING_SEEDS[bucket], 'morning');
}

function getGoodnightSeed() {
  return pickSeed(GOODNIGHT_SEEDS, 'goodnight');
}

function getNightWakeupSeed(hour) {
  let bucket = 'deepNight';
  if (hour < 3) bucket = 'postBedtime';
  else if (hour >= 5) bucket = 'preDawn';
  return pickSeed(NIGHT_WAKEUP_SEEDS[bucket], 'nightWakeup');
}

function getLunchBackSeed() {
  return pickSeed(LUNCH_BACK_SEEDS, 'lunch');
}

module.exports = {
  getMorningSeed, getGoodnightSeed, getNightWakeupSeed, getLunchBackSeed,
};
