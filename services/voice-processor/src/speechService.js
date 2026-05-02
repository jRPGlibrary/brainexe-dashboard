const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const OpenAI = require('openai');

// Support pour Whisper (OpenAI) ou Google Speech-to-Text
const PROVIDER = process.env.SPEECH_PROVIDER || 'whisper'; // 'whisper' ou 'google'

class SpeechService {
  constructor() {
    if (PROVIDER === 'whisper') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Transcribe audio file to text
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {String} language - Language code (fr, en, etc.)
   * @returns {Promise<String>} Transcribed text
   */
  async transcribeAudio(audioBuffer, language = 'fr') {
    try {
      if (PROVIDER === 'whisper') {
        return await this._transcribeWithWhisper(audioBuffer, language);
      } else if (PROVIDER === 'google') {
        return await this._transcribeWithGoogle(audioBuffer, language);
      }
    } catch (error) {
      throw new Error(`Speech-to-Text failed: ${error.message}`);
    }
  }

  /**
   * Transcribe using OpenAI Whisper (Recommended - Fast & Accurate)
   */
  async _transcribeWithWhisper(audioBuffer, language) {
    try {
      const tempFile = '/tmp/audio.wav';
      fs.writeFileSync(tempFile, audioBuffer);

      const response = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-1',
        language: language === 'fr' ? 'fr' : language,
        prompt: 'Cette commande domotique concerne Brainee, un système de maison intelligente.'
      });

      fs.unlinkSync(tempFile);
      return response.text;
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe using Google Speech-to-Text (Alternative)
   */
  async _transcribeWithGoogle(audioBuffer, language) {
    try {
      const audio = {
        content: audioBuffer.toString('base64')
      };

      const config = {
        encoding: 'LINEAR16',
        languageCode: language === 'fr' ? 'fr-FR' : `${language}-${language.toUpperCase()}`,
        model: 'latest_long'
      };

      const response = await axios.post(
        `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_CLOUD_KEY}`,
        { audio, config }
      );

      const transcript = response.data.results
        ?.map(result => result.alternatives[0].transcript)
        .join(' ') || '';

      return transcript;
    } catch (error) {
      throw new Error(`Google transcription failed: ${error.message}`);
    }
  }
}

module.exports = new SpeechService();
