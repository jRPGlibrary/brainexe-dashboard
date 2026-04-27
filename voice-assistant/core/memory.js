'use strict';

// Mémoire + liens utilisateur — inspiré de channelMemory.js + memberBonds.js (BrainEXE)

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '..', '.nex_memory.json');
const MAX_HISTORY = 20;

const PREFERENCE_KEYWORDS = {
  gaming:  ['jeu', 'game', 'jouer', 'gaming', 'boss', 'rpg', 'souls', 'steam', 'ps5', 'xbox'],
  tech:    ['code', 'dev', 'programme', 'tech', 'ia', 'serveur', 'linux', 'api', 'bug'],
  musique: ['musique', 'chanson', 'artiste', 'playlist', 'son', 'album', 'concert'],
  anime:   ['anime', 'manga', 'épisode', 'saison', 'shonen', 'crunchyroll'],
  sport:   ['sport', 'match', 'foot', 'basket', 'tennis', 'entraînement']
};

const DEFAULT_BOND = {
  trust:        0,
  warmth:       0,
  interactions: 0,
  preferences:  {},
  keyMoments:   [],
  userName:     process.env.USER_NAME || null,
  firstMet:     null,
  lastSeen:     null
};

class Memory {
  constructor() {
    this.history = [];
    this.bond = { ...DEFAULT_BOND };
  }

  async load() {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        this.history = data.history || [];
        this.bond = { ...DEFAULT_BOND, ...data.bond };
        this.bond.lastSeen = new Date().toISOString();
      } else {
        this.bond.firstMet = new Date().toISOString();
        this.bond.lastSeen = new Date().toISOString();
      }
    } catch {
      this.bond.firstMet = new Date().toISOString();
    }
  }

  save() {
    try {
      fs.writeFileSync(MEMORY_FILE, JSON.stringify({
        history: this.history.slice(-MAX_HISTORY),
        bond: this.bond
      }, null, 2));
    } catch { /* non-fatal */ }
  }

  addExchange(userText, nexResponse) {
    this.history.push(
      { role: 'user', content: userText },
      { role: 'assistant', content: nexResponse }
    );
    if (this.history.length > MAX_HISTORY * 2) {
      this.history = this.history.slice(-(MAX_HISTORY * 2));
    }
    this.save();
  }

  updateBond(userText, nexResponse) {
    const lower = userText.toLowerCase();
    this.bond.interactions++;
    this.bond.lastSeen = new Date().toISOString();

    // Mise à jour trust/warmth — inspiré de memberBonds.js
    const positive = ['merci', 'super', 'cool', 'génial', 'parfait', 'excellent', 'vraiment', 'j\'adore'];
    const negative = ['nul', 'mauvais', 'horrible', 'inutile', 'arrête', 'agaçant'];

    if (positive.some(w => lower.includes(w))) {
      this.bond.warmth = Math.min(100, this.bond.warmth + 3);
      this.bond.trust  = Math.min(100, this.bond.trust + 1);
    }
    if (negative.some(w => lower.includes(w))) {
      this.bond.warmth = Math.max(0, this.bond.warmth - 5);
    }

    // Confiance croît naturellement avec les interactions
    if (this.bond.interactions % 10 === 0) {
      this.bond.trust = Math.min(100, this.bond.trust + 2);
    }

    // Détection de préférences (inspiré de memberProfiles.js)
    for (const [cat, keywords] of Object.entries(PREFERENCE_KEYWORDS)) {
      if (keywords.some(w => lower.includes(w))) {
        this.bond.preferences[cat] = (this.bond.preferences[cat] || 0) + 1;
      }
    }

    // Moments-clés — quand un échange semble important
    if (userText.length > 80 && nexResponse.length > 100) {
      this.bond.keyMoments.push({
        at: new Date().toISOString(),
        topic: this._detectTopic(lower),
        impact: 'positive'
      });
      if (this.bond.keyMoments.length > 20) {
        this.bond.keyMoments = this.bond.keyMoments.slice(-20);
      }
    }

    this.save();
  }

  _detectTopic(text) {
    for (const [cat, kws] of Object.entries(PREFERENCE_KEYWORDS)) {
      if (kws.some(w => text.includes(w))) return cat;
    }
    return 'général';
  }

  getContext() {
    return this.history.slice(-(MAX_HISTORY * 2));
  }

  getBondLevel() {
    return Math.round((this.bond.trust * 0.6 + this.bond.warmth * 0.4));
  }

  getBondSummary() {
    const b = this.bond;
    const level = this.getBondLevel();
    const topPrefs = Object.entries(b.preferences)
      .sort((a, z) => z[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k)
      .join(', ');

    let summary = `Niveau de lien: ${level}/100 | Interactions: ${b.interactions}`;
    if (b.userName) summary += ` | Prénom: ${b.userName}`;
    if (topPrefs) summary += ` | Intérêts détectés: ${topPrefs}`;
    if (b.firstMet) summary += ` | Connu depuis: ${new Date(b.firstMet).toLocaleDateString('fr-FR')}`;

    return summary;
  }

  setUserName(name) {
    this.bond.userName = name;
    this.save();
  }

  reset() {
    this.history = [];
    this.bond = { ...DEFAULT_BOND, firstMet: new Date().toISOString(), lastSeen: new Date().toISOString() };
    this.save();
  }
}

module.exports = Memory;
