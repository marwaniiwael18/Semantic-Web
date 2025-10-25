import React, { useState, useEffect } from 'react';
import './App.css';
import UserManagement from './components/UserManagement';
import TransportManagement from './components/TransportManagement';
import StationManagement from './components/StationManagement';
import EventManagement from './components/EventManagement';
import ZoneManagement from './components/ZoneManagement';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransports: 0,
    totalStations: 0,
    totalEvents: 0,
    totalZones: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const data = await response.json();
      setStats({
        totalUsers: data.totalUsers || 0,
        totalTransports: data.totalTransports || 0,
        totalStations: data.totalStations || 0,
        totalEvents: data.totalEvents || 0,
        totalZones: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const refreshStats = () => {
    loadStats();
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🏙️ Smart City & Mobility - Gestion Complète</h1>
        <p>Équipe Thunder - Web Sémantique 2025/2026</p>
      </header>

      <div className="stats-container">
        <div className="stat-card">
          <h3>{stats.totalUsers}</h3>
          <p>Utilisateurs</p>
          <small>👤 Yassine Mannai</small>
        </div>
        <div className="stat-card">
          <h3>{stats.totalTransports}</h3>
          <p>Transports</p>
          <small>🚌 Wael Marouani</small>
        </div>
        <div className="stat-card">
          <h3>{stats.totalStations}</h3>
          <p>Stations</p>
          <small>📍 Kenza Ben Slimane</small>
        </div>
        <div className="stat-card">
          <h3>{stats.totalEvents}</h3>
          <p>Événements</p>
          <small>⚠️ Aymen Jallouli</small>
        </div>
        <div className="stat-card">
          <h3>{stats.totalZones || 0}</h3>
          <p>Zones</p>
          <small>🏘️ Nassim Khaldi</small>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Utilisateurs (Yassine)
        </button>
        <button 
          className={`tab ${activeTab === 'transports' ? 'active' : ''}`}
          onClick={() => setActiveTab('transports')}
        >
          🚌 Transports (Wael)
        </button>
        <button 
          className={`tab ${activeTab === 'stations' ? 'active' : ''}`}
          onClick={() => setActiveTab('stations')}
        >
          📍 Stations (Kenza)
        </button>
        <button 
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          ⚠️ Événements (Aymen)
        </button>
        <button 
          className={`tab ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          🏘️ Zones (Nassim)
        </button>
      </div>

      <div className="content">
        {activeTab === 'users' && <UserManagement onUpdate={refreshStats} />}
        {activeTab === 'transports' && <TransportManagement onUpdate={refreshStats} />}
        {activeTab === 'stations' && <StationManagement onUpdate={refreshStats} />}
        {activeTab === 'events' && <EventManagement onUpdate={refreshStats} />}
        {activeTab === 'zones' && <ZoneManagement onUpdate={refreshStats} />}
      </div>

      <footer className="app-footer">
        <p>Chaque membre a son module CRUD complet: Create, Read, Update, Delete</p>
      </footer>
    </div>
  );
}

export default App;
