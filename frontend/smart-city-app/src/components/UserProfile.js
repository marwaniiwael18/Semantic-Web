import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001/api';

const UserProfile = ({ user, onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    age: user?.age || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    // Load saved profile image from localStorage
    const savedImage = localStorage.getItem(`profile_image_${user?.id}`);
    if (savedImage) {
      setImagePreview(savedImage);
    }
  }, [user]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Image size should not exceed 5MB', 'error');
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload profile image to Cloudinary if changed
      if (profileImage && imagePreview) {
        const uploadResponse = await fetch(`${API_URL}/upload/profile-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            image_data: imagePreview
          })
        });

        const uploadData = await uploadResponse.json();
        
        if (uploadData.success) {
          // Save Cloudinary URL to localStorage
          localStorage.setItem(`profile_image_${user.id}`, uploadData.url);
          showNotification('Profile image uploaded successfully', 'success');
        } else {
          showNotification('Failed to upload image: ' + uploadData.error, 'error');
        }
      }

      // Update user data in backend
      const updateData = {
        nom: formData.username,
        email: formData.email,
        age: formData.age
      };

      // If password is being changed
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          showNotification('New passwords do not match', 'error');
          setLoading(false);
          return;
        }
        if (formData.newPassword.length < 6) {
          showNotification('Password must be at least 6 characters', 'error');
          setLoading(false);
          return;
        }
        // In production, verify currentPassword first
        updateData.password = formData.newPassword;
      }

      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.success || response.ok) {
        // Update user in localStorage
        const updatedUser = {
          ...user,
          username: formData.username,
          email: formData.email,
          age: formData.age
        };
        localStorage.setItem('smartcity_user', JSON.stringify(updatedUser));
        
        showNotification('✅ Profile updated successfully!', 'success');
        
        setTimeout(() => {
          if (onUpdate) onUpdate(updatedUser);
          if (onClose) onClose();
        }, 1500);
      } else {
        showNotification(data.error || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('❌ Error updating profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-modern profile-modal" onClick={(e) => e.stopPropagation()}>
        {notification.show && (
          <div className={`notification notification-${notification.type}`}>
            {notification.message}
          </div>
        )}

        <div className="modal-header-modern">
          <h3>👤 My Profile</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-image-section">
            <div className="profile-image-container">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="profile-image-preview" />
              ) : (
                <div className="profile-image-placeholder">
                  {getUserInitials()}
                </div>
              )}
            </div>
            <div className="profile-image-actions">
              <label htmlFor="profile-image-upload" className="btn btn-primary btn-sm">
                📷 Upload Photo
              </label>
              <input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              {imagePreview && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setImagePreview(null);
                    setProfileImage(null);
                    localStorage.removeItem(`profile_image_${user?.id}`);
                  }}
                >
                  🗑️ Remove
                </button>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
              min="1"
              max="120"
            />
          </div>

          <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />

          <h4 style={{ marginBottom: '20px', color: '#667eea' }}>🔒 Change Password (Optional)</h4>

          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
              placeholder="Enter current password"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                placeholder="At least 6 characters"
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
