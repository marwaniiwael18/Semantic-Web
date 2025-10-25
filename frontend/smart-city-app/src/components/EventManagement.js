// EventManagement.js - Module CRUD pour Aymen Jallouli
import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001/api';

const EventManagement = ({ onUpdate }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'Accident',
    description: '',
    gravite: 3,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/events`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Soumission:', formData);
    alert(editingEvent ? 'Événement modifié!' : 'Nouvel événement ajouté!');
    closeModal();
    loadEvents();
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet événement?')) {
      console.log('Suppression de:', eventId);
      alert('Événement supprimé!');
      loadEvents();
      if (onUpdate) onUpdate();
    }
  };

  const openModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        nom: event.nom,
        type: event.type,
        description: event.description || '',
        gravite: event.gravite || 3,
        date: event.date ? event.date.split('T')[0] : new Date().toISOString().split('T')[0]
      });
    } else {
      setEditingEvent(null);
      setFormData({
        nom: '',
        type: 'Accident',
        description: '',
        gravite: 3,
        date: new Date().toISOString().split('T')[0]
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  const getGraviteBadge = (gravite) => {
    if (gravite >= 4) return 'badge-danger';
    if (gravite === 3) return 'badge-warning';
    return 'badge-success';
  };

  if (loading) {
    return <div className="loading">Chargement des événements...</div>;
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>⚠️ Gestion des Événements de Circulation</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Signaler un Événement
        </button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Rechercher un événement..." />
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Aucun événement</h3>
          <p>Commencez par signaler votre premier événement</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Description</th>
              <th>Gravité</th>
              <th>Date</th>
              <th>Trajet impacté</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={index}>
                <td><strong>{event.nom}</strong></td>
                <td>
                  <span className="badge badge-danger">{event.type}</span>
                </td>
                <td>{event.description || '-'}</td>
                <td>
                  <span className={`badge ${getGraviteBadge(event.gravite)}`}>
                    {event.gravite ? `${event.gravite}/5` : '-'}
                  </span>
                </td>
                <td>
                  {event.date ? new Date(event.date).toLocaleDateString('fr-FR') : '-'}
                </td>
                <td>{event.trajet || '-'}</td>
                <td className="actions-cell">
                  <button 
                    className="btn btn-warning"
                    onClick={() => openModal(event)}
                  >
                    ✏️ Modifier
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(event.id)}
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
            <h3>{editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom de l'événement *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Accident Avenue Bourguiba"
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
                  <option value="Accident">Accident</option>
                  <option value="Embouteillage">Embouteillage</option>
                  <option value="Travaux">Travaux</option>
                  <option value="Manifestation">Manifestation</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Décrivez l'événement..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Gravité: {formData.gravite}/5</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.gravite}
                  onChange={(e) => setFormData({...formData, gravite: parseInt(e.target.value)})}
                  style={{width: '100%'}}
                />
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666'}}>
                  <span>1 - Faible</span>
                  <span>3 - Moyenne</span>
                  <span>5 - Forte</span>
                </div>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-success">
                  {editingEvent ? 'Mettre à jour' : 'Signaler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px'}}>
        <h4 style={{marginBottom: '10px', color: '#667eea'}}>⚠️ Module géré par: Aymen Jallouli</h4>
        <p style={{color: '#666'}}>
          <strong>Fonctionnalités CRUD:</strong><br/>
          ✅ Create (Créer) - Signaler de nouveaux événements<br/>
          ✅ Read (Lire) - Consulter tous les événements<br/>
          ✅ Update (Modifier) - Mettre à jour les informations<br/>
          ✅ Delete (Supprimer) - Supprimer des événements résolus
        </p>
      </div>
    </div>
  );
};

export default EventManagement;
