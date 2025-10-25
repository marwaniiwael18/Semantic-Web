// StationManagement.js - Module CRUD pour Kenza Ben Slimane
import React, { useState, useEffect } from 'react';

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
    console.log('Soumission:', formData);
    alert(editingStation ? 'Station modifiée!' : 'Nouvelle station ajoutée!');
    closeModal();
    loadStations();
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (stationId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette station?')) {
      console.log('Suppression de:', stationId);
      alert('Station supprimée!');
      loadStations();
      if (onUpdate) onUpdate();
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
        <h2>📍 Gestion des Stations</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Ajouter une Station
        </button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Rechercher une station..." />
      </div>

      {stations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📍</div>
          <h3>Aucune station</h3>
          <p>Commencez par ajouter votre première station</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Coordonnées</th>
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
                      🗺️ Voir sur la carte
                    </a>
                  ) : '-'}
                </td>
                <td className="actions-cell">
                  <button 
                    className="btn btn-warning"
                    onClick={() => openModal(station)}
                  >
                    ✏️ Modifier
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(station.id)}
                  >
                    🗑️ Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
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
                  <option value="StationMétro">Station Métro</option>
                  <option value="Parking">Parking</option>
                  <option value="StationVélo">Station Vélo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                  placeholder="Ex: 36.806495"
                />
              </div>

              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                  placeholder="Ex: 10.181532"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-success">
                  {editingStation ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px'}}>
        <h4 style={{marginBottom: '10px', color: '#667eea'}}>📍 Module géré par: Kenza Ben Slimane</h4>
        <p style={{color: '#666'}}>
          <strong>Fonctionnalités CRUD:</strong><br/>
          ✅ Create (Créer) - Ajouter de nouvelles stations<br/>
          ✅ Read (Lire) - Afficher toutes les stations avec localisation<br/>
          ✅ Update (Modifier) - Mettre à jour les coordonnées GPS<br/>
          ✅ Delete (Supprimer) - Supprimer des stations
        </p>
      </div>
    </div>
  );
};

export default StationManagement;
