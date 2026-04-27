'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const execAsync = promisify(exec);
const TMP_AUDIO = path.join(__dirname, '..', '.tmp_recording.wav');

// Stratégie STT : OpenAI Whisper API > CLI whisper > mode texte
async function detectSTTMethod() {
  if (process.env.OPENAI_API_KEY) return 'whisper-api';
  try {
    await execAsync('which whisper');
    return 'whisper-cli';
  } catch { /* continue */ }
  try {
    await execAsync('which arecord');
    return 'arecord-only'; // Enregistrement OK mais pas de transcription
  } catch { /* continue */ }
  return 'text';
}

class Ear {
  constructor() {
    this.sttMethod = null;
    this.rl = null;
  }

  async initialize() {
    this.sttMethod = await detectSTTMethod();
    return this.sttMethod;
  }

  async listen(timeoutMs = 5000) {
    if (!this.sttMethod) {
      this.sttMethod = await detectSTTMethod();
    }

    switch (this.sttMethod) {
      case 'whisper-api':
        return this._listenWhisperAPI(timeoutMs);
      case 'whisper-cli':
        return this._listenWhisperCLI(timeoutMs);
      default:
        throw new Error('Mode vocal non disponible — utilise --text');
    }
  }

  async listenText(promptText = '') {
    return new Promise((resolve) => {
      if (!this.rl) {
        this.rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
      }
      this.rl.question(promptText, (answer) => resolve(answer.trim()));
    });
  }

  async _listenWhisperAPI(timeoutMs) {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    await this._recordAudio(Math.floor(timeoutMs / 1000));

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(TMP_AUDIO),
      model: 'whisper-1',
      language: 'fr'
    });

    this._cleanTmp();
    return transcription.text?.trim() || '';
  }

  async _listenWhisperCLI(timeoutMs) {
    const seconds = Math.floor(timeoutMs / 1000);
    await this._recordAudio(seconds);

    const { stdout } = await execAsync(
      `whisper "${TMP_AUDIO}" --language fr --model small --output_format txt --output_dir /tmp`,
      { timeout: 60000 }
    );

    this._cleanTmp();
    return (stdout || '').replace(/\n/g, ' ').trim();
  }

  async _recordAudio(seconds) {
    const duration = Math.max(1, Math.min(30, seconds));
    try {
      // ALSA (Linux)
      await execAsync(`arecord -f cd -t wav -d ${duration} "${TMP_AUDIO}"`, { timeout: (duration + 5) * 1000 });
    } catch {
      // Fallback: sox
      await execAsync(`rec -r 16000 -c 1 "${TMP_AUDIO}" trim 0 ${duration}`, { timeout: (duration + 5) * 1000 });
    }
  }

  _cleanTmp() {
    try { fs.unlinkSync(TMP_AUDIO); } catch { /* ignore */ }
  }

  async getSTTInfo() {
    const method = await detectSTTMethod();
    const labels = {
      'whisper-api': 'OpenAI Whisper API',
      'whisper-cli': 'Whisper CLI local',
      'arecord-only': 'Micro détecté (pas de transcription)',
      'text': 'Mode texte uniquement'
    };
    return { method, label: labels[method] || method };
  }
}

module.exports = Ear;
