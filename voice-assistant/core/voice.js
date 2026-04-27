'use strict';

const { exec, execFile } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const LANG = process.env.VOICE_LANG || 'fr+m3';

// Détecte le moteur TTS disponible sur le système
async function detectTTSEngine() {
  const engines = ['espeak-ng', 'espeak', 'festival', 'say'];
  for (const engine of engines) {
    try {
      await execAsync(`which ${engine}`);
      return engine;
    } catch { /* continue */ }
  }
  return null;
}

let cachedEngine = null;

class Voice {
  constructor() {
    this.queue = Promise.resolve();
    this.muted = false;
  }

  say(text, params = {}) {
    // Enchaîner les messages pour éviter les chevauchements
    this.queue = this.queue.then(() => this._speak(text, params));
    return this.queue;
  }

  async _speak(text, { speed = 135, pitch = 50 } = {}) {
    if (this.muted || !text?.trim()) return;

    if (!cachedEngine) {
      cachedEngine = await detectTTSEngine();
    }

    if (!cachedEngine) {
      // Pas de TTS — silencieux
      return;
    }

    const clean = this._sanitize(text);

    try {
      if (cachedEngine === 'espeak-ng' || cachedEngine === 'espeak') {
        await execAsync(
          `${cachedEngine} -v ${LANG} -s ${speed} -p ${pitch} "${clean}"`,
          { timeout: 30000 }
        );
      } else if (cachedEngine === 'festival') {
        await execAsync(`echo "${clean}" | festival --tts`, { timeout: 30000 });
      } else if (cachedEngine === 'say') {
        // macOS
        await execAsync(`say "${clean}"`, { timeout: 30000 });
      }
    } catch {
      // TTS failure est non-fatal
    }
  }

  _sanitize(text) {
    return text
      .replace(/["`$\\]/g, '')
      .replace(/'/g, "'")
      .replace(/\n+/g, '. ')
      .slice(0, 500);
  }

  mute()   { this.muted = true; }
  unmute() { this.muted = false; }
  toggle() { this.muted = !this.muted; return this.muted; }

  async checkAvailability() {
    const engine = await detectTTSEngine();
    return { available: !!engine, engine };
  }
}

module.exports = Voice;
