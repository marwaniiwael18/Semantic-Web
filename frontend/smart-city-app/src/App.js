import React, { useState, useEffect } from 'react';
import './App.css';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import UserManagement from './components/UserManagement';
import TransportManagement from './components/TransportManagement';
import StationManagement from './components/StationManagement';
import EventManagement from './components/EventManagement';
import ZoneManagement from './components/ZoneManagement';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'login', 'register', 'dashboard'
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransports: 0,
    totalStations: 0,
    totalEvents: 0,
    totalZones: 0
  });

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('smartcity_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentView('dashboard');
    }
  }, []);

  useEffect(() => {
    if (currentView === 'dashboard') {
      loadStats();
    }
  }, [currentView]);

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

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('smartcity_user');
    setUser(null);
    setCurrentView('landing');
    setActiveTab('dashboard');
  };

  // Landing page view
  if (currentView === 'landing') {
    return <Landing 
      onGetStarted={() => setCurrentView('register')} 
      onLogin={() => setCurrentView('login')} 
    />;
  }

  // Login view
  if (currentView === 'login') {
    return <Login 
      onLogin={handleLogin} 
      onSwitchToRegister={() => setCurrentView('register')} 
    />;
  }

  // Register view
  if (currentView === 'register') {
    return <Register 
      onRegister={handleRegister} 
      onSwitchToLogin={() => setCurrentView('login')} 
    />;
  }

  // Dashboard view
  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <h1>🏙️ Smart City & Mobility</h1>
          <p>Management Dashboard</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</span>
            <span className="user-name">{user?.name}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-logout">
            Logout
          </button>
        </div>
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
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
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
        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
            <div className="welcome-banner">
              <h2>Welcome back, {user?.name}! 👋</h2>
              <p>Here's an overview of your Smart City management system</p>
            </div>
            
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <h3>📊 System Statistics</h3>
                </div>
                <div className="dashboard-stats">
                  <div className="mini-stat">
                    <span className="mini-stat-value">{stats.totalUsers}</span>
                    <span className="mini-stat-label">Users</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-value">{stats.totalTransports}</span>
                    <span className="mini-stat-label">Transports</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-value">{stats.totalStations}</span>
                    <span className="mini-stat-label">Stations</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-value">{stats.totalEvents}</span>
                    <span className="mini-stat-label">Events</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <h3>👥 Team Modules</h3>
                </div>
                <div className="team-modules">
                  <div className="module-item" onClick={() => setActiveTab('users')}>
                    <span className="module-icon">👥</span>
                    <div>
                      <strong>User Management</strong>
                      <p>Yassine Mannai</p>
                    </div>
                  </div>
                  <div className="module-item" onClick={() => setActiveTab('transports')}>
                    <span className="module-icon">🚌</span>
                    <div>
                      <strong>Transport Management</strong>
                      <p>Wael Marouani</p>
                    </div>
                  </div>
                  <div className="module-item" onClick={() => setActiveTab('stations')}>
                    <span className="module-icon">📍</span>
                    <div>
                      <strong>Station Management</strong>
                      <p>Kenza Ben Slimane</p>
                    </div>
                  </div>
                  <div className="module-item" onClick={() => setActiveTab('events')}>
                    <span className="module-icon">⚠️</span>
                    <div>
                      <strong>Event Management</strong>
                      <p>Aymen Jallouli</p>
                    </div>
                  </div>
                  <div className="module-item" onClick={() => setActiveTab('zones')}>
                    <span className="module-icon">🏘️</span>
                    <div>
                      <strong>Zone Management</strong>
                      <p>Nassim Khaldi</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <h3>🛠️ Technologies</h3>
                </div>
                <div className="tech-badges">
                  <span className="tech-badge-small">React 18</span>
                  <span className="tech-badge-small">Python 3.13</span>
                  <span className="tech-badge-small">Flask 3.0</span>
                  <span className="tech-badge-small">RDFLib 7.0</span>
                  <span className="tech-badge-small">SPARQL</span>
                  <span className="tech-badge-small">Google Gemini AI</span>
                </div>
              </div>
            </div>
          </div>
        )}
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
