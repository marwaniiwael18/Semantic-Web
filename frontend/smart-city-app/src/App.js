import React, { useState, useEffect } from 'react';
import './App.css';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import UserProfile from './components/UserProfile';
import Dashboard from './components/Dashboard';
import TransportManagement from './components/TransportManagement';
import StationManagement from './components/StationManagement';
import EventManagement from './components/EventManagement';
import ZoneManagement from './components/ZoneManagement';

const API_URL = 'http://localhost:5001/api';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'login', 'register', 'dashboard'
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
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
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setCurrentView('dashboard');
      
      // Load profile image
      const savedImage = localStorage.getItem(`profile_image_${userData.id}`);
      if (savedImage) {
        setProfileImage(savedImage);
      }
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
    setProfileImage(null);
    setCurrentView('landing');
    setActiveTab('dashboard');
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
    const savedImage = localStorage.getItem(`profile_image_${updatedUser.id}`);
    if (savedImage) {
      setProfileImage(savedImage);
    }
  };

  const getUserInitials = () => {
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
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
      {showProfile && (
        <UserProfile 
          user={user}
          onUpdate={handleProfileUpdate}
          onClose={() => setShowProfile(false)}
        />
      )}

      <header className="app-header">
        <div className="header-left">
          <h1>🏙️ Smart City & Mobility</h1>
          <p>Management Dashboard</p>
        </div>
        <div className="header-right">
          <div className="user-info" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="user-avatar-image" />
            ) : (
              <span className="user-avatar">{getUserInitials()}</span>
            )}
            <span className="user-name">{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-logout">
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="stats-container">
        <div className="stat-card">
          <h3>{stats.totalTransports}</h3>
          <p>Transports</p>
          <small>🚌 Transport System</small>
        </div>
        <div className="stat-card">
          <h3>{stats.totalStations}</h3>
          <p>Stations</p>
          <small>📍 Station Network</small>
        </div>
        <div className="stat-card">
          <h3>{stats.totalEvents}</h3>
          <p>Événements</p>
          <small>⚠️ Traffic Events</small>
        </div>
        <div className="stat-card">
          <h3>{stats.totalZones || 0}</h3>
          <p>Zones</p>
          <small>🏘️ Urban Zones</small>
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
          className={`tab ${activeTab === 'transports' ? 'active' : ''}`}
          onClick={() => setActiveTab('transports')}
        >
          🚌 Transports
        </button>
        <button 
          className={`tab ${activeTab === 'stations' ? 'active' : ''}`}
          onClick={() => setActiveTab('stations')}
        >
          📍 Stations
        </button>
        <button 
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          ⚠️ Events
        </button>
        <button 
          className={`tab ${activeTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveTab('zones')}
        >
          🏘️ Zones
        </button>
      </div>

      <div className="content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            stats={stats} 
            user={user} 
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'transports' && <TransportManagement onUpdate={refreshStats} />}
        {activeTab === 'stations' && <StationManagement onUpdate={refreshStats} />}
        {activeTab === 'events' && <EventManagement onUpdate={refreshStats} />}
        {activeTab === 'zones' && <ZoneManagement onUpdate={refreshStats} />}
      </div>

      <footer className="app-footer">
        <p>Full CRUD operations: Create, Read, Update, Delete</p>
      </footer>
    </div>
  );
}

export default App;
