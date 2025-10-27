// Dashboard.js - Enhanced Dashboard with Interactive Map
import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import TransportManagement from './TransportManagement';
import StationManagement from './StationManagement';
import EventManagement from './EventManagement';
import ZoneManagement from './ZoneManagement';
import AISparqlTool from './AISparqlTool';

const API_URL = 'http://localhost:5001/api';
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

mapboxgl.accessToken = MAPBOX_TOKEN;

const Dashboard = ({ stats = {}, user = {}, onNavigate = () => {} }) => {
  const [stations, setStations] = useState([]);
  const [events, setEvents] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      const stationsRes = await fetch(`${API_URL}/stations`);
      const stationsData = await stationsRes.json();
      setStations(Array.isArray(stationsData) ? stationsData : []);

      const eventsRes = await fetch(`${API_URL}/events`);
      const eventsData = await eventsRes.json();
      setEvents(Array.isArray(eventsData) ? eventsData.slice(0, 5) : []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const refreshStats = async () => {
    await loadDashboardData();
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !MAPBOX_TOKEN) return;

    const timer = setTimeout(() => {
      if (!mapContainer.current) return;

      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [10.1815, 36.8065],
          zoom: 11,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
          setMapReady(true);
          map.current.resize();
        });
      } catch (err) {
        console.error('Error initializing map:', err);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // Update markers when stations or events change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    stations.forEach((station) => {
      if (station.latitude && station.longitude) {
        const el = document.createElement('div');
        el.className = 'dashboard-marker station-marker';
        el.innerHTML = getStationIcon(station.type);
        el.style.fontSize = '24px';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([station.longitude, station.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div style="padding:8px;"><h4 style="margin:0 0 6px 0;">${getStationIcon(
                station.type
              )} ${station.nom}</h4><p style="margin:0;font-size:12px;color:#666;">${station.type}</p></div>`
            )
          )
          .addTo(map.current);

        markers.current.push(marker);
      }
    });

    events.forEach((event) => {
      if (event.latitude && event.longitude) {
        const el = document.createElement('div');
        el.className = 'dashboard-marker event-marker';
        el.innerHTML = '⚠️';
        el.style.fontSize = '20px';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([event.longitude || 10.1815, event.latitude || 36.8065])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div style="padding:8px;"><h4 style="margin:0 0 6px 0;">⚠️ ${event.nom}</h4><p style="margin:0;font-size:12px;color:#666;">${event.type}</p></div>`
            )
          )
          .addTo(map.current);

        markers.current.push(marker);
      }
    });
  }, [stations, events, mapReady]);

  const getStationIcon = (type) => {
    switch (type) {
      case 'StationBus':
        return '🚌';
      case 'StationMétro':
        return '🚇';
      case 'Parking':
        return '🅿️';
      case 'StationVelo':
        return '🚲';
      default:
        return '📍';
    }
  };

  const getEventSeverityColor = (gravite) => {
    if (gravite >= 4) return '#ef4444';
    if (gravite >= 3) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="dashboard-view">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div>
          <h2>Welcome back, {user?.username}! 👋</h2>
          <p>Here's what's happening with your Smart City infrastructure today</p>
        </div>
        <div className="welcome-time">
          <span className="current-time">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="dashboard-stats-grid">
        <div className="stat-card" onClick={() => onNavigate('users')}>
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            👥
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-change positive">+12% this month</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('transports')}>
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            🚌
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalTransports}</div>
            <div className="stat-label">Transports</div>
            <div className="stat-change positive">+5 new vehicles</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('stations')}>
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            📍
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalStations}</div>
            <div className="stat-label">Stations</div>
            <div className="stat-change neutral">Active hubs</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate('events')}>
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            ⚠️
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalEvents}</div>
            <div className="stat-label">Active Events</div>
            <div className="stat-change warning">Requires attention</div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          📊 Dashboard
        </button>
        <button className={`tab ${activeTab === 'transports' ? 'active' : ''}`} onClick={() => setActiveTab('transports')}>
          🚌 Transports
        </button>
        <button className={`tab ${activeTab === 'stations' ? 'active' : ''}`} onClick={() => setActiveTab('stations')}>
          📍 Stations
        </button>
        <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          ⚠️ Events
        </button>
        <button className={`tab ${activeTab === 'zones' ? 'active' : ''}`} onClick={() => setActiveTab('zones')}>
          🏘️ Zones
        </button>
      </div>

      <div className="content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-content-grid">
            <div className="dashboard-section map-section">
              <div className="section-header">
                <h3>🗺️ City Overview Map</h3>
                <div className="map-legend">
                  <span className="legend-item">
                    <span className="legend-icon">🚌</span> Stations
                  </span>
                  <span className="legend-item">
                    <span className="legend-icon">⚠️</span> Events
                  </span>
                </div>
              </div>
              <div ref={mapContainer} className="dashboard-map" style={{ width: '100%', height: '450px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }} />
              <div className="map-footer">
                <span className="map-info">📍 {stations.length} stations</span>
                <span className="map-info">⚠️ {events.length} active events</span>
              </div>
            </div>

            <div className="dashboard-section">
              <div className="section-header">
                <h3>⚠️ Recent Events</h3>
                <button className="btn-link" onClick={() => onNavigate('events')}>View All →</button>
              </div>
              <div className="events-list">
                {events.length === 0 ? (
                  <div className="empty-state-small">
                    <span>✅</span>
                    <p>No active events</p>
                  </div>
                ) : (
                  events.map((event, index) => (
                    <div key={index} className="event-item">
                      <div className="event-icon" style={{ background: getEventSeverityColor(event.gravite || 3) }}>
                        ⚠️
                      </div>
                      <div className="event-details">
                        <h4>{event.nom}</h4>
                        <p>{event.type} • {(event.description && event.description.substring ? event.description.substring(0, 50) : 'No description')}</p>
                      </div>
                      <div className="event-severity">
                        <div className="severity-indicator-small">
                          {[1, 2, 3, 4, 5].map((dot) => (
                            <div key={dot} className={`severity-dot-small ${dot <= (event.gravite || 0) ? 'active' : ''}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* AI NL → SPARQL tool */}
            <div className="dashboard-section">
              <div className="section-header">
                <h3>🤖 Interroger le dataset (NL → SPARQL)</h3>
              </div>
              <div style={{ padding: 8 }}>
                <AISparqlTool />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transports' && <TransportManagement onUpdate={refreshStats} />}
        {activeTab === 'stations' && <StationManagement onUpdate={refreshStats} />}
        {activeTab === 'events' && <EventManagement onUpdate={refreshStats} />}
        {activeTab === 'zones' && <ZoneManagement onUpdate={refreshStats} />}
      </div>
    </div>
  );
};

export default Dashboard;
