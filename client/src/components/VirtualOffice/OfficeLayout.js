import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { useSocket } from '../../context/SocketContext';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import './OfficeLayout.css';

const OfficeLayout = ({ room, currentUser, onlineUsers, onPositionUpdate, onScrollSync, onMediaToggle, localMediaState }) => {
  const [userPositions, setUserPositions] = useState({});
  const [hoveredUser, setHoveredUser] = useState(null);
  const [participantMediaStates, setParticipantMediaStates] = useState({});
  const containerRef = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (!room || !room.participants) return;
    // Initialize user positions
    const positions = {};
    room.participants.forEach(participant => {
      const rawPosition = participant.position || { x: 0, y: 0 };
      // Ensure position values are numbers, not strings
      positions[participant.id] = {
        x: typeof rawPosition.x === 'string' ? parseFloat(rawPosition.x) || 0 : (Number(rawPosition.x) || 0),
        y: typeof rawPosition.y === 'string' ? parseFloat(rawPosition.y) || 0 : (Number(rawPosition.y) || 0)
      };
    });
    setUserPositions(positions);
  }, [room]);

  // Listen for position changes from socket
  useEffect(() => {
    if (!socket) return;

    const handlePositionChange = (data) => {
      if (data.userId && room.participants.some(p => p.id === data.userId)) {
        const rawPosition = data.position || { x: 0, y: 0 };
        // Ensure position values are numbers, not strings
        const position = {
          x: typeof rawPosition.x === 'string' ? parseFloat(rawPosition.x) || 0 : (Number(rawPosition.x) || 0),
          y: typeof rawPosition.y === 'string' ? parseFloat(rawPosition.y) || 0 : (Number(rawPosition.y) || 0)
        };
        setUserPositions(prev => ({
          ...prev,
          [data.userId]: position
        }));
      }
    };

    socket.on('user:position-changed', handlePositionChange);

    return () => {
      socket.off('user:position-changed', handlePositionChange);
    };
  }, [socket, room]);

  // Listen for media state changes
  useEffect(() => {
    if (!socket) return;

    const handleMediaToggle = (data) => {
      setParticipantMediaStates(prev => ({
        ...prev,
        [data.userId]: {
          ...prev[data.userId],
          [data.type === 'video' ? 'isVideoEnabled' : 'isAudioEnabled']: data.enabled
        }
      }));
    };

    socket.on('call:media-toggled', handleMediaToggle);

    return () => {
      socket.off('call:media-toggled', handleMediaToggle);
    };
  }, [socket]);

  // Handle scroll sync
  useEffect(() => {
    if (!containerRef.current || !socket) return;

    const handleScroll = () => {
      if (containerRef.current && room) {
        const scrollTop = containerRef.current.scrollTop;
        const scrollLeft = containerRef.current.scrollLeft;
        socket.emit('room:scroll-update', {
          roomId: room.id,
          scrollTop,
          scrollLeft
        });
      }
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);

    // Listen for scroll changes from other users
    const handleScrollChange = (data) => {
      if (data.userId !== currentUser?.id && containerRef.current) {
        containerRef.current.scrollTop = data.scrollTop;
        containerRef.current.scrollLeft = data.scrollLeft;
      }
    };

    socket.on('room:scroll-changed', handleScrollChange);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      socket.off('room:scroll-changed', handleScrollChange);
    };
  }, [socket, room, currentUser]);

  const handleDrag = (userId, data) => {
    // Update local position state immediately for smooth dragging
    setUserPositions(prev => ({
      ...prev,
      [userId]: { x: data.x, y: data.y }
    }));
  };

  const handleDragStop = (userId, data) => {
    const newPosition = { x: data.x, y: data.y };
    // Update local state
    setUserPositions(prev => ({
      ...prev,
      [userId]: newPosition
    }));
    // Send position update to server only on drag stop
    if (onPositionUpdate) {
      onPositionUpdate(newPosition.x, newPosition.y);
    }
  };

  const backgroundImage = room.layout?.backgroundImage || '';

  return (
    <div
      className="office-layout"
      ref={containerRef}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        width: room.layout?.width || '100%',
        height: room.layout?.height || '100%',
        minHeight: '100%'
      }}
    >
      {room.participants.map(participant => {
        const rawPosition = userPositions[participant.id] || participant.position || { x: 0, y: 0 };
        // Ensure position values are numbers, not strings
        const position = {
          x: typeof rawPosition.x === 'string' ? parseFloat(rawPosition.x) || 0 : (rawPosition.x || 0),
          y: typeof rawPosition.y === 'string' ? parseFloat(rawPosition.y) || 0 : (rawPosition.y || 0)
        };
        const isCurrentUser = participant.id === currentUser?.id;

        return (
          <Draggable
            key={participant.id}
            position={position}
            onDrag={(e, data) => handleDrag(participant.id, data)}
            onStop={(e, data) => handleDragStop(participant.id, data)}
            disabled={!isCurrentUser}
            bounds="parent"
          >
            <div
              className={`office-avatar ${isCurrentUser ? 'current-user' : ''} ${participant.isOnline ? 'online' : 'offline'}`}
              title={`${participant.name}${participant.designation ? ` - ${participant.designation}` : ''}`}
              onMouseEnter={() => setHoveredUser(participant.id)}
              onMouseLeave={() => setHoveredUser(null)}
            >
              <div className="avatar-image">
                {participant.profileImage ? (
                  <img src={participant.profileImage} alt={participant.name} />
                ) : (
                  <div className="avatar-initial">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="avatar-name">{participant.name}</div>
              {participant.isOnline && <div className="online-indicator"></div>}
              
              {isCurrentUser && (
                <div className="avatar-controls current-user-controls">
                  <button
                    className={`control-btn ${localMediaState?.isVideoEnabled ? 'active' : ''}`}
                    title={localMediaState?.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                    onClick={async () => {
                      const newState = !localMediaState?.isVideoEnabled;
                      if (onMediaToggle) {
                        onMediaToggle('video', newState);
                      }
                      // Emit to socket
                      socket?.emit('user:media-toggle', {
                        roomId: room.id,
                        type: 'video',
                        enabled: newState
                      });
                    }}
                  >
                    {localMediaState?.isVideoEnabled ? (
                      <FaVideo size={12} />
                    ) : (
                      <FaVideoSlash size={12} />
                    )}
                  </button>
                  <button
                    className={`control-btn ${localMediaState?.isAudioEnabled ? 'active' : ''}`}
                    title={localMediaState?.isAudioEnabled ? 'Mute' : 'Unmute'}
                    onClick={() => {
                      const newState = !localMediaState?.isAudioEnabled;
                      if (onMediaToggle) {
                        onMediaToggle('audio', newState);
                      }
                      // Emit to socket
                      socket?.emit('user:media-toggle', {
                        roomId: room.id,
                        type: 'audio',
                        enabled: newState
                      });
                    }}
                  >
                    {localMediaState?.isAudioEnabled ? (
                      <FaMicrophone size={12} />
                    ) : (
                      <FaMicrophoneSlash size={12} />
                    )}
                  </button>
                </div>
              )}
            </div>
          </Draggable>
        );
      })}
    </div>
  );
};

export default OfficeLayout;

