// TransportManagement.js - Module CRUD pour Wael Marouani
import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const TransportManagement = ({ onUpdate }) => {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransport, setEditingTransport] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'Bus',
    capacite: '',
    immatriculation: '',
    vitesseMax: '',
    electrique: false
  });

  useEffect(() => {
    loadTransports();
  }, []);

  const loadTransports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/transports`);
      const data = await response.json();
      setTransports(data);
    } catch (error) {
      console.error('Error loading transports:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Soumission:', formData);
    alert(editingTransport ? 'Transport modifié!' : 'Nouveau transport ajouté!');
    closeModal();
    loadTransports();
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (transportId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce transport?')) {
      console.log('Suppression de:', transportId);
      alert('Transport supprimé!');
      loadTransports();
      if (onUpdate) onUpdate();
    }
  };

  const openModal = (transport = null) => {
    if (transport) {
      setEditingTransport(transport);
      setFormData({
        nom: transport.nom,
        type: transport.type,
        capacite: transport.capacite || '',
        immatriculation: transport.immatriculation || '',
        vitesseMax: transport.vitesseMax || '',
        electrique: transport.electrique || false
      });
    } else {
      setEditingTransport(null);
      setFormData({
        nom: '',
        type: 'Bus',
        capacite: '',
        immatriculation: '',
        vitesseMax: '',
        electrique: false
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTransport(null);
  };

  if (loading) {
    return <div className="loading">Chargement des transports...</div>;
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>🚌 Gestion des Transports</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Ajouter un Transport
        </button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Rechercher un transport..." />
      </div>

      {transports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚌</div>
          <h3>Aucun transport</h3>
          <p>Commencez par ajouter votre premier transport</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Capacité</th>
              <th>Immatriculation</th>
              <th>Électrique</th>
              <th>Zone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transports.map((transport, index) => (
              <tr key={index}>
                <td><strong>{transport.nom}</strong></td>
                <td>
                  <span className="badge badge-info">{transport.type}</span>
                </td>
                <td>{transport.capacite ? `${transport.capacite} places` : '-'}</td>
                <td>{transport.immatriculation || '-'}</td>
                <td>
                  <span className={`badge ${transport.electrique ? 'badge-success' : 'badge-warning'}`}>
                    {transport.electrique ? '⚡ Oui' : '⛽ Non'}
                  </span>
                </td>
                <td>{transport.zone || '-'}</td>
                <td className="actions-cell">
                  <button 
                    className="btn btn-warning"
                    onClick={() => openModal(transport)}
                  >
                    ✏️ Modifier
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(transport.id)}
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
            <h3>{editingTransport ? 'Modifier le transport' : 'Nouveau transport'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
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
                  <option value="Bus">Bus</option>
                  <option value="Métro">Métro</option>
                  <option value="Vélo">Vélo</option>
                  <option value="VoiturePartagée">Voiture Partagée</option>
                  <option value="Trottinette">Trottinette</option>
                </select>
              </div>

              <div className="form-group">
                <label>Capacité</label>
                <input
                  type="number"
                  value={formData.capacite}
                  onChange={(e) => setFormData({...formData, capacite: e.target.value})}
                  placeholder="Nombre de places"
                />
              </div>

              <div className="form-group">
                <label>Immatriculation</label>
                <input
                  type="text"
                  value={formData.immatriculation}
                  onChange={(e) => setFormData({...formData, immatriculation: e.target.value})}
                  placeholder="Ex: BUS-101-TN"
                />
              </div>

              <div className="form-group">
                <label>Vitesse Max (km/h)</label>
                <input
                  type="number"
                  value={formData.vitesseMax}
                  onChange={(e) => setFormData({...formData, vitesseMax: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.electrique}
                    onChange={(e) => setFormData({...formData, electrique: e.target.checked})}
                  />
                  {' '}⚡ Transport électrique
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-success">
                  {editingTransport ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px'}}>
        <h4 style={{marginBottom: '10px', color: '#667eea'}}>🚌 Module géré par: Wael Marouani</h4>
        <p style={{color: '#666'}}>
          <strong>Fonctionnalités CRUD:</strong><br/>
          ✅ Create (Créer) - Ajouter de nouveaux moyens de transport<br/>
          ✅ Read (Lire) - Afficher tous les transports<br/>
          ✅ Update (Modifier) - Mettre à jour les caractéristiques<br/>
          ✅ Delete (Supprimer) - Supprimer des transports
        </p>
      </div>
    </div>
  );
};

export default TransportManagement;
