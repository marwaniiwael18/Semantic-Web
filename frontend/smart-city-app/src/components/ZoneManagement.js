// ZoneManagement.js - Module CRUD pour Nassim Khaldi
import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001/api';

const ZoneManagement = ({ onUpdate }) => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'CentreVille',
    superficie: '',
    population: '',
    description: ''
  });

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/zones`);
      const data = await response.json();
      setZones(data);
    } catch (error) {
      console.error('Error loading zones:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const endpoint = editingZone 
        ? `${API_URL}/zones/${editingZone.id}` 
        : `${API_URL}/zones`;
      
      const method = editingZone ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success || response.ok) {
        alert(editingZone ? 'Zone updated!' : 'Zone created!');
        closeModal();
        loadZones();
        if (onUpdate) onUpdate();
      } else {
        alert('Error: ' + (data.error || 'Failed to save zone'));
      }
    } catch (error) {
      console.error('Error saving zone:', error);
      alert('Error saving zone');
    }
  };

  const handleDelete = async (zoneId) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      try {
        const response = await fetch(`${API_URL}/zones/${zoneId}`, {
          method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success || response.ok) {
          alert('Zone deleted!');
          loadZones();
          if (onUpdate) onUpdate();
        } else {
          alert('Error: ' + (data.error || 'Failed to delete zone'));
        }
      } catch (error) {
        console.error('Error deleting zone:', error);
        alert('Error deleting zone');
      }
    }
  };

  const openModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        nom: zone.nom,
        type: zone.type,
        superficie: zone.superficie || '',
        population: zone.population || '',
        description: zone.description || ''
      });
    } else {
      setEditingZone(null);
      setFormData({
        nom: '',
        type: 'CentreVille',
        superficie: '',
        population: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingZone(null);
  };

  const getZoneIcon = (type) => {
    switch(type) {
      case 'CentreVille': return '🏛️';
      case 'Banlieue': return '🏘️';
      case 'ZoneIndustrielle': return '🏭';
      default: return '🏙️';
    }
  };

  if (loading) {
    return <div className="loading">Loading zones...</div>;
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>🏘️ Urban Zones Management</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Add Zone
        </button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Search zones..." />
      </div>

      {zones.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏘️</div>
          <h3>No zones</h3>
          <p>Start by adding your first urban zone</p>
        </div>
      ) : (
        <div className="cards-grid">
          {zones.map((zone, index) => (
            <div key={index} className="zone-card">
              <div className="zone-card-header">
                <div className="zone-info">
                  <h3>{getZoneIcon(zone.type)} {zone.nom}</h3>
                  <span className="zone-type-badge">{zone.type}</span>
                </div>
              </div>
              
              <div className="zone-stats">
                <div className="zone-stat">
                  <span className="zone-stat-value">{zone.superficie || 0}</span>
                  <span className="zone-stat-label">km² Area</span>
                </div>
                <div className="zone-stat">
                  <span className="zone-stat-value">{zone.population ? (zone.population / 1000).toFixed(1) + 'K' : '0'}</span>
                  <span className="zone-stat-label">Population</span>
                </div>
              </div>

              <div className="transport-card-body">
                {zone.description && (
                  <div className="info-row">
                    <span className="info-label">📝 Description</span>
                    <span className="info-value" style={{fontSize: '13px'}}>{zone.description}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">🚍 Transports</span>
                  <span className="badge badge-primary">{zone.totalTransports || 0}</span>
                </div>
              </div>

              <div className="transport-card-footer">
                <button 
                  className="btn btn-warning btn-sm"
                  onClick={() => openModal(zone)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(zone.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingZone ? 'Edit Zone' : 'New Urban Zone'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Zone Name *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Downtown Tunis"
                  required
                />
              </div>

              <div className="form-group">
                <label>Zone Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="CentreVille">🏛️ City Center</option>
                  <option value="Banlieue">🏘️ Suburb</option>
                  <option value="ZoneIndustrielle">🏭 Industrial Zone</option>
                  <option value="ZoneResidentielle">🏠 Residential Zone</option>
                  <option value="ZoneCommerciale">🏬 Commercial Zone</option>
                </select>
              </div>

              <div className="form-group">
                <label>Area (km²)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.superficie}
                  onChange={(e) => setFormData({...formData, superficie: e.target.value})}
                  placeholder="Ex: 25.5"
                />
              </div>

              <div className="form-group">
                <label>Population</label>
                <input
                  type="number"
                  value={formData.population}
                  onChange={(e) => setFormData({...formData, population: e.target.value})}
                  placeholder="Ex: 50000"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the zone characteristics..."
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  {editingZone ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px'}}>
        <h4 style={{marginBottom: '10px', color: '#667eea'}}>🏘️ Zones Module</h4>
        <p style={{color: '#666'}}>
          <strong>CRUD Features:</strong><br/>
          ✅ Create - Add new urban zones<br/>
          ✅ Read - View all zones<br/>
          ✅ Update - Edit zone information<br/>
          ✅ Delete - Remove zones
        </p>
      </div>
    </div>
  );
};

export default ZoneManagement;
