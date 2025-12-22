import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const AdminPanel = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' or 'users'
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', type: 'office' });

  useEffect(() => {
    if (activeTab === 'rooms') {
      fetchRooms();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/rooms');
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      alert('Error fetching rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/rooms', newRoom);
      alert('Room created successfully!');
      setShowCreateRoom(false);
      setNewRoom({ name: '', description: '', type: 'office' });
      fetchRooms();
    } catch (error) {
      console.error('Error creating room:', error);
      alert(error.response?.data?.message || 'Error creating room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to permanently delete this room?')) {
      return;
    }
    try {
      await axios.delete(`/api/rooms/${roomId}`);
      alert('Room deleted successfully!');
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert(error.response?.data?.message || 'Error deleting room');
    }
  };

  const handleDeleteAllRooms = async () => {
    if (!window.confirm('Are you sure you want to delete ALL rooms? This action cannot be undone!')) {
      return;
    }
    try {
      await axios.delete('/api/admin/rooms');
      alert('All rooms deleted successfully!');
      fetchRooms();
    } catch (error) {
      console.error('Error deleting all rooms:', error);
      alert(error.response?.data?.message || 'Error deleting all rooms');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? They will not be able to login again.')) {
      return;
    }
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      alert('User deleted successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Error deleting user');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-panel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Super Admin Panel</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            Rooms Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users Management
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'rooms' && (
            <div className="rooms-management">
              <div className="admin-actions">
                <button className="btn btn-primary" onClick={() => setShowCreateRoom(!showCreateRoom)}>
                  {showCreateRoom ? 'Cancel' : '+ Create Room'}
                </button>
                <button className="btn btn-danger" onClick={handleDeleteAllRooms}>
                  Delete All Rooms
                </button>
              </div>

              {showCreateRoom && (
                <form className="create-room-form" onSubmit={handleCreateRoom}>
                  <div className="form-group">
                    <label>Room Name</label>
                    <input
                      type="text"
                      className="input"
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      required
                      placeholder="Enter room name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      className="input"
                      value={newRoom.description}
                      onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                      placeholder="Enter room description"
                    />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      className="input"
                      value={newRoom.type}
                      onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                    >
                      <option value="office">Office</option>
                      <option value="meeting">Meeting</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Create Room</button>
                </form>
              )}

              {loading ? (
                <div className="loading">Loading...</div>
              ) : (
                <div className="rooms-list">
                  {rooms.length === 0 ? (
                    <p>No rooms found</p>
                  ) : (
                    rooms.map(room => (
                      <div key={room.id} className="room-item">
                        <div className="room-info">
                          <h4>{room.name}</h4>
                          <p>{room.description || 'No description'}</p>
                          <span className="room-meta">Type: {room.type} | Created: {new Date(room.createdAt).toLocaleDateString()}</span>
                          {room.isDeleted && <span className="deleted-badge">Deleted</span>}
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteRoom(room.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-management">
              {loading ? (
                <div className="loading">Loading...</div>
              ) : (
                <div className="users-list">
                  {users.length === 0 ? (
                    <p>No users found</p>
                  ) : (
                    users.map(userItem => (
                      <div key={userItem.id} className="user-item">
                        <div className="user-info">
                          <h4>{userItem.name}</h4>
                          <p>{userItem.email}</p>
                          <span className="user-meta">
                            Role: {userItem.role} | 
                            Department: {userItem.department || 'N/A'} | 
                            Designation: {userItem.designation || 'N/A'}
                          </span>
                        </div>
                        {userItem.id !== user.id && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteUser(userItem.id)}
                          >
                            Delete User
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

