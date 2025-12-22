import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RoomManager.css';

const RoomManager = ({ user, currentRoom, onRoomSelect, onClose }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', type: 'office' });

  useEffect(() => {
    fetchRooms();
  }, []);

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

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/rooms', newRoom);
      alert('Room created successfully!');
      setShowCreateRoom(false);
      setNewRoom({ name: '', description: '', type: 'office' });
      fetchRooms();
      if (response.data.room) {
        onRoomSelect(response.data.room.id);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert(error.response?.data?.message || 'Error creating room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room? You can still access chat and files as super admin.')) {
      return;
    }
    try {
      await axios.delete(`/api/rooms/${roomId}`);
      alert('Room deleted successfully!');
      fetchRooms();
      // If deleted room was current room, select first available room
      if (currentRoom && currentRoom.id === roomId) {
        const remainingRooms = rooms.filter(r => r.id !== roomId);
        if (remainingRooms.length > 0) {
          onRoomSelect(remainingRooms[0].id);
        }
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      alert(error.response?.data?.message || 'Error deleting room');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content room-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Room Manager</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="room-manager-content">
          <div className="room-manager-actions">
            <button className="btn btn-primary" onClick={() => setShowCreateRoom(!showCreateRoom)}>
              {showCreateRoom ? 'Cancel' : '+ Create Room'}
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
            <div className="loading">Loading rooms...</div>
          ) : (
            <div className="rooms-list">
              {rooms.length === 0 ? (
                <p>No rooms available. Create your first room!</p>
              ) : (
                rooms.map(room => {
                  const isCreator = typeof room.createdBy === 'object' 
                    ? room.createdBy.id === user.id 
                    : room.createdBy === user.id;
                  const isCurrentRoom = currentRoom && currentRoom.id === room.id;
                  
                  return (
                    <div key={room.id} className={`room-item ${isCurrentRoom ? 'active' : ''}`}>
                      <div className="room-info" onClick={() => !isCurrentRoom && onRoomSelect(room.id)}>
                        <h4>{room.name} {isCurrentRoom && '(Current)'}</h4>
                        <p>{room.description || 'No description'}</p>
                        <span className="room-meta">Type: {room.type} | Created: {new Date(room.createdAt).toLocaleDateString()}</span>
                      </div>
                      {isCreator && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteRoom(room.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomManager;

