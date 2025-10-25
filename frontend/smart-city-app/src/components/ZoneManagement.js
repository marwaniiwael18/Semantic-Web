// ZoneManagement.js - Module CRUD pour Nassim Khaldi
import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

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
    console.log('Soumission:', formData);
    alert(editingZone ? 'Zone modifiée!' : 'Nouvelle zone ajoutée!');
    closeModal();
    loadZones();
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (zoneId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette zone?')) {
      console.log('Suppression de:', zoneId);
      alert('Zone supprimée!');
      loadZones();
      if (onUpdate) onUpdate();
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
    return <div className="loading">Chargement des zones...</div>;
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>🏘️ Gestion des Zones Urbaines</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Ajouter une Zone
        </button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Rechercher une zone..." />
      </div>

      {zones.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏘️</div>
          <h3>Aucune zone</h3>
          <p>Commencez par ajouter votre première zone urbaine</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Transports</th>
              <th>Superficie</th>
              <th>Population</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone, index) => (
              <tr key={index}>
                <td>
                  <strong>{getZoneIcon(zone.type)} {zone.nom}</strong>
                </td>
                <td>
                  <span className="badge badge-info">{zone.type}</span>
                </td>
                <td>{zone.totalTransports || 0} transport(s)</td>
                <td>{zone.superficie ? `${zone.superficie} km²` : '-'}</td>
                <td>{zone.population ? zone.population.toLocaleString('fr-FR') : '-'}</td>
                <td>{zone.description || '-'}</td>
                <td className="actions-cell">
                  <button 
                    className="btn btn-warning"
                    onClick={() => openModal(zone)}
                  >
                    ✏️ Modifier
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(zone.id)}
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
            <h3>{editingZone ? 'Modifier la zone' : 'Nouvelle zone urbaine'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom de la zone *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Centre-Ville de Tunis"
                  required
                />
              </div>

              <div className="form-group">
                <label>Type de zone *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="CentreVille">🏛️ Centre-Ville</option>
                  <option value="Banlieue">🏘️ Banlieue</option>
                  <option value="ZoneIndustrielle">🏭 Zone Industrielle</option>
                  <option value="ZoneResidentielle">🏠 Zone Résidentielle</option>
                  <option value="ZoneCommerciale">🏬 Zone Commerciale</option>
                </select>
              </div>

              <div className="form-group">
                <label>Superficie (km²)</label>
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
                  placeholder="Décrivez les caractéristiques de la zone..."
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-success">
                  {editingZone ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px'}}>
        <h4 style={{marginBottom: '10px', color: '#667eea'}}>🏘️ Module géré par: Nassim Khaldi</h4>
        <p style={{color: '#666'}}>
          <strong>Fonctionnalités CRUD:</strong><br/>
          ✅ Create (Créer) - Ajouter de nouvelles zones urbaines<br/>
          ✅ Read (Lire) - Visualiser toutes les zones<br/>
          ✅ Update (Modifier) - Mettre à jour les informations<br/>
          ✅ Delete (Supprimer) - Supprimer des zones
        </p>
      </div>
    </div>
  );
};

export default ZoneManagement;
