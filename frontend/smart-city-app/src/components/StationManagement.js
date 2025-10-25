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
    id: '',
    nom: '',
    type: 'Station',
    latitude: '',
    longitude: ''
  });
  const [editingStation, setEditingStation] = useState(null);

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
          if (!showForm) {
            const { lng, lat } = e.lngLat;
            setFormData({
              id: '',
              nom: '',
              type: 'Station',
              latitude: lat.toFixed(6),
              longitude: lng.toFixed(6)
            });
            setShowForm(true);
            setEditingStation(null);
            console.log('✅ [STATION MAP] Form opened with coords:', lat, lng);
          } else {
            console.log('⏭️ [STATION MAP] Click ignored - form already open');
          }
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
        const el = document.createElement('div');
        el.className = 'dashboard-marker station-marker';
        el.innerHTML = '📍';
        el.style.fontSize = '24px';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([parseFloat(station.longitude), parseFloat(station.latitude)])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 8px;">
                  <h4 style="margin: 0 0 6px 0;">📍 ${station.nom}</h4>
                  <p style="margin: 0; font-size: 12px; color: #666;">${station.type}</p>
                </div>
              `)
          )
          .addTo(map.current);

        markers.current.push(marker);
        console.log(`✅ [STATION MARKERS] Marker ${index + 1} added at [${station.longitude}, ${station.latitude}]`);
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
      
      await loadStations();
      setShowForm(false);
      setEditingStation(null);
      setFormData({ id: '', nom: '', type: 'Station', latitude: '', longitude: '' });
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
      id: station.id,
      nom: station.nom || '',
      type: station.type || 'Station',
      latitude: station.latitude || '',
      longitude: station.longitude || ''
    });
    setShowForm(true);
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
            className="add-station-btn"
            onClick={() => {
              setShowForm(true);
              setEditingStation(null);
              setFormData({ id: '', nom: '', type: 'Station', latitude: '', longitude: '' });
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
        <div className="form-overlay" onClick={() => setShowForm(false)}>
          <div className="station-form-container" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingStation ? 'Edit Station' : 'Add New Station'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                
              </div>
              <div className="form-group">
                <label>Station Name*</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type*</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Station">Station</option>
                  <option value="BusStation">Bus Station</option>
                  <option value="MetroStation">Metro Station</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitude*</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Longitude*</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingStation ? 'Update' : 'Create'}
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

      {/* Table Section - ALWAYS RENDERED, visibility controlled by CSS */}
      <div style={{ display: viewMode === 'table' ? 'block' : 'none' }}>
        <div className="stations-table-container">
          <table className="stations-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No stations found</td>
                </tr>
              ) : (
                stations.map(station => (
                  <tr key={station.id}>
                    <td>{station.id}</td>
                    <td>{station.nom || 'N/A'}</td>
                    <td>{station.type || 'Station'}</td>
                    <td>{station.latitude || 'N/A'}</td>
                    <td>{station.longitude || 'N/A'}</td>
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
