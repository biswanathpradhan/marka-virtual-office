import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import './ChatPanel.css';

const ChatPanel = ({ room, currentUser }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const isSuperAdmin = user?.role === 'superadmin';

  const handleNewMessage = useCallback((message) => {
    // Check if message already exists to avoid duplicates
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!room) return;
    try {
      const response = await axios.get(`/api/messages/${room.id}`);
      if (response.data && response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (error.response?.status === 403) {
        console.error('Access denied to room messages');
      }
    }
  }, [room]);

  useEffect(() => {
    if (!room) return;

    // Fetch existing messages
    fetchMessages();

    // Listen for new messages
    if (socket) {
      const handleMessage = (message) => {
        // Only add if message is for current room (compare as strings)
        const messageRoomId = message.roomId?.toString();
        const currentRoomId = room.id?.toString();
        if (messageRoomId === currentRoomId) {
          handleNewMessage(message);
        }
      };
      socket.on('message:new', handleMessage);

      return () => {
        socket.off('message:new', handleMessage);
      };
    }
  }, [room, socket, fetchMessages, handleNewMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !room) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      socket.emit('message:send', {
        roomId: room.id.toString(),
        content: messageContent,
        type: 'text'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if sending failed
      setNewMessage(messageContent);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0 || !room) return;

    const file = Array.isArray(files) ? files[0] : files;
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('room', room.id.toString());

    try {
      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });

      if (socket && response.data && response.data.message) {
        // Send message through socket
        socket.emit('message:send', {
          roomId: room.id,
          content: response.data.message.content || '',
          type: response.data.message.type,
          file: response.data.message.file
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error.response?.data?.message || 'Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input
    e.target.value = '';
  };

  const downloadFile = (file) => {
    window.open(`/api/files/${file.fileName}`, '_blank');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    noClick: false,
    noKeyboard: false,
    maxSize: 25 * 1024 * 1024,
    multiple: false,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/*': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv'],
      'audio/*': ['.mp3', '.wav', '.ogg']
    }
  });

  return (
    <div {...getRootProps()} className={`chat-panel ${isDragActive ? 'drag-active' : ''}`}>
      <input
        {...getInputProps()}
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      
      <div className="chat-header">
        <h3>Chat</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="participant-count">{room.participants?.length || 0} participants</span>
          {isSuperAdmin && (
            <button
              className="admin-btn"
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              title="Admin Chat Management"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {showAdminPanel && isSuperAdmin && (
        <div className="admin-panel">
          <h4>Super Admin - Chat Management</h4>
          <p>All messages are non-deletable and stored permanently.</p>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              try {
                const response = await axios.get('/api/admin/messages');
                console.log('All messages:', response.data);
                alert(`Total messages: ${response.data.total}`);
              } catch (error) {
                console.error('Error fetching admin messages:', error);
              }
            }}
          >
            View All Messages
          </button>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              try {
                const response = await axios.get(`/api/admin/rooms/${room.id}/messages`);
                console.log('Room messages:', response.data);
                alert(`Room has ${response.data.total} messages`);
              } catch (error) {
                console.error('Error fetching room messages:', error);
              }
            }}
          >
            View Room Messages
          </button>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender.id === user?.id ? 'own-message' : ''}`}
          >
            <div className="message-header">
              <span className="message-sender">{message.sender.name}</span>
              <span className="message-time">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
            {message.type === 'file' || message.type === 'image' ? (
              <div className="message-file">
                {message.type === 'image' ? (
                  <img
                    src={`/api/files/${message.file.fileName}`}
                    alt={message.file.originalName}
                    className="message-image"
                    onClick={() => downloadFile(message.file)}
                  />
                ) : (
                  <div className="file-item" onClick={() => downloadFile(message.file)}>
                    <span className="file-icon">📎</span>
                    <div className="file-info">
                      <div className="file-name">{message.file.originalName}</div>
                      <div className="file-size">
                        {(message.file.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="message-content">{message.content}</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {isDragActive && (
        <div className="dropzone-overlay">
          <div className="dropzone-message">Drop file here to upload</div>
        </div>
      )}

      <form className="chat-input-form" onSubmit={sendMessage}>
        <button
          type="button"
          className="file-upload-btn"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          title="Upload file (max 25MB)"
          disabled={uploading}
        >
          {uploading ? '⏳' : '📎'}
        </button>
        <input
          type="text"
          className="chat-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={uploading}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!newMessage.trim() || uploading}
        >
          {uploading ? '⏳' : '➤'}
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;

