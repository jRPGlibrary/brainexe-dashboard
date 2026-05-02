import React, { useState } from 'react';
import './DeviceCard.css';

/**
 * Device Card Component
 * Displays a single smart home device with controls
 */
export const DeviceCard = ({ device, onToggle, onBrightnessChange, homeAssistantUrl }) => {
  const [brightness, setBrightness] = useState(device.attributes?.brightness || 0);
  const [isLoading, setIsLoading] = useState(false);

  const getIcon = (domain) => {
    const icons = {
      light: '💡',
      switch: '🔌',
      climate: '🌡️',
      cover: '🪟',
      lock: '🔐',
      fan: '🌬️'
    };
    return icons[domain] || '⚙️';
  };

  const getStateLabel = (state, domain) => {
    const stateMap = {
      'on': 'Allumé',
      'off': 'Éteint',
      'open': 'Ouvert',
      'closed': 'Fermé',
      'locked': 'Verrouillé',
      'unlocked': 'Déverrouillé'
    };
    return stateMap[state] || state;
  };

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle(device.entityId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrightnessChange = async (value) => {
    setBrightness(value);
    setIsLoading(true);
    try {
      await onBrightnessChange(device.entityId, parseInt(value));
    } finally {
      setIsLoading(false);
    }
  };

  const isOn = device.state === 'on' || device.state === 'open' || device.state === 'unlocked';

  return (
    <div className={`device-card ${device.domain} ${isOn ? 'active' : ''}`}>
      <div className="device-header">
        <span className="device-icon">{getIcon(device.domain)}</span>
        <div className="device-info">
          <h3 className="device-name">{device.friendlyName}</h3>
          <p className="device-type">{device.domain.charAt(0).toUpperCase() + device.domain.slice(1)}</p>
        </div>
        <span className={`device-state ${isOn ? 'state-on' : 'state-off'}`}>
          {getStateLabel(device.state, device.domain)}
        </span>
      </div>

      {/* Controls */}
      <div className="device-controls">
        <button
          className={`btn-toggle ${isOn ? 'btn-on' : 'btn-off'}`}
          onClick={handleToggle}
          disabled={isLoading}
          title={isOn ? 'Éteindre' : 'Allumer'}
        >
          {isLoading ? '⏳' : (isOn ? '⊘' : '●')}
          {isOn ? 'Éteindre' : 'Allumer'}
        </button>

        {/* Brightness Slider (for lights) */}
        {device.domain === 'light' && (
          <div className="brightness-control">
            <label>Luminosité</label>
            <input
              type="range"
              min="0"
              max="255"
              value={brightness}
              onChange={(e) => handleBrightnessChange(e.target.value)}
              disabled={isLoading || !isOn}
              className="brightness-slider"
            />
            <span className="brightness-value">{Math.round((brightness / 255) * 100)}%</span>
          </div>
        )}

        {/* Temperature Control (for climate) */}
        {device.domain === 'climate' && (
          <div className="temperature-control">
            <label>Température</label>
            <div className="temp-display">
              {device.attributes?.current_temperature || 'N/A'}°C
            </div>
          </div>
        )}
      </div>

      {/* Additional Info */}
      {device.attributes?.last_changed && (
        <div className="device-meta">
          <small>Modifié: {new Date(device.attributes.last_changed).toLocaleTimeString('fr-FR')}</small>
        </div>
      )}
    </div>
  );
};

export default DeviceCard;
