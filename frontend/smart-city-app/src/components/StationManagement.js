import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './StationManagement.css';

const API_URL = 'http://localhost:5001/api';
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

console.log('🔧 [STATION MODULE] API_URL:', API_URL);
console.log('🔧 [STATION MODULE] MAPBOX_TOKEN:', MAPBOX_TOKEN ? `EXISTS (${MAPBOX_TOKEN.substring(0, 10)}...)` : '❌ MISSING');

mapboxgl.accessToken = MAPBOX_TOKEN;

function StationManagement() {
  console.log('🚀 [STATION COMPONENT] Component rendering/re-rendering');

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('map');
  const [showForm, setShowForm] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'StationMétro',
    latitude: '',
    longitude: ''
  });
  const [editingStation, setEditingStation] = useState(null);
  const [tempMarker, setTempMarker] = useState(null); // Temporary marker for new station location
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [recommendationMarkers, setRecommendationMarkers] = useState([]);

  // Function to get emoji for station type
  const getStationEmoji = (type) => {
    const emojiMap = {
      'StationMétro': '🚇',
      'StationBus': '🚌',
      'StationTrain': '🚆',
      'StationTram': '🚊',
      'Parking': '🅿️',
      'StationVélo': '🚲',
      'StationTaxi': '🚕',
      'Arrêt': '🛑'
    };
    return emojiMap[type] || '📍';
  };

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  console.log('📊 [STATION COMPONENT] Current state:', {
    viewMode,
    showForm,
    mapReady,
    stationsCount: stations.length,
    loading,
    error,
    'mapContainer.current': mapContainer.current ? 'EXISTS' : 'NULL',
    'map.current': map.current ? 'EXISTS' : 'NULL'
  });

  useEffect(() => {
    console.log('📥 [STATION COMPONENT] Initial mount - loading stations');
    loadStations();
  }, []);

  const loadStations = async () => {
    console.log('📡 [STATION API] Fetching stations from:', `${API_URL}/stations`);
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/stations`);
      console.log('📡 [STATION API] Response received:', response.status, response.statusText);
      const data = await response.json();
      console.log('📡 [STATION API] Data parsed:', data);
      console.log('📡 [STATION API] Number of stations:', data.length);
      setStations(data);
      setError(null);
      console.log('✅ [STATION API] Stations loaded successfully');
    } catch (error) {
      console.error('💥 [STATION API] Error loading stations:', error);
      console.error('💥 [STATION API] Error stack:', error.stack);
      setError('Failed to load stations');
    } finally {
      setLoading(false);
      console.log('✅ [STATION API] Loading complete');
    }
  };

  // EXACT COPY from Dashboard - Initialize map
  useEffect(() => {
    console.log('🗺️ [STATION MAP] useEffect triggered');
    console.log('🗺️ [STATION MAP] mapContainer.current:', mapContainer.current);
    console.log('🗺️ [STATION MAP] map.current:', map.current);
    console.log('🗺️ [STATION MAP] MAPBOX_TOKEN:', MAPBOX_TOKEN ? 'EXISTS' : 'MISSING');
    console.log('🗺️ [STATION MAP] viewMode:', viewMode);
    console.log('🗺️ [STATION MAP] showForm:', showForm);

    if (!MAPBOX_TOKEN) {
      console.log('❌ [STATION MAP] MAPBOX_TOKEN is missing - aborting');
      return;
    }
    if (map.current) {
      console.log('⏭️ [STATION MAP] map already exists - skipping init');
      return;
    }
    if (!mapContainer.current) {
      console.log('❌ [STATION MAP] mapContainer.current is NULL - will retry on next render');
      return;
    }

    console.log('✅ [STATION MAP] All checks passed, setting timeout...');

    const timer = setTimeout(() => {
      console.log('⏰ [STATION MAP] Timeout fired (100ms)');
      console.log('🗺️ [STATION MAP] mapContainer.current in timeout:', mapContainer.current);
      
      if (!mapContainer.current) {
        console.log('❌ [STATION MAP] mapContainer disappeared during timeout');
        return;
      }

      try {
        console.log('🏗️ [STATION MAP] Creating new Mapbox map...');
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [10.1815, 36.8065],
          zoom: 11
        });
        console.log('✅ [STATION MAP] Map instance created:', map.current);

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        console.log('✅ [STATION MAP] Navigation control added');

        map.current.on('load', () => {
          console.log('🎉 [STATION MAP] Map LOAD event fired!');
          setMapReady(true);
          map.current.resize();
          console.log('✅ [STATION MAP] Map resized and ready');
        });

        map.current.on('click', (e) => {
          console.log('🖱️ [STATION MAP] Map clicked:', e.lngLat);
          const { lng, lat } = e.lngLat;
          
          // Remove previous temporary marker if exists
          if (tempMarker) {
            tempMarker.remove();
          }
          
          // Create temporary marker at clicked location
          const el = document.createElement('div');
          el.className = 'temp-marker';
          el.innerHTML = '📍';
          el.style.fontSize = '32px';
          el.style.animation = 'bounce 0.5s ease';
          
          const newTempMarker = new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25, closeButton: false })
                .setHTML(`
                  <div style="padding: 8px; text-align: center;">
                    <p style="margin: 0; font-weight: bold;">📍 New Station Location</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">
                      ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </p>
                  </div>
                `)
            )
            .addTo(map.current);
          
          newTempMarker.togglePopup();
          setTempMarker(newTempMarker);
          
          // Auto-generate ID based on timestamp for uniqueness
          const timestamp = Date.now();
          const stationId = `Station_${timestamp}`;
          
          setFormData({
            id: stationId, // Hidden from user but used for backend
            nom: '',
            type: 'StationMétro',
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
          });
          setShowForm(true);
          setEditingStation(null);
          console.log('✅ [STATION MAP] Form opened with coords:', lat, lng);
        });

        console.log('✅ [STATION MAP] All event listeners attached');

      } catch (error) {
        console.error('💥 [STATION MAP] Error initializing map:', error);
        console.error('💥 [STATION MAP] Error stack:', error.stack);
      }
    }, 100);

    return () => {
      console.log('🧹 [STATION MAP] Cleanup function called');
      clearTimeout(timer);
      if (map.current) {
        console.log('🗑️ [STATION MAP] Removing map instance');
        map.current.remove();
        map.current = null;
      }
      setMapReady(false);
      console.log('✅ [STATION MAP] Cleanup complete');
    };
  }, [viewMode, showForm, loading]); // Re-run when viewMode, showForm, or loading changes

  // EXACT COPY from Dashboard - Update markers
  useEffect(() => {
    console.log('📍 [STATION MARKERS] useEffect triggered');
    console.log('📍 [STATION MARKERS] map.current:', map.current);
    console.log('📍 [STATION MARKERS] mapReady:', mapReady);
    console.log('📍 [STATION MARKERS] stations count:', stations.length);

    if (!map.current || !mapReady) {
      console.log('⏭️ [STATION MARKERS] Map not ready, skipping marker update');
      return;
    }

    console.log('🧹 [STATION MARKERS] Removing old markers...');
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    console.log('✅ [STATION MARKERS] Old markers cleared');

    console.log('🏗️ [STATION MARKERS] Adding new markers for', stations.length, 'stations');
    stations.forEach((station, index) => {
      console.log(`📍 [STATION MARKERS] Processing station ${index + 1}:`, station);
      
      if (station.latitude && station.longitude) {
        // Get the appropriate emoji for this station type
        const stationEmoji = getStationEmoji(station.type);
        
        const el = document.createElement('div');
        el.className = 'dashboard-marker station-marker';
        el.innerHTML = stationEmoji;
        el.style.fontSize = '32px';
        el.style.cursor = 'pointer';
        el.style.transition = 'transform 0.2s ease';
        el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
        
        // Add hover effect
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.3)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([parseFloat(station.longitude), parseFloat(station.latitude)])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 12px; min-width: 200px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #2c3e50;">
                    ${stationEmoji} ${station.nom}
                  </h4>
                  <p style="margin: 0; font-size: 13px; color: #7f8c8d; font-weight: 600;">
                    ${station.type}
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #95a5a6; font-family: monospace;">
                    📍 ${parseFloat(station.latitude).toFixed(4)}, ${parseFloat(station.longitude).toFixed(4)}
                  </p>
                </div>
              `)
          )
          .addTo(map.current);

        markers.current.push(marker);
        console.log(`✅ [STATION MARKERS] Marker ${index + 1} added at [${station.longitude}, ${station.latitude}] with emoji: ${stationEmoji}`);
      } else {
        console.log(`⚠️ [STATION MARKERS] Station ${index + 1} missing coordinates - skipped`);
      }
    });
    console.log(`🎉 [STATION MARKERS] Total markers on map: ${markers.current.length}`);
  }, [stations, mapReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingStation
        ? `${API_URL}/stations/${formData.id}`
        : `${API_URL}/stations`;
      
      const response = await fetch(url, {
        method: editingStation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save station');
      
      // Remove temporary marker
      if (tempMarker) {
        tempMarker.remove();
        setTempMarker(null);
      }
      
      await loadStations();
      setShowForm(false);
      setEditingStation(null);
      setFormData({ id: '', nom: '', type: 'StationMétro', latitude: '', longitude: '' });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this station?')) return;
    
    try {
      const response = await fetch(`${API_URL}/stations/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      await loadStations();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (station) => {
    setEditingStation(station);
    setFormData({
      id: station.id, // Keep ID hidden but use it for updates
      nom: station.nom || '',
      type: station.type || 'StationMétro',
      latitude: station.latitude || '',
      longitude: station.longitude || ''
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    // Remove temporary marker when closing form
    if (tempMarker) {
      tempMarker.remove();
      setTempMarker(null);
    }
    setShowForm(false);
    setEditingStation(null);
    setFormData({ nom: '', type: 'StationMétro', latitude: '', longitude: '' });
  };

  const getAIRecommendations = async () => {
    setLoadingAI(true);
    try {
      // Get map center
      const center = map.current ? map.current.getCenter() : { lat: 36.8065, lng: 10.1815 };
      
      const response = await fetch(`${API_URL}/ai/recommend-stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapCenter: { lat: center.lat, lng: center.lng }
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.recommendations) {
        setAiRecommendations(data.recommendations);
        setShowRecommendations(true);
        
        // Clear existing recommendation markers
        recommendationMarkers.forEach(marker => marker.remove());
        
        // Add markers for recommendations
        const newMarkers = data.recommendations.map((rec, index) => {
          const el = document.createElement('div');
          el.className = 'ai-recommendation-marker';
          el.innerHTML = '✨';
          el.style.fontSize = '36px';
          el.style.cursor = 'pointer';
          el.style.animation = 'pulse 2s ease-in-out infinite';
          el.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))';
          
          const marker = new mapboxgl.Marker(el)
            .setLngLat([rec.longitude, rec.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25, maxWidth: '300px' })
                .setHTML(`
                  <div style="padding: 16px;">
                    <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 18px;">
                      ${getStationEmoji(rec.type)} ${rec.name}
                    </h3>
                    <p style="margin: 8px 0; padding: 8px; background: #f0f0f0; border-radius: 8px; font-size: 13px;">
                      <strong>Type:</strong> ${rec.type}
                    </p>
                    <p style="margin: 8px 0; color: #666; font-size: 13px; line-height: 1.5;">
                      ${rec.reason}
                    </p>
                    <div style="margin-top: 12px; padding: 8px; background: ${
                      rec.priority === 'high' ? '#ffe6e6' : rec.priority === 'medium' ? '#fff4e6' : '#e6f3ff'
                    }; border-radius: 6px; text-align: center;">
                      <strong style="color: ${
                        rec.priority === 'high' ? '#d32f2f' : rec.priority === 'medium' ? '#f57c00' : '#1976d2'
                      };">
                        Priority: ${rec.priority.toUpperCase()}
                      </strong>
                    </div>
                  </div>
                `)
            )
            .addTo(map.current);
          
          marker.togglePopup();
          return marker;
        });
        
        setRecommendationMarkers(newMarkers);
        
        // Fly to first recommendation
        if (data.recommendations.length > 0) {
          map.current.flyTo({
            center: [data.recommendations[0].longitude, data.recommendations[0].latitude],
            zoom: 13,
            duration: 2000
          });
        }
      } else {
        alert('Failed to get AI recommendations: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const clearRecommendations = () => {
    recommendationMarkers.forEach(marker => marker.remove());
    setRecommendationMarkers([]);
    setAiRecommendations([]);
    setShowRecommendations(false);
  };

  const applyRecommendation = (rec) => {
    const timestamp = Date.now();
    setFormData({
      id: `Station_${timestamp}`,
      nom: rec.name,
      type: rec.type,
      latitude: rec.latitude.toFixed(6),
      longitude: rec.longitude.toFixed(6)
    });
    setShowForm(true);
    setEditingStation(null);
    clearRecommendations();
  };

  if (loading && stations.length === 0) {
    return (
      <div className="station-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading stations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="station-management">
      <div className="station-header">
        <h1>Station Management</h1>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={viewMode === 'map' ? 'active' : ''}
              onClick={() => {
                console.log('🔄 [VIEW TOGGLE] Switching to MAP view');
                setViewMode('map');
              }}
            >
              🗺️ Map View
            </button>
            <button
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => {
                console.log('🔄 [VIEW TOGGLE] Switching to TABLE view');
                setViewMode('table');
              }}
            >
              📋 Table View
            </button>
          </div>
          <button 
            className="ai-recommend-btn"
            onClick={getAIRecommendations}
            disabled={loadingAI || !mapReady}
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loadingAI ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
              transition: 'all 0.3s ease',
              opacity: loadingAI ? 0.7 : 1
            }}
          >
            {loadingAI ? '🤖 Analyzing...' : '✨ AI Recommendations'}
          </button>
          <button 
            className="add-station-btn"
            onClick={() => {
              const timestamp = Date.now();
              setShowForm(true);
              setEditingStation(null);
              setFormData({ id: `Station_${timestamp}`, nom: '', type: 'StationMétro', latitude: '', longitude: '' });
            }}
          >
            + Add Station
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={loadStations}>Retry</button>
        </div>
      )}

      {showForm && (
        <div className="form-overlay" onClick={handleCloseForm}>
          <div className="station-form-container" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingStation ? '✏️ Edit Station' : '➕ Add New Station'}</h2>
              <button className="close-btn" onClick={handleCloseForm}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>🏷️ Station Name*</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  required
                  placeholder="e.g., Tunis Marine, Place Barcelone"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Station Type*</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="type-select"
                >
                  <option value="StationMétro">🚇 Metro Station</option>
                  <option value="StationBus">🚌 Bus Station</option>
                  <option value="StationTrain">🚆 Train Station</option>
                  <option value="StationTram">🚊 Tram Station</option>
                  <option value="Parking">🅿️ Parking</option>
                  <option value="StationVélo">🚲 Bike Station</option>
                  <option value="StationTaxi">🚕 Taxi Stand</option>
                  <option value="Arrêt">🛑 Bus Stop</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>📍 Latitude*</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    required
                    placeholder="36.8065"
                    className="coordinate-input"
                  />
                </div>
                <div className="form-group">
                  <label>📍 Longitude*</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    required
                    placeholder="10.1815"
                    className="coordinate-input"
                  />
                </div>
              </div>
              <div className="coordinate-hint">
                💡 Click anywhere on the map to automatically fill coordinates
              </div>
              <div className="form-actions">
                <button type="button" onClick={handleCloseForm} className="cancel-btn">
                  ✖️ Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingStation ? '💾 Update Station' : '➕ Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Section - ALWAYS RENDERED, visibility controlled by CSS */}
      <div 
        className="dashboard-section map-section"
        style={{ display: viewMode === 'map' ? 'block' : 'none' }}
      >
        {console.log('🔍 [MAP CONTAINER] Rendering map section, viewMode:', viewMode)}
        <div className="map-info">
          <p>📍 Click anywhere on the map to add a new station</p>
          <p>Total Stations: {stations.length}</p>
        </div>
        <div 
          ref={mapContainer} 
          className="dashboard-map"
          style={{
            width: '100%',
            height: '600px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
          }}
        />
      </div>

      {/* AI Recommendations Panel */}
      {showRecommendations && aiRecommendations.length > 0 && (
        <div className="ai-recommendations-panel" style={{
          position: 'fixed',
          right: '20px',
          top: '100px',
          width: '350px',
          maxHeight: '80vh',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          overflow: 'auto',
          zIndex: 1000
        }}>
          <div style={{
            position: 'sticky',
            top: 0,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>✨ AI Recommendations</h3>
            <button onClick={clearRecommendations} style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>×</button>
          </div>
          
          <div style={{ padding: '16px' }}>
            {aiRecommendations.map((rec, index) => (
              <div key={index} style={{
                background: '#f8f9fa',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                border: `2px solid ${
                  rec.priority === 'high' ? '#ff6b6b' : rec.priority === 'medium' ? '#ffa500' : '#4dabf7'
                }`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '28px', marginRight: '12px' }}>{getStationEmoji(rec.type)}</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>{rec.name}</h4>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: '600'
                    }}>{rec.type}</span>
                  </div>
                </div>
                
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', margin: '10px 0' }}>
                  {rec.reason}
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: '12px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: rec.priority === 'high' ? '#d32f2f' : rec.priority === 'medium' ? '#f57c00' : '#1976d2'
                  }}>
                    Priority: {rec.priority.toUpperCase()}
                  </span>
                  <button onClick={() => applyRecommendation(rec)} style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    Add This Station
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Section - ALWAYS RENDERED, visibility controlled by CSS */}
      <div style={{ display: viewMode === 'table' ? 'block' : 'none' }}>
        <div className="stations-table-container">
          <table className="stations-table">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Name</th>
                <th>Type</th>
                <th>Coordinates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">No stations found</td>
                </tr>
              ) : (
                stations.map(station => (
                  <tr key={station.id}>
                    <td style={{ fontSize: '28px', textAlign: 'center' }}>{getStationEmoji(station.type)}</td>
                    <td style={{ fontWeight: '600', color: '#2c3e50' }}>{station.nom || 'N/A'}</td>
                    <td>
                      <span style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {station.type || 'Station'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#7f8c8d' }}>
                      {station.latitude && station.longitude 
                        ? `${parseFloat(station.latitude).toFixed(4)}, ${parseFloat(station.longitude).toFixed(4)}`
                        : 'N/A'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="edit-btn" onClick={() => handleEdit(station)}>
                          ✏️ Edit
                        </button>
                        <button className="delete-btn" onClick={() => handleDelete(station.id)}>
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StationManagement;
