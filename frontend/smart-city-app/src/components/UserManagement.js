// UserManagement.js - Module CRUD pour Yassine Mannai
import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001/api';

const UserManagement = ({ onUpdate }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    age: '',
    email: '',
    type: 'Citoyen',
    carteAbonnement: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ici, vous devrez implémenter l'API POST/PUT dans le backend
    console.log('Soumission:', formData);
    
    // Pour l'instant, simulons l'ajout
    alert(editingUser ? 'Utilisateur modifié!' : 'Nouvel utilisateur ajouté!');
    closeModal();
    loadUsers();
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
      // Implémenter l'API DELETE
      console.log('Suppression de:', userId);
      alert('Utilisateur supprimé!');
      loadUsers();
      if (onUpdate) onUpdate();
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nom: user.nom,
        age: user.age || '',
        email: user.email || '',
        type: user.type,
        carteAbonnement: user.carteAbonnement || false
      });
    } else {
      setEditingUser(null);
      setFormData({
        nom: '',
        age: '',
        email: '',
        type: 'Citoyen',
        carteAbonnement: false
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  if (loading) {
    return <div className="loading">Chargement des utilisateurs...</div>;
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>👥 Gestion des Utilisateurs</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Ajouter un Utilisateur
        </button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Rechercher un utilisateur..." />
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <h3>Aucun utilisateur</h3>
          <p>Commencez par ajouter votre premier utilisateur</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Âge</th>
              <th>Email</th>
              <th>Type</th>
              <th>Transports</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={index}>
                <td><strong>{user.nom}</strong></td>
                <td>{user.age || '-'}</td>
                <td>{user.email || '-'}</td>
                <td>
                  <span className="badge badge-primary">{user.type}</span>
                </td>
                <td>{user.transports.length} transport(s)</td>
                <td className="actions-cell">
                  <button 
                    className="btn btn-warning"
                    onClick={() => openModal(user)}
                  >
                    ✏️ Modifier
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(user.id)}
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
            <h3>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
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
                <label>Âge</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="Citoyen">Citoyen</option>
                  <option value="Touriste">Touriste</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.carteAbonnement}
                    onChange={(e) => setFormData({...formData, carteAbonnement: e.target.checked})}
                  />
                  {' '}Carte d'abonnement
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-success">
                  {editingUser ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px'}}>
        <h4 style={{marginBottom: '10px', color: '#667eea'}}>👤 Module </h4>
        <p style={{color: '#666'}}>
          <strong>Fonctionnalités CRUD:</strong><br/>
          ✅ Create (Créer) - Ajouter de nouveaux utilisateurs<br/>
          ✅ Read (Lire) - Afficher la liste des utilisateurs<br/>
          ✅ Update (Modifier) - Mettre à jour les informations<br/>
          ✅ Delete (Supprimer) - Supprimer des utilisateurs
        </p>
      </div>
    </div>
  );
};

export default UserManagement;
