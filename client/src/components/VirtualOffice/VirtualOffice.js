import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import OfficeLayout from './OfficeLayout';
import VideoCall from './VideoCall';
import ChatPanel from './ChatPanel';
import ProfileModal from './ProfileModal';
import AdminPanel from './AdminPanel';
import RoomManager from './RoomManager';
import './VirtualOffice.css';

const VirtualOffice = () => {
  const { user, updateUser } = useAuth();
  const { socket, connected } = useSocket();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callData, setCallData] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [localMediaState, setLocalMediaState] = useState({
    isVideoEnabled: false,
    isAudioEnabled: false
  });
  const [usersWithVideo, setUsersWithVideo] = useState(new Set());

  // Define joinRoom function - must be defined first
  const joinRoom = useCallback(async (roomId) => {
    try {
      console.log('Joining room:', roomId);
      const response = await axios.put(`/api/rooms/${roomId}/join`);
      console.log('Join room response:', response.data);
      
      // Set room immediately from API response
      if (response.data && response.data.room) {
        console.log('Setting current room from join response');
        setCurrentRoom(response.data.room);
        setLoading(false);
      } else {
        // If no room in response, fetch it directly
        console.log('No room in join response, fetching directly');
        const roomResponse = await axios.get(`/api/rooms/${roomId}`);
        console.log('Room fetch response:', roomResponse.data);
        if (roomResponse.data && roomResponse.data.room) {
          setCurrentRoom(roomResponse.data.room);
          setLoading(false);
        }
      }
      // Also emit socket event if socket is available
      if (socket) {
        socket.emit('room:join', { roomId });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      // Try to fetch room directly if join fails
      try {
        const roomResponse = await axios.get(`/api/rooms/${roomId}`);
        if (roomResponse.data && roomResponse.data.room) {
          console.log('Setting room from direct fetch after error');
          setCurrentRoom(roomResponse.data.room);
          setLoading(false);
        }
      } catch (fetchError) {
        console.error('Error fetching room:', fetchError);
        setLoading(false);
      }
    }
  }, [socket]);

  // Define createDefaultRoom function - uses joinRoom
  const createDefaultRoom = useCallback(async () => {
    try {
      const response = await axios.post('/api/rooms', {
        name: 'Main Office',
        type: 'office',
        description: 'Main virtual office space'
      });
      if (response.data && response.data.room && response.data.room.id) {
        await joinRoom(response.data.room.id);
      }
    } catch (error) {
      console.error('Error creating default room:', error);
    }
  }, [joinRoom]);

  // Define fetchRooms function - uses both joinRoom and createDefaultRoom
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/rooms');
      
      if (response.data && response.data.rooms && Array.isArray(response.data.rooms) && response.data.rooms.length > 0) {
        // Join default office room or first room
        const defaultRoom = response.data.rooms.find(r => r.type === 'office') || response.data.rooms[0];
        if (defaultRoom && defaultRoom.id) {
          await joinRoom(defaultRoom.id);
        }
      } else {
        // Create default office room
        await createDefaultRoom();
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      // Set a default empty room to prevent infinite loading
      setCurrentRoom({
        id: 0,
        name: 'Loading...',
        participants: [],
        layout: {}
      });
    } finally {
      setLoading(false);
    }
  }, [joinRoom, createDefaultRoom]);

  // Fetch rooms on mount, even if socket isn't connected yet
  useEffect(() => {
    let mounted = true;
    
    const loadRooms = async () => {
      try {
        setLoading(true);
        console.log('Fetching rooms...');
        const response = await axios.get('/api/rooms');
        console.log('Rooms response:', response.data);
        
        if (!mounted) return;
        
        if (response.data && response.data.rooms && Array.isArray(response.data.rooms) && response.data.rooms.length > 0) {
          // Join default office room or first room
          const defaultRoom = response.data.rooms.find(r => r.type === 'office') || response.data.rooms[0];
          console.log('Default room found:', defaultRoom);
          if (defaultRoom && defaultRoom.id) {
            await joinRoom(defaultRoom.id);
          } else {
            console.error('No valid room ID found');
            setLoading(false);
          }
        } else {
          console.log('No rooms found, creating default room');
          // Create default office room
          await createDefaultRoom();
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRooms();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    if (!socket || !connected) return;

    // Socket event listeners
    socket.on('room:joined', (room) => {
      setCurrentRoom(room);
      setLoading(false);
    });

    socket.on('room:user-joined', (data) => {
      if (currentRoom && currentRoom.id === data.room.id) {
        setCurrentRoom(data.room);
      }
    });

    socket.on('room:user-left', (data) => {
      if (currentRoom && currentRoom.id === data.room.id) {
        setCurrentRoom(data.room);
        // Remove user from video set
        const userIdStr = data.userId?.toString();
        if (userIdStr) {
          setUsersWithVideo(prev => {
            const newSet = new Set(prev);
            newSet.delete(userIdStr);
            return newSet;
          });
        }
      }
    });
    
    socket.on('user:media-stopped', (data) => {
      const userIdStr = data.userId?.toString();
      if (userIdStr) {
        setUsersWithVideo(prev => {
          const newSet = new Set(prev);
          newSet.delete(userIdStr);
          return newSet;
        });
      }
    });

    socket.on('users:online', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user:position-changed', (data) => {
      // Update user position in current room
      if (currentRoom) {
        const updatedRoom = {
          ...currentRoom,
          participants: currentRoom.participants.map(p =>
            p.id === data.userId ? { ...p, position: data.position } : p
          )
        };
        setCurrentRoom(updatedRoom);
      }
    });

    socket.on('user:profile-changed', (data) => {
      // Update user profile in current room
      if (currentRoom) {
        const updatedRoom = {
          ...currentRoom,
          participants: currentRoom.participants.map(p =>
            p.id === data.userId ? { ...p, ...data.user } : p
          )
        };
        setCurrentRoom(updatedRoom);
      }
      // Update current user if it's their profile
      if (data.userId === user?.id) {
        updateUser(data.user);
      }
    });

    socket.on('call:media-toggled', (data) => {
      // Track users with video enabled
      if (data.type === 'video') {
        const userIdStr = data.userId?.toString();
        if (userIdStr) {
          setUsersWithVideo(prev => {
            const newSet = new Set(prev);
            if (data.enabled) {
              newSet.add(userIdStr);
            } else {
              newSet.delete(userIdStr);
            }
            return newSet;
          });
        }
      }
    });

    socket.on('user:media-started', (data) => {
      // Track users who started video or audio
      if (data.isVideoEnabled || data.isAudioEnabled) {
        const userIdStr = data.userId?.toString();
        if (userIdStr) {
          setUsersWithVideo(prev => {
            const newSet = new Set(prev);
            newSet.add(userIdStr);
            return newSet;
          });
        }
      }
    });

    socket.on('user:media-stopped', (data) => {
      // Remove user from video set
      const userIdStr = data.userId?.toString();
      if (userIdStr) {
        setUsersWithVideo(prev => {
          const newSet = new Set(prev);
          newSet.delete(userIdStr);
          return newSet;
        });
      }
    });

    socket.on('room:scroll-changed', (data) => {
      // Sync scroll position (only if not current user)
      if (data.userId !== user?.id && currentRoom) {
        // This will be handled by OfficeLayout component
      }
    });

    socket.on('call:started', (data) => {
      setCallData(data);
      setInCall(true);
    });

    socket.on('call:ended', () => {
      setInCall(false);
      setCallData(null);
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:user-joined');
      socket.off('room:user-left');
      socket.off('users:online');
      socket.off('user:position-changed');
      socket.off('call:started');
      socket.off('call:ended');
    };
  }, [socket, connected, currentRoom]);

  const updatePosition = async (x, y) => {
    try {
      // Ensure x and y are numbers
      const numX = typeof x === 'string' ? parseFloat(x) : Number(x);
      const numY = typeof y === 'string' ? parseFloat(y) : Number(y);
      
      if (isNaN(numX) || isNaN(numY)) {
        console.error('Invalid position values:', { x, y });
        return;
      }
      
      await axios.put('/api/users/position', { x: numX, y: numY });
      if (socket && currentRoom) {
        socket.emit('user:position-update', { x: numX, y: numY, roomId: currentRoom.id });
      }
    } catch (error) {
      console.error('Error updating position:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  };

  const startCall = () => {
    if (socket && currentRoom) {
      socket.emit('call:start', { roomId: currentRoom.id, type: 'video' });
    }
  };

  const endCall = () => {
    if (socket && callData) {
      socket.emit('call:end', { callId: callData.callId });
      setInCall(false);
      setCallData(null);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom || !socket) return;
    
    if (!window.confirm('Are you sure you want to leave this room?')) {
      return;
    }
    
    try {
      // Emit leave event to socket
      socket.emit('room:leave', { roomId: currentRoom.id });
      
      // Call API to leave room
      await axios.put(`/api/rooms/${currentRoom.id}/leave`);
      
      // Stop all media streams
      setLocalMediaState({ isVideoEnabled: false, isAudioEnabled: false });
      setUsersWithVideo(new Set());
      
      // Clear room state
      setCurrentRoom(null);
      setShowVideoPanel(false);
      setInCall(false);
      setCallData(null);
      
      // Redirect to room selection or home
      window.location.href = '/';
    } catch (error) {
      console.error('Error leaving room:', error);
      alert('Error leaving room. Please try again.');
    }
  };

  if (!currentRoom || loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p style={{ marginTop: '20px', color: '#666' }}>
          {!socket || !connected ? 'Connecting...' : 'Loading office...'}
        </p>
      </div>
    );
  }

  return (
    <div className="virtual-office">
      <header className="office-header">
        <div className="header-left">
          <h1>Virtual Office</h1>
          <span className="room-name">{currentRoom.name}</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowRoomManager(true)}
            title="Manage Rooms"
            style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 8px' }}
          >
            🏢 Rooms
          </button>
        </div>
        <div className="header-right">
          {user?.role === 'superadmin' && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAdminPanel(true)}
              title="Admin Panel"
            >
              ⚙️ Admin
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setShowProfile(true)}
            title="Profile"
          >
            👤 {user?.name}
          </button>
          <button
            className={`btn ${showChat ? 'btn-active' : 'btn-secondary'}`}
            onClick={() => setShowChat(!showChat)}
            title="Toggle Chat"
          >
            💬 Chat
          </button>
          <button
            className={`btn ${showVideoPanel ? 'btn-active' : 'btn-secondary'}`}
            onClick={() => setShowVideoPanel(!showVideoPanel)}
            title="Toggle Video Panel"
          >
            📹 Video
          </button>
          <button
            className="btn btn-danger"
            onClick={handleLeaveRoom}
            title="Leave Room"
          >
            🚪 Leave
          </button>
        </div>
      </header>

      <div className="office-content">
        <OfficeLayout
          room={currentRoom}
          currentUser={user}
          onlineUsers={onlineUsers}
          onPositionUpdate={updatePosition}
          onMediaToggle={(type, enabled) => {
            console.log('OfficeLayout onMediaToggle:', type, enabled);
            setLocalMediaState(prev => {
              const newState = {
                ...prev,
                [type === 'video' ? 'isVideoEnabled' : 'isAudioEnabled']: enabled
              };
              console.log('Updated localMediaState:', newState);
              return newState;
            });
            // Auto-show video panel when camera or audio is turned on
            if (enabled) {
              setShowVideoPanel(true);
            }
          }}
          localMediaState={localMediaState}
        />

        {showChat && (
          <ChatPanel
            room={currentRoom}
            currentUser={user}
          />
        )}

        {/* Show VideoCall panel when user has media enabled OR others have media enabled */}
        {showVideoPanel && (
          <VideoCall
            room={currentRoom}
            currentUser={user}
            localMediaState={localMediaState}
            usersWithVideo={usersWithVideo}
            onClose={() => setShowVideoPanel(false)}
            onMediaToggle={(type, enabled) => {
              setLocalMediaState(prev => ({
                ...prev,
                [type === 'video' ? 'isVideoEnabled' : 'isAudioEnabled']: enabled
              }));
              if (type === 'video') {
                const userIdStr = user.id?.toString();
                if (enabled && userIdStr) {
                  setUsersWithVideo(prev => new Set(prev).add(userIdStr));
                  setShowVideoPanel(true);
                } else if (userIdStr) {
                  setUsersWithVideo(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userIdStr);
                    return newSet;
                  });
                }
              } else if (type === 'audio' && enabled) {
                // Show video panel when audio is enabled too
                setShowVideoPanel(true);
              }
            }}
          />
        )}

      </div>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdate={updateUser}
        />
      )}

      {showAdminPanel && user?.role === 'superadmin' && (
        <AdminPanel
          user={user}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {showRoomManager && (
        <RoomManager
          user={user}
          currentRoom={currentRoom}
          onRoomSelect={async (roomId) => {
            await joinRoom(roomId);
            setShowRoomManager(false);
          }}
          onClose={() => setShowRoomManager(false)}
        />
      )}
    </div>
  );
};

export default VirtualOffice;

