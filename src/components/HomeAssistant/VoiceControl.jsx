import React from 'react';
import { useVoice } from '../../hooks/useVoice';
import './VoiceControl.css';

/**
 * Voice Control Component
 * Allows user to give voice commands to control smart home devices
 *
 * Features:
 * - Microphone recording
 * - Speech-to-Text transcription
 * - Natural Language Understanding via Claude
 * - Real-time feedback
 */
export const VoiceControl = ({ voiceProcessorUrl = 'http://localhost:3002' }) => {
  const { isListening, isProcessing, feedback, lastCommand, error, startListening, stopListening, clearFeedback } = useVoice(voiceProcessorUrl);

  return (
    <div className="voice-control-container">
      <div className="voice-card">
        <h2>🎤 Contrôle Vocal</h2>

        {/* Microphone Button */}
        <div className="voice-button-group">
          {!isListening ? (
            <button
              className="btn-voice btn-voice-start"
              onClick={startListening}
              disabled={isProcessing}
            >
              🎤 Appuyer pour parler
            </button>
          ) : (
            <button
              className="btn-voice btn-voice-stop btn-voice-listening"
              onClick={stopListening}
            >
              ⏹️ Relâcher pour valider
            </button>
          )}
        </div>

        {/* Recording Indicator */}
        {isListening && (
          <div className="recording-indicator">
            <span className="pulse"></span>
            En écoute...
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="processing-indicator">
            ⏳ Traitement en cours...
          </div>
        )}

        {/* Feedback Message */}
        {feedback && (
          <div className="feedback-message">
            {feedback}
            {!isListening && !isProcessing && (
              <button className="btn-clear" onClick={clearFeedback}>✕</button>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* Last Command Details */}
        {lastCommand && (
          <div className="command-details">
            <h3>Dernière commande reconnue:</h3>
            <div className="command-info">
              <p><strong>Action:</strong> {lastCommand.action}</p>
              <p><strong>Cible:</strong> {lastCommand.targetFriendlyName || lastCommand.target}</p>
              <p><strong>Confiance:</strong> {(lastCommand.confidence * 100).toFixed(0)}%</p>
              {lastCommand.explanation && (
                <p><strong>Explication:</strong> {lastCommand.explanation}</p>
              )}
            </div>
          </div>
        )}

        {/* Quick Help */}
        <div className="voice-help">
          <h4>Exemples de commandes:</h4>
          <ul>
            <li>"Brainee éteind la chambre"</li>
            <li>"Augmente la luminosité du salon"</li>
            <li>"Ouvre les volets"</li>
            <li>"Dis à Brainee de baisser la température"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoiceControl;
