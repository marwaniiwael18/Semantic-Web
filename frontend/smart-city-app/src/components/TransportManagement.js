// TransportManagement.js - Module CRUD pour Wael Marouani
import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001/api';

const TransportManagement = ({ onUpdate }) => {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransport, setEditingTransport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  // eslint-disable-next-line no-unused-vars
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'Bus',
    capacite: '',
    immatriculation: '',
    vitesseMax: '',
    electrique: 'false'
  });

  useEffect(() => {
    loadTransports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const loadTransports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/transports`);
      const data = await response.json();
      setTransports(data);
    } catch (error) {
      console.error('Error loading transports:', error);
      showNotification('Erreur lors du chargement des transports', 'error');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // First, upload image if there's one
      let imageUrl = null;
      if (imagePreview) {
        const uploadResponse = await fetch(`${API_URL}/upload/transport-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transport_id: editingTransport ? editingTransport.id : `Transport_${Date.now()}`,
            image_data: imagePreview
          })
        });

        const uploadData = await uploadResponse.json();
        if (uploadData.success) {
          imageUrl = uploadData.url;
        }
      }

      // Prepare transport data
      const transportData = {
        ...formData,
        imageUrl: imageUrl || formData.imageUrl
      };

      const url = editingTransport 
        ? `${API_URL}/transports/${editingTransport.id}`
        : `${API_URL}/transports`;
      
      const method = editingTransport ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transportData)
      });

      const data = await response.json();

      if (data.success || response.ok) {
        showNotification(
          editingTransport ? '✅ Transport updated successfully!' : '✅ Transport created successfully!',
          'success'
        );
        closeModal();
        loadTransports();
        if (onUpdate) onUpdate();
      } else {
        showNotification(data.error || 'Error saving transport', 'error');
      }
    } catch (error) {
      console.error('Error saving transport:', error);
      showNotification('❌ Error saving transport', 'error');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should not exceed 5MB', 'error');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleDelete = async (transportId) => {
    if (window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer ce transport?')) {
      try {
        const response = await fetch(`${API_URL}/transports/${transportId}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success || response.ok) {
          showNotification('🗑️ Transport supprimé avec succès!', 'success');
          loadTransports();
          if (onUpdate) onUpdate();
        } else {
          showNotification(data.error || 'Erreur lors de la suppression', 'error');
        }
      } catch (error) {
        console.error('Error deleting transport:', error);
        showNotification('❌ Erreur lors de la suppression du transport', 'error');
      }
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
        electrique: transport.electrique ? 'true' : 'false',
        imageUrl: transport.imageUrl || ''
      });
      if (transport.imageUrl) {
        setImagePreview(transport.imageUrl);
      }
    } else {
      setEditingTransport(null);
      setFormData({
        nom: '',
        type: 'Bus',
        capacite: '',
        immatriculation: '',
        vitesseMax: '',
        electrique: 'false',
        imageUrl: ''
      });
      setImageFile(null);
      setImagePreview(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTransport(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const getTransportIcon = (type) => {
    const icons = {
      'Bus': '🚌',
      'Métro': '🚇',
      'Vélo': '🚲',
      'VoiturePartagée': '🚗',
      'Trottinette': '🛴'
    };
    return icons[type] || '🚌';
  };

  const filteredTransports = transports.filter(t => {
    const matchesSearch = t.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement des transports...</p>
      </div>
    );
  }

  return (
    <div className="crud-container transport-management">
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="crud-header-modern">
        <div>
          <h2>🚌 Transport Management</h2>
          <p className="subtitle">Manage public transportation fleet</p>
        </div>
        <button className="btn btn-primary btn-modern" onClick={() => openModal()}>
          <span>➕</span> Add Transport
        </button>
      </div>

      <div className="filters-section">
        <div className="search-bar-modern">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Rechercher par nom ou immatriculation..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Tous ({transports.length})
          </button>
          <button 
            className={`filter-btn ${filterType === 'Bus' ? 'active' : ''}`}
            onClick={() => setFilterType('Bus')}
          >
            🚌 Bus
          </button>
          <button 
            className={`filter-btn ${filterType === 'Métro' ? 'active' : ''}`}
            onClick={() => setFilterType('Métro')}
          >
            🚇 Métro
          </button>
          <button 
            className={`filter-btn ${filterType === 'Vélo' ? 'active' : ''}`}
            onClick={() => setFilterType('Vélo')}
          >
            🚲 Vélo
          </button>
          <button 
            className={`filter-btn ${filterType === 'VoiturePartagée' ? 'active' : ''}`}
            onClick={() => setFilterType('VoiturePartagée')}
          >
            🚗 Voiture
          </button>
        </div>
      </div>

      {filteredTransports.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-state-icon">🚌</div>
          <h3>{searchTerm || filterType !== 'all' ? 'Aucun résultat' : 'Aucun transport'}</h3>
          <p>{searchTerm || filterType !== 'all' ? 'Essayez d\'ajuster vos filtres' : 'Commencez par ajouter votre premier transport'}</p>
          {(!searchTerm && filterType === 'all') && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              ➕ Créer un transport
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {filteredTransports.map((transport, index) => (
            <div key={index} className="transport-card">
              {transport.imageUrl ? (
                <div className="transport-card-image">
                  <img src={transport.imageUrl} alt={transport.nom} />
                </div>
              ) : (
                <div className="transport-card-no-image">
                  {getTransportIcon(transport.type)}
                </div>
              )}
              <div className="transport-card-header">
                <div className="transport-icon">{getTransportIcon(transport.type)}</div>
                <div className="transport-info">
                  <h3>{transport.nom}</h3>
                  <span className="badge badge-primary">{transport.type}</span>
                </div>
              </div>
              
              <div className="transport-card-body">
                <div className="info-row">
                  <span className="info-label">📋 Registration</span>
                  <span className="info-value">{transport.immatriculation || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">👥 Capacity</span>
                  <span className="info-value">{transport.capacite ? `${transport.capacite} seats` : 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">⚡ Energy</span>
                  <span className={`badge ${transport.electrique ? 'badge-success' : 'badge-warning'}`}>
                    {transport.electrique ? '⚡ Electric' : '⛽ Fuel'}
                  </span>
                </div>
                {transport.vitesseMax && (
                  <div className="info-row">
                    <span className="info-label">🚀 Max Speed</span>
                    <span className="info-value">{transport.vitesseMax} km/h</span>
                  </div>
                )}
              </div>

              <div className="transport-card-footer">
                <button 
                  className="btn btn-warning btn-sm"
                  onClick={() => openModal(transport)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(transport.id)}
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
          <div className="modal modal-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-modern">
              <h3>{editingTransport ? '✏️ Modifier le transport' : '➕ Nouveau transport'}</h3>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nom du transport *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    placeholder="Ex: Bus Rapide 101"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Type de transport *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="Bus">🚌 Bus</option>
                    <option value="Métro">🚇 Métro</option>
                    <option value="Vélo">🚲 Vélo</option>
                    <option value="VoiturePartagée">🚗 Voiture Partagée</option>
                    <option value="Trottinette">🛴 Trottinette</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Capacité (places)</label>
                  <input
                    type="number"
                    value={formData.capacite}
                    onChange={(e) => setFormData({...formData, capacite: e.target.value})}
                    placeholder="Ex: 50"
                    min="1"
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vitesse maximale (km/h)</label>
                  <input
                    type="number"
                    value={formData.vitesseMax}
                    onChange={(e) => setFormData({...formData, vitesseMax: e.target.value})}
                    placeholder="Ex: 90"
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Type d'énergie</label>
                  <select
                    value={formData.electrique}
                    onChange={(e) => setFormData({...formData, electrique: e.target.value})}
                  >
                    <option value="false">⛽ Thermique (Essence/Diesel)</option>
                    <option value="true">⚡ Électrique</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>📸 Transport Image</label>
                <div className="image-upload-section">
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Transport preview" className="transport-image-preview" />
                      <button type="button" onClick={removeImage} className="btn btn-danger btn-sm">
                        🗑️ Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="image-upload-placeholder">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        id="transport-image"
                        style={{display: 'none'}}
                      />
                      <label htmlFor="transport-image" className="upload-label">
                        <div className="upload-icon">📷</div>
                        <div>Click to upload transport image</div>
                        <small>(Max 5MB - JPG, PNG, GIF)</small>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  {editingTransport ? 'Update Transport' : 'Create Transport'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="module-info-card">
        <div className="module-avatar">🚌</div>
        <div className="module-details">
          <h4>Transport Management</h4>
          <p>Manage all public transportation vehicles</p>
        </div>
        <div className="module-stats">
          <div className="stat-item">
            <span className="stat-value">{transports.length}</span>
            <span className="stat-label">Transports</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportManagement;
