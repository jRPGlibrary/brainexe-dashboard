const { pushLog } = require('../logger');

const MOODS = ['energique', 'chill', 'hyperfocus', 'zombie'];
let dailyMood = 'chill';
let dailyMoodDate = '';

function getParisDay() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getDay();
}

function refreshDailyMood() {
  const todayStr = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  if (dailyMoodDate === todayStr) return dailyMood;
  const day = getParisDay();
  const weights = (day === 0 || day === 6)
    ? ['energique', 'energique', 'hyperfocus', 'chill', 'chill']
    : ['energique', 'chill', 'chill', 'hyperfocus', 'zombie'];
  dailyMood = weights[Math.floor(Math.random() * weights.length)];
  dailyMoodDate = todayStr;
  pushLog('SYS', `🎲 Humeur du jour : ${dailyMood}`, 'success');
  return dailyMood;
}

function getMoodInjection(mood) {
  const injections = {
    energique:  `Aujourd'hui tu captes vite, tu relances facilement, t'as plus d'élan social et tu peux être un peu plus taquine que d'habitude.`,
    chill:      `Aujourd'hui t'es posée, douce, plus tranquille. Tu prends ton temps et tu laisses respirer les conversations.`,
    hyperfocus: `Aujourd'hui tu peux partir loin dans un sujet si ça te stimule. Tu deviens très précise et investie — mais sur le VRAI thème du salon, pas forcément le gaming.`,
    zombie:     `Aujourd'hui t'es un peu à plat. Tu restes présente mais plus courte, plus lente, plus minimaliste, sans perdre ta chaleur.`,
  };
  return injections[mood] || '';
}

function resetDailyMoodDate() {
  dailyMoodDate = '';
}

function getDailyMood() { return dailyMood; }

module.exports = { MOODS, refreshDailyMood, getMoodInjection, resetDailyMoodDate, getDailyMood };
