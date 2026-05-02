import { useState, useRef, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer la capture audio et le traitement vocal
 * Gère: capture audio, envoi au service, feedback
 */
export const useVoice = (voiceProcessorUrl = 'http://localhost:3002') => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [lastCommand, setLastCommand] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  /**
   * Start recording audio from microphone
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      setFeedback('🎤 En écoute...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      // Handle recording end
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);

        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      setError(`Erreur micro: ${err.message}`);
      setFeedback('❌ Impossible d\'accéder au microphone');
    }
  }, []);

  /**
   * Stop recording
   */
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setFeedback('⏳ Traitement en cours...');
    }
  }, [isListening]);

  /**
   * Send audio to Voice Processor service
   */
  const processAudio = useCallback(async (audioBlob) => {
    try {
      setIsProcessing(true);
      setFeedback('⏳ Traitement en cours...');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('language', 'fr');
      formData.append('debug', false);

      const response = await fetch(`${voiceProcessorUrl}/api/voice/process`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setFeedback(`✅ ${result.feedback}`);
        setLastCommand(result.parsed);
      } else {
        setFeedback(`❌ ${result.feedback || result.error}`);
      }

      setIsProcessing(false);
    } catch (err) {
      setError(err.message);
      setFeedback('❌ Erreur lors du traitement');
      setIsProcessing(false);
    }
  }, [voiceProcessorUrl]);

  /**
   * Process text command directly (without speech recognition)
   */
  const processText = useCallback(async (text) => {
    try {
      setIsProcessing(true);
      setFeedback('⏳ Traitement en cours...');

      const response = await fetch(`${voiceProcessorUrl}/api/voice/parse-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'fr' })
      });

      const result = await response.json();

      if (result.success) {
        setFeedback(`✅ Commande reconnue`);
        setLastCommand(result.parsed);
      } else {
        setFeedback(`❌ Commande non comprise`);
      }

      setIsProcessing(false);
    } catch (err) {
      setError(err.message);
      setFeedback('❌ Erreur');
      setIsProcessing(false);
    }
  }, [voiceProcessorUrl]);

  /**
   * Clear feedback
   */
  const clearFeedback = useCallback(() => {
    setFeedback('');
  }, []);

  return {
    // State
    isListening,
    isProcessing,
    feedback,
    lastCommand,
    error,

    // Methods
    startListening,
    stopListening,
    processAudio,
    processText,
    clearFeedback
  };
};
