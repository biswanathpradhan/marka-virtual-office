import React, { useState } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import './ProfileModal.css';

const ProfileModal = ({ user, onClose, onUpdate }) => {
  const { socket } = useSocket();
  const isSuperAdmin = user?.role === 'superadmin';
  const [formData, setFormData] = useState({
    name: user?.name || '',
    department: user?.department || '',
    designation: user?.designation || '',
    profileImage: user?.profileImage || '',
    email: user?.email || '',
    password: '',
    confirmPassword: ''
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    // Convert to base64 for simplicity (in production, upload to server)
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        profileImage: reader.result
      });
      setUploading(false);
    };
    reader.onerror = () => {
      setError('Error reading image file');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate password if changing
    if (!isSuperAdmin && formData.password) {
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    try {
      const updateData = {
        name: formData.name,
        department: formData.department,
        designation: formData.designation,
        profileImage: formData.profileImage
      };

      if (isSuperAdmin && formData.email) {
        updateData.email = formData.email;
      } else if (!isSuperAdmin && formData.password) {
        updateData.password = formData.password;
      }

      const response = await axios.put('/api/users/profile', updateData);
      const updatedUser = response.data.user;
      onUpdate(updatedUser);
      
      // Emit socket event for real-time update
      if (socket) {
        socket.emit('user:profile-updated', {
          userId: user.id,
          profileData: updateData
        });
      }
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || 'Error updating profile');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="profile-image-section">
            <div className="profile-image-preview">
              {formData.profileImage ? (
                <img src={formData.profileImage} alt="Profile" />
              ) : (
                <div className="avatar-initial">
                  {formData.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="upload-image-btn">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              {uploading ? 'Uploading...' : 'Change Image'}
            </label>
          </div>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              className="input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              name="department"
              className="input"
              value={formData.department}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Designation</label>
            <input
              type="text"
              name="designation"
              className="input"
              value={formData.designation}
              onChange={handleChange}
            />
          </div>

          {isSuperAdmin && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                className="input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {!isSuperAdmin && (
            <>
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  name="password"
                  className="input"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>
              {formData.password && (
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="input"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                  />
                </div>
              )}
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;

