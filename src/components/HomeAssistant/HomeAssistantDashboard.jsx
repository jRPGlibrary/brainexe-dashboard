import React from 'react';
import VoiceControl from './VoiceControl';
import DeviceList from './DeviceList';
import './HomeAssistantDashboard.css';

/**
 * Home Assistant Dashboard
 * Main component that integrates voice control and device management
 */
export const HomeAssistantDashboard = ({
  voiceProcessorUrl = 'http://localhost:3002',
  homeAssistantUrl = 'http://localhost:3001'
}) => {
  return (
    <div className="ha-dashboard">
      <div className="ha-background"></div>

      <div className="ha-content">
        {/* Header */}
        <div className="ha-header">
          <h1>🏠 Brainee Smart Home</h1>
          <p>Contrôlez votre maison avec la voix et l'interface</p>
        </div>

        {/* Main Layout */}
        <div className="ha-main-grid">
          {/* Voice Control Section */}
          <section className="ha-section ha-voice-section">
            <VoiceControl voiceProcessorUrl={voiceProcessorUrl} />
          </section>

          {/* Device List Section */}
          <section className="ha-section ha-devices-section">
            <DeviceList homeAssistantUrl={homeAssistantUrl} />
          </section>
        </div>

        {/* Footer */}
        <div className="ha-footer">
          <div className="service-status">
            <div className="status-item">
              <span className="status-dot voice-status"></span>
              <span>Voice Processor</span>
            </div>
            <div className="status-item">
              <span className="status-dot ha-status"></span>
              <span>Home Assistant</span>
            </div>
            <div className="status-item">
              <span className="status-dot connected"></span>
              <span>Connected</span>
            </div>
          </div>
          <p className="footer-text">
            Powered by Home Assistant • Voice Processing • Brainee Intelligence
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeAssistantDashboard;
