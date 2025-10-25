// StationManagement.js - Station Management with Map Integration
import React, { useState, useEffect } from 'react';
import MapPicker from './MapPicker';

const API_URL = 'http://localhost:5001/api';

const StationManagement = ({ onUpdate }) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'StationBus',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/stations`);
      const data = await response.json();
      setStations(data);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
    setLoading(false);
  };

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

  const handleDelete = async (stationId) => {
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
  };

  const openModal = (station = null) => {
    if (station) {
      setEditingStation(station);
      setFormData({
        nom: station.nom,
        type: station.type,
        latitude: station.latitude || '',
        longitude: station.longitude || ''
      });
    } else {
      setEditingStation(null);
      setFormData({
        nom: '',
        type: 'StationBus',
        latitude: '',
        longitude: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStation(null);
  };

  if (loading) {
    return <div className="loading">Chargement des stations...</div>;
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <div className="module-info-card">
          <div className="module-icon">📍</div>
          <div className="module-details">
            <h2>Station Management</h2>
            <p>Manage transit hubs, parking facilities, and bike stations</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Add Station
        </button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Search stations..." />
      </div>

      {stations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📍</div>
          <h3>No Stations</h3>
          <p>Start by adding your first station location</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Map</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station, index) => (
              <tr key={index}>
                <td><strong>{station.nom}</strong></td>
                <td>
                  <span className="badge badge-primary">{station.type}</span>
                </td>
                <td>{station.latitude ? station.latitude.toFixed(4) : '-'}</td>
                <td>{station.longitude ? station.longitude.toFixed(4) : '-'}</td>
                <td>
                  {station.latitude && station.longitude ? (
                    <a 
                      href={`https://www.google.com/maps?q=${station.latitude},${station.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{color: '#667eea'}}
                    >
                      🗺️ View on Map
                    </a>
                  ) : '-'}
                </td>
                <td className="actions-cell">
                  <button 
                    className="btn btn-warning"
                    onClick={() => openModal(station)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(station.id)}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>{editingStation ? 'Modifier la station' : 'Nouvelle station'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom de la station *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Station Bab El Bhar"
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
                  <option value="StationBus">Station Bus</option>
                  <option value="StationMetro">Station Métro</option>
                  <option value="Parking">Parking</option>
                  <option value="StationVelo">Station Vélo</option>
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
                  />
                </div>
              </div>

              <div className="form-group">
                <label>📍 Select Location on Map</label>
                <MapPicker 
                  onLocationSelect={(coords) => {
                    setFormData({
                      ...formData,
                      latitude: coords.lat,
                      longitude: coords.lng
                    });
                  }}
                  initialLat={formData.latitude ? parseFloat(formData.latitude) : 36.8065}
                  initialLng={formData.longitude ? parseFloat(formData.longitude) : 10.1815}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  {editingStation ? 'Update Station' : 'Create Station'}
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
