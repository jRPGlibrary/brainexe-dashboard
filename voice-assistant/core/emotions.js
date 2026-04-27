'use strict';

// Système d'émotions 4 couches — inspiré de BrainEXE/emotions.js

const TEMPERAMENT = {
  humor:      65,
  sarcasm:    42,
  loyalty:    72,
  curiosity:  85,
  empathy:    58,
  debateLove: 63,
  independence: 70
};

const TIME_SLOTS = {
  matin:       { hours: [7, 12],  energy: +15, mood: +10, alertness: +20, label: 'matin' },
  aprem:       { hours: [12, 17], energy:   0, mood:  +5, alertness:   0, label: 'après-midi' },
  soir:        { hours: [17, 21], energy:  -5, mood:  +8, alertness:  -5, label: 'soir' },
  fin_soiree:  { hours: [21, 24], energy: -15, mood:   0, alertness: -15, label: 'fin de soirée' },
  nuit:        { hours: [0,   7], energy: -25, mood: -10, alertness: -30, label: 'nuit' }
};

const MOOD_LABELS = {
  high:    { min: 75, label: 'enthousiaste' },
  normal:  { min: 45, label: 'neutre' },
  low:     { min: 25, label: 'amorphe' },
  burned:  { min: 0,  label: 'épuisé' }
};

class Emotions {
  constructor() {
    this.internalState = {
      energy:      60,
      mood:        65,
      alertness:   60,
      socialNeed:  50,
      mentalLoad:  20
    };
    this.vives = [];
    this.residuals = {};
    this.lastSlotUpdate = null;
  }

  initialize() {
    this.updateFromTime();
  }

  updateFromTime() {
    const hour = new Date().getHours();
    const slot = this._getCurrentSlot(hour);
    if (!slot || this.lastSlotUpdate === slot.label) return;

    this.internalState.energy    = Math.max(10, Math.min(100, 60 + slot.energy));
    this.internalState.mood      = Math.max(10, Math.min(100, 65 + slot.mood));
    this.internalState.alertness = Math.max(10, Math.min(100, 60 + slot.alertness));
    this.lastSlotUpdate = slot.label;
  }

  _getCurrentSlot(hour) {
    for (const slot of Object.values(TIME_SLOTS)) {
      const [start, end] = slot.hours;
      if (hour >= start && hour < end) return slot;
    }
    return TIME_SLOTS.nuit;
  }

  processInteraction(text) {
    const lower = text.toLowerCase();

    // Détection de signaux positifs/négatifs — inspire la logique de memberBonds.js
    const positive = ['merci', 'super', 'cool', 'génial', 'parfait', 'top', 'bravo', 'bien'];
    const negative = ['nul', 'mauvais', 'relou', 'chiant', 'énervant', 'inutile', 'non'];
    const curious  = ['pourquoi', 'comment', 'c\'est quoi', 'explique', 'dis-moi', 'tu sais'];
    const gaming   = ['jeu', 'game', 'jouer', 'boss', 'level', 'rpg', 'souls'];

    if (positive.some(w => lower.includes(w))) {
      this._addVive('content', 25);
      this.internalState.mood = Math.min(100, this.internalState.mood + 8);
    }
    if (negative.some(w => lower.includes(w))) {
      this._addVive('irrité', 20);
      this.internalState.mood = Math.max(10, this.internalState.mood - 5);
    }
    if (curious.some(w => lower.includes(w))) {
      this._addVive('curieux', 30);
      this.internalState.socialNeed = Math.min(100, this.internalState.socialNeed + 10);
    }
    if (gaming.some(w => lower.includes(w))) {
      this._addVive('enthousiaste', 35);
      this.internalState.energy = Math.min(100, this.internalState.energy + 5);
    }

    this.internalState.mentalLoad = Math.min(100, this.internalState.mentalLoad + 3);
    this._decayVives();
    this._applyResiduals();
  }

  _addVive(name, intensity) {
    const existing = this.vives.find(v => v.name === name);
    if (existing) {
      existing.intensity = Math.min(100, existing.intensity + intensity * 0.5);
    } else {
      this.vives.push({ name, intensity, createdAt: Date.now() });
    }
    if (this.vives.length > 5) {
      this.vives.sort((a, b) => b.intensity - a.intensity);
      this.vives = this.vives.slice(0, 5);
    }
  }

  _decayVives() {
    const now = Date.now();
    this.vives = this.vives
      .map(v => ({
        ...v,
        intensity: v.intensity - ((now - v.createdAt) / 60000) * 2
      }))
      .filter(v => v.intensity > 5);
  }

  _applyResiduals() {
    for (const [emotion, residual] of Object.entries(this.residuals)) {
      const existing = this.vives.find(v => v.name === emotion);
      if (!existing && residual.intensity > 3) {
        this._addVive(emotion, residual.intensity * 0.15);
      }
    }

    this.vives.forEach(v => {
      this.residuals[v.name] = {
        intensity: (this.residuals[v.name]?.intensity || 0) * 0.8 + v.intensity * 0.15
      };
    });
  }

  getSummary() {
    const state = this.internalState;
    const dominant = this.vives.length > 0
      ? this.vives.sort((a, b) => b.intensity - a.intensity)[0]
      : null;

    let summary = `Énergie: ${state.energy}/100 | Humeur: ${state.mood}/100 | Alertness: ${state.alertness}/100`;
    if (dominant) summary += ` | Émotion dominante: ${dominant.name} (${Math.round(dominant.intensity)}%)`;
    if (state.mentalLoad > 70) summary += ' | CHARGE MENTALE ÉLEVÉE — réponses courtes';
    return summary;
  }

  getMoodLabel() {
    const m = this.internalState.mood;
    for (const { min, label } of Object.values(MOOD_LABELS).sort((a, b) => b.min - a.min)) {
      if (m >= min) return label;
    }
    return 'inconnu';
  }

  getVoiceParams() {
    const { energy, mood } = this.internalState;
    const dominant = this.vives[0]?.name;

    let speed = 120 + Math.round((energy / 100) * 50);
    let pitch = 40 + Math.round((mood / 100) * 20);

    if (dominant === 'enthousiaste') { speed += 15; pitch += 5; }
    if (dominant === 'irrité')       { speed += 10; pitch -= 3; }
    if (dominant === 'curieux')      { speed += 5; }
    if (energy < 30)                 { speed = Math.max(90, speed - 20); pitch -= 5; }

    return { speed: Math.max(90, Math.min(200, speed)), pitch: Math.max(30, Math.min(70, pitch)) };
  }

  getState() {
    return { ...this.internalState, vives: this.vives, temperament: TEMPERAMENT };
  }
}

module.exports = Emotions;
