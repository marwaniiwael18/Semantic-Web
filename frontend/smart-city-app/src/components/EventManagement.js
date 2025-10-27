// EventManagement.js - Module CRUD pour Aymen Jallouli
import React, { useState, useEffect, useRef } from 'react';
import { validateEvent } from '../utils/validation';
import { useToast } from './ToastProvider';
import { useConfirm } from './ConfirmProvider';

const API_URL = 'http://localhost:5001/api';

const EventManagement = ({ onUpdate }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'Accident',
    description: '',
    gravite: 3,
    date: new Date().toISOString().split('T')[0],
    imageUrl: ''
  });
  const [errors, setErrors] = useState({});
  const nomRef = useRef(null);
  const graviteRef = useRef(null);
  const dateRef = useRef(null);
  const toast = useToast();
  const confirm = useConfirm();

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image too large. Max size is 5MB');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(file);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { valid, errors: vErrors } = validateEvent(formData);
    setErrors(vErrors);
    if (!valid) {
      // focus first invalid field: nom -> gravite -> date
      if (vErrors.nom && nomRef.current) {
        nomRef.current.focus();
        nomRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (vErrors.gravite && graviteRef.current) {
        graviteRef.current.focus();
        graviteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (vErrors.date && dateRef.current) {
        dateRef.current.focus();
        dateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      // Upload image first if there's a new image
      let imageUrl = formData.imageUrl || '';
      
      // Only upload if there's a NEW image (imageFile exists)
      if (imageFile && imagePreview) {
        const uploadResponse = await fetch(`${API_URL}/upload/event-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_id: editingEvent ? editingEvent.id : `event_${Date.now()}`,
            image_data: imagePreview
          })
        });

        const uploadData = await uploadResponse.json();
        if (uploadData.success) {
          imageUrl = uploadData.url;
        } else {
          console.error('Image upload failed:', uploadData.error);
        }
      }
      
      const endpoint = editingEvent 
        ? `${API_URL}/events/${editingEvent.id}` 
        : `${API_URL}/events`;
      
      const method = editingEvent ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: formData.nom,
          type: formData.type,
          description: formData.description,
          gravite: formData.gravite,
          date: formData.date,
          imageUrl: imageUrl
        })
      });

      const data = await response.json();
      
      if (data.success || response.ok) {
        toast.success(editingEvent ? 'Event updated!' : 'Event created!');
        closeModal();
        loadEvents();
        if (onUpdate) onUpdate();
      } else {
        toast.error('Error: ' + (data.error || 'Failed to save event'));
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Error saving event');
    }
  };

  const handleDelete = async (eventId) => {
    if (await confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await fetch(`${API_URL}/events/${eventId}`, {
          method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success || response.ok) {
          toast.success('Event deleted!');
          loadEvents();
          if (onUpdate) onUpdate();
        } else {
          toast.error('Error: ' + (data.error || 'Failed to delete event'));
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Error deleting event');
      }
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
        date: event.date ? event.date.split('T')[0] : new Date().toISOString().split('T')[0],
        imageUrl: event.imageUrl || ''
      });
      // Set image preview to existing imageUrl (not a new file)
      if (event.imageUrl) {
        setImagePreview(event.imageUrl);
        setImageFile(null); // No new file, just showing existing
      } else {
        setImagePreview(null);
        setImageFile(null);
      }
    } else {
      setEditingEvent(null);
      setFormData({
        nom: '',
        type: 'Accident',
        description: '',
        gravite: 3,
        date: new Date().toISOString().split('T')[0],
        imageUrl: ''
      });
      setImagePreview(null);
      setImageFile(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setImageFile(null);
    setImagePreview(null);
  };

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>⚠️ Traffic Events Management</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Report an Event
        </button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Search events..." />
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>No events</h3>
          <p>Start by reporting your first event</p>
        </div>
      ) : (
        <div className="cards-grid">
          {events.map((event, index) => (
            <div key={index} className="event-card">
              {event.imageUrl ? (
                <div className="transport-card-image">
                  <img src={event.imageUrl} alt={event.nom} />
                </div>
              ) : (
                <div className="transport-card-no-image" style={{background: 'linear-gradient(135deg, #f56565 0%, #ed8936 100%)'}}>
                  ⚠️
                </div>
              )}
              
              <div className="event-card-header">
                <div>
                  <h3 className="event-title">{event.nom}</h3>
                  <span className="event-type">{event.type}</span>
                </div>
              </div>
              
              <div className="transport-card-body">
                {event.description && (
                  <div className="info-row">
                    <span className="info-label">📝 Description</span>
                    <span className="info-value" style={{fontSize: '13px', textAlign: 'right'}}>{event.description}</span>
                  </div>
                )}
                
                <div className="severity-indicator">
                  <span className="info-label">Severity:</span>
                  <div className="severity-dots">
                    {[1, 2, 3, 4, 5].map(dot => (
                      <div 
                        key={dot} 
                        className={`severity-dot ${dot <= (event.gravite || 0) ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="info-row">
                  <span className="info-label">📅 Date</span>
                  <span className="info-value">
                    {event.date ? new Date(event.date).toLocaleDateString() : '-'}
                  </span>
                </div>
                
                {event.trajet && (
                  <div className="info-row">
                    <span className="info-label">🚗 Impact</span>
                    <span className="info-value">{event.trajet}</span>
                  </div>
                )}
              </div>

              <div className="transport-card-footer">
                <button 
                  className="btn btn-warning btn-sm"
                  onClick={() => openModal(event)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(event.id)}
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
            <h3>{editingEvent ? 'Edit Event' : 'New Event'}</h3>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  value={formData.nom}
                  ref={nomRef}
                  onChange={(e) => { setFormData({...formData, nom: e.target.value}); setErrors({...errors, nom: null}); }}
                  placeholder="Ex: Accident Avenue Bourguiba"
                  required
                />
                {errors.nom && <div className="field-error">{errors.nom}</div>}
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="Accident">Accident</option>
                  <option value="Traffic Jam">Traffic Jam</option>
                  <option value="Construction">Construction</option>
                  <option value="Demonstration">Demonstration</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the event..."
                  rows="4"
                />
              </div>

              <div className="image-upload-section">
                <label>Event Image</label>
                {imagePreview ? (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="transport-image-preview" />
                    <button type="button" className="btn btn-danger btn-sm" onClick={removeImage}>
                      🗑️ Remove Image
                    </button>
                  </div>
                ) : (
                  <div className="image-upload-placeholder">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      id="event-image"
                      style={{display: 'none'}}
                    />
                    <label htmlFor="event-image" className="upload-label">
                      <div className="upload-icon">📷</div>
                      <p>Click to upload event image</p>
                      <small>Max size: 5MB</small>
                    </label>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Severity: {formData.gravite}/5</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.gravite}
                  ref={graviteRef}
                  onChange={(e) => { setFormData({...formData, gravite: parseInt(e.target.value)}); setErrors({...errors, gravite: null}); }}
                  style={{width: '100%'}}
                />
                {errors.gravite && <div className="field-error">{errors.gravite}</div>}
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666'}}>
                  <span>1 - Low</span>
                  <span>3 - Medium</span>
                  <span>5 - High</span>
                </div>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  ref={dateRef}
                  onChange={(e) => { setFormData({...formData, date: e.target.value}); setErrors({...errors, date: null}); }}
                />
                {errors.date && <div className="field-error">{errors.date}</div>}
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  {editingEvent ? 'Update' : 'Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagement;
