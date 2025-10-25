// StationManagement.js - Station Management with Interactive Map
import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const API_URL = 'http://localhost:5001/api';
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

mapboxgl.accessToken = MAPBOX_TOKEN;

const StationManagement = ({ onUpdate }) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('map');
  const [addMode, setAddMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'StationBus',
    latitude: '',
    longitude: ''
  });
  const [editingStation, setEditingStation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const tempMarker = useRef(null);
  const addModeRef = useRef(false);

  const getStationIcon = useCallback((type) => {
    switch(type) {
      case 'StationBus': return '🚌';
      case 'StationMétro': return '🚇';
      case 'Parking': return '🅿️';
      default: return '📍';
    }
  }, []);

  const loadStations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/stations`);
      const data = await response.json();
      setStations(data);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  // Initialize map once on mount
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token is not set');
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainer.current) return;

      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [10.1815, 36.8065],
          zoom: 11
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const geocoder = new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          mapboxgl: mapboxgl,
          marker: false,
          placeholder: 'Search for a location...'
        });
        
        map.current.addControl(geocoder, 'top-left');

        map.current.on('click', (e) => {
          if (addModeRef.current) {
            const { lng, lat } = e.lngLat;
            
            if (tempMarker.current) {
              tempMarker.current.remove();
            }

            const el = document.createElement('div');
            el.className = 'temp-station-marker';
            el.innerHTML = '📍';
            el.style.fontSize = '40px';

            tempMarker.current = new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .addTo(map.current);

            setSelectedLocation({ lng, lat });
            setFormData(prev => ({
              ...prev,
              latitude: lat.toFixed(6),
              longitude: lng.toFixed(6)
            }));
            setShowModal(true);
            setAddMode(false);
            addModeRef.current = false;
          }
        });

        map.current.on('load', () => {
          setMapReady(true);
          map.current.resize();
        });

      } catch (error) {
        console.error('Error initializing map:', error);
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

  // Update markers
  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    stations.forEach(station => {
      if (station.latitude && station.longitude) {
        const el = document.createElement('div');
        el.className = 'station-marker';
        el.innerHTML = getStationIcon(station.type);
        el.style.fontSize = '32px';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([station.longitude, station.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 10px;">
                  <h3 style="margin: 0 0 8px 0;">${getStationIcon(station.type)} ${station.nom}</h3>
                  <p style="margin: 4px 0;"><strong>Type:</strong> ${station.type}</p>
                  <p style="margin: 4px 0;"><strong>Coordinates:</strong><br/>${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}</p>
                  <div style="margin-top: 10px; display: flex; gap: 8px;">
                    <button 
                      onclick="window.editStation('${station.id}')"
                      style="padding: 6px 12px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer;"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onclick="window.deleteStation('${station.id}')"
                      style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              `)
          )
          .addTo(map.current);

        markers.current.push(marker);
      }
    });
  }, [stations, getStationIcon, mapReady]);

  // Resize map when view changes
  useEffect(() => {
    if (viewMode === 'map' && map.current && mapReady) {
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
        }
      }, 100);
    }
  }, [viewMode, mapReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = editingStation 
        ? `${API_URL}/stations/${editingStation.id}`
        : `${API_URL}/stations`;
      
      const method = editingStation ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: formData.nom,
          type: formData.type,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude)
        })
      });

      const data = await response.json();

      if (data.success || response.ok) {
        closeModal();
        loadStations();
        if (onUpdate) onUpdate();
      } else {
        alert('Error: ' + (data.error || 'Failed to save station'));
      }
    } catch (error) {
      console.error('Error saving station:', error);
      alert('Error saving station');
    }
    setLoading(false);
  };

  const handleDelete = useCallback(async (stationId) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
      try {
        const response = await fetch(`${API_URL}/stations/${stationId}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success || response.ok) {
          loadStations();
          if (onUpdate) onUpdate();
        } else {
          alert('Error: ' + (data.error || 'Failed to delete station'));
        }
      } catch (error) {
        console.error('Error deleting station:', error);
        alert('Error deleting station');
      }
    }
  }, [loadStations, onUpdate]);

  const closeModal = () => {
    setShowModal(false);
    setEditingStation(null);
    setSelectedLocation(null);
    setAddMode(false);
    addModeRef.current = false;
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
    if (tempMarker.current) {
      tempMarker.current.remove();
      tempMarker.current = null;
    }
  };

  const startAddMode = () => {
    setAddMode(true);
    addModeRef.current = true;
    if (map.current) {
      map.current.getCanvas().style.cursor = 'crosshair';
    }
    alert('📍 Click anywhere on the map to add a new station');
  };

  const cancelAddMode = () => {
    setAddMode(false);
    addModeRef.current = false;
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
    if (tempMarker.current) {
      tempMarker.current.remove();
      tempMarker.current = null;
    }
  };

  useEffect(() => {
    window.editStation = (stationId) => {
      const station = stations.find(s => s.id === stationId);
      if (station) {
        setEditingStation(station);
        setFormData({
          nom: station.nom,
          type: station.type,
          latitude: station.latitude || '',
          longitude: station.longitude || ''
        });
        setShowModal(true);
      }
    };

    window.deleteStation = (stationId) => {
      handleDelete(stationId);
    };

    return () => {
      delete window.editStation;
      delete window.deleteStation;
    };
  }, [stations, handleDelete]);

  if (loading && stations.length === 0) {
    return <div className="loading">Loading stations...</div>;
  }

  return (
    <div className="crud-container" style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div className="crud-header">
        <div className="module-info-card">
          <div className="module-icon">📍</div>
          <div className="module-details">
            <h2>Station Management</h2>
            <p>Interactive map: Click to add stations | Search with autocomplete</p>
          </div>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          {addMode ? (
            <>
              <button className="btn btn-secondary" onClick={cancelAddMode}>
                ❌ Cancel
              </button>
              <div style={{padding: '10px 20px', background: '#667eea', color: 'white', borderRadius: '8px', fontWeight: '600'}}>
                📍 Click on map to add station
              </div>
            </>
          ) : (
            <>
              <button className="btn btn-success" onClick={startAddMode}>
                ➕ Add Station on Map
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setViewMode(viewMode === 'map' ? 'table' : 'map')}
              >
                {viewMode === 'map' ? '📋 Table View' : '🗺️ Map View'}
              </button>
            </>
          )}
        </div>
      </div>

      <div 
        style={{
          marginTop: '20px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          height: '600px',
          width: '100%',
          visibility: viewMode === 'map' ? 'visible' : 'hidden',
          position: viewMode === 'map' ? 'relative' : 'absolute',
          zIndex: viewMode === 'map' ? 1 : -1
        }}
      >
        <div 
          ref={mapContainer} 
          style={{width: '100%', height: '100%'}}
        />
        
        {viewMode === 'map' && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'white',
            padding: '15px 25px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: '700',
            fontSize: '16px',
            color: '#667eea'
          }}>
            📍 {stations.length} Station{stations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {viewMode === 'table' && (
        <div style={{marginTop: '20px'}}>
          {stations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📍</div>
              <h3>No Stations</h3>
              <p>Click "Add Station on Map" to start</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station, index) => (
                  <tr key={index}>
                    <td><strong>{getStationIcon(station.type)} {station.nom}</strong></td>
                    <td>
                      <span className="badge badge-primary">{station.type}</span>
                    </td>
                    <td>{station.latitude ? station.latitude.toFixed(4) : '-'}</td>
                    <td>{station.longitude ? station.longitude.toFixed(4) : '-'}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn btn-warning"
                        onClick={() => window.editStation(station.id)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => window.deleteStation(station.id)}
                      >
                        ��️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingStation ? 'Edit Station' : 'New Station'}</h3>
            {selectedLocation && !editingStation && (
              <div style={{
                background: '#e0f2fe',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#0369a1'
              }}>
                �� Location selected: {formData.latitude}, {formData.longitude}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Station Name *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Bab El Bhar Station"
                  required
                />
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="StationBus">🚌 Bus Station</option>
                  <option value="StationMétro">🚇 Metro Station</option>
                  <option value="Parking">🅿️ Parking</option>
                  <option value="StationVelo">🚲 Bike Station</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    placeholder="Ex: 36.806495"
                    required
                    readOnly={!!selectedLocation && !editingStation}
                  />
                </div>

                <div className="form-group">
                  <label>Longitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    placeholder="Ex: 10.181532"
                    required
                    readOnly={!!selectedLocation && !editingStation}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  {editingStation ? '✏️ Update Station' : '✅ Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationManagement;
