import React, { useState, useEffect } from 'react';
import DeviceCard from './DeviceCard';
import './DeviceList.css';

/**
 * Device List Component
 * Displays all Home Assistant devices with controls
 */
export const DeviceList = ({ homeAssistantUrl = 'http://localhost:3001' }) => {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch devices on mount and setup auto-refresh
  useEffect(() => {
    fetchDevices();

    if (autoRefresh) {
      const interval = setInterval(fetchDevices, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Apply filter
  useEffect(() => {
    if (filter === 'all') {
      setFilteredDevices(devices);
    } else {
      setFilteredDevices(devices.filter(d => d.domain === filter));
    }
  }, [devices, filter]);

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${homeAssistantUrl}/api/devices`);
      if (!response.ok) throw new Error('Failed to fetch devices');

      const data = await response.json();
      setDevices(data.data || []);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleToggle = async (entityId) => {
    try {
      const response = await fetch(`${homeAssistantUrl}/api/devices/${entityId}/toggle`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to toggle device');

      // Refresh devices
      fetchDevices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBrightnessChange = async (entityId, brightness) => {
    try {
      const response = await fetch(`${homeAssistantUrl}/api/devices/${entityId}/brightness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brightness })
      });

      if (!response.ok) throw new Error('Failed to set brightness');

      // Refresh devices
      fetchDevices();
    } catch (err) {
      setError(err.message);
    }
  };

  const getFilterLabel = (domain) => {
    const labels = {
      light: '💡 Lumières',
      switch: '🔌 Prises',
      climate: '🌡️ Thermostat',
      cover: '🪟 Volets',
      lock: '🔐 Serrures',
      fan: '🌬️ Ventilateurs'
    };
    return labels[domain] || domain;
  };

  if (loading) {
    return (
      <div className="device-list-container">
        <div className="loading">
          <span className="spinner"></span> Chargement des appareils...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="device-list-container">
        <div className="error">
          ❌ Erreur: {error}
          <button onClick={fetchDevices} className="btn-retry">Réessayer</button>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="device-list-container">
        <div className="empty">
          <p>Aucun appareil configuré dans Home Assistant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="device-list-container">
      <div className="device-list-header">
        <h2>🏠 Appareils Connectés</h2>
        <div className="list-controls">
          <button
            className={`btn-refresh ${!autoRefresh ? 'disabled' : ''}`}
            onClick={fetchDevices}
            title="Rafraîchir"
          >
            🔄
          </button>
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="device-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tous ({devices.length})
        </button>
        {['light', 'switch', 'climate', 'cover', 'lock', 'fan'].map(domain => {
          const count = devices.filter(d => d.domain === domain).length;
          return count > 0 ? (
            <button
              key={domain}
              className={`filter-btn ${filter === domain ? 'active' : ''}`}
              onClick={() => setFilter(domain)}
            >
              {getFilterLabel(domain)} ({count})
            </button>
          ) : null;
        })}
      </div>

      {/* Device List */}
      <div className="device-list">
        {filteredDevices.length > 0 ? (
          filteredDevices.map(device => (
            <DeviceCard
              key={device.entityId}
              device={device}
              onToggle={handleToggle}
              onBrightnessChange={handleBrightnessChange}
              homeAssistantUrl={homeAssistantUrl}
            />
          ))
        ) : (
          <div className="no-devices">
            Aucun appareil de ce type
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="device-summary">
        <div className="summary-stat">
          <span className="stat-value">{devices.filter(d => d.state === 'on').length}</span>
          <span className="stat-label">Allumés</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{devices.filter(d => d.state === 'off').length}</span>
          <span className="stat-label">Éteints</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{devices.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>
    </div>
  );
};

export default DeviceList;
