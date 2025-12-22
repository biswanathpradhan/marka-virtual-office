const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const Call = require('../models/Call');

// Store active calls
const activeCalls = new Map();

const initializeSocket = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        console.error('Socket auth failed: No token provided');
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const user = await User.findById(decoded.userId);

      if (!user) {
        console.error('Socket auth failed: User not found for userId', decoded.userId);
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id.toString();
      socket.user = user.toJSON();
      console.log('Socket authenticated for user:', user.name, 'userId:', socket.userId);
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}, socket ID: ${socket.id}, transport: ${socket.conn.transport.name}`);

    try {
      // Update user online status
      const user = await User.findById(socket.userId);
      if (user) {
        await user.update({
          isOnline: true,
          socketId: socket.id,
          lastSeen: new Date()
        });
        
        // Join user's room if they have one
        if (user.currentRoom) {
          socket.join(user.currentRoom.toString());
          console.log(`User ${socket.userId} joined room ${user.currentRoom}`);
        }
      }

      // Emit online users to all clients
      const onlineUsers = await User.findOnline();
      io.emit('users:online', onlineUsers);
    } catch (error) {
      console.error('Error in socket connection handler:', error);
    }

    // Handle joining a room
    socket.on('room:join', async (data) => {
      try {
        const { roomId } = data;
        const room = await Room.findById(roomId);

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Leave previous room
        if (user.currentRoom) {
          socket.leave(user.currentRoom.toString());
        }

        // Join new room
        socket.join(roomId.toString());
        const user = await User.findById(socket.userId);
        if (user) {
          await user.update({ currentRoom: roomId });
        }

        // Add user to room participants if not already there
        const isParticipant = room.participants.some(p => p.id.toString() === socket.userId.toString());
        if (!isParticipant) {
          await room.addParticipant(socket.userId);
        }

        // Get updated room with participants
        const updatedRoom = await Room.findById(roomId);

        // Notify room members
        io.to(roomId.toString()).emit('room:user-joined', {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,
            department: user.department,
            designation: user.designation,
            position: user.position
          },
          room: updatedRoom
        });

        // Send room data to user
        socket.emit('room:joined', updatedRoom);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle leaving a room
    socket.on('room:leave', async (data) => {
      try {
        const { roomId } = data;
        socket.leave(roomId.toString());
        const user = await User.findById(socket.userId);
        if (user) {
          await user.update({ currentRoom: null, isOnline: false });
        }

        const room = await Room.findById(roomId);
        if (room) {
          await room.removeParticipant(socket.userId);
          const updatedRoom = await Room.findById(roomId);

          // Emit to room that user left
          io.to(roomId.toString()).emit('room:user-left', {
            userId: socket.userId,
            room: updatedRoom
          });
          
          // Emit user media stopped to clean up video calls
          io.to(roomId.toString()).emit('user:media-stopped', {
            userId: socket.userId
          });
        }
        
        // Update online users list
        const onlineUsers = await User.findOnline();
        io.emit('users:online', onlineUsers);
      } catch (error) {
        console.error('Error in room:leave:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle position updates
    socket.on('user:position-update', async (data) => {
      try {
        const { x, y, roomId } = data;
        const user = await User.findById(socket.userId);
        if (user) {
          await user.update({ position: { x, y } });
        }

        // Broadcast position update to room
        if (roomId) {
          socket.to(roomId.toString()).emit('user:position-changed', {
            userId: socket.userId,
            position: { x, y }
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // WebRTC signaling - Offer
    socket.on('call:offer', (data) => {
      const { targetUserId, offer, roomId } = data;
      console.log('Forwarding offer from', socket.userId, 'to', targetUserId, 'in room', roomId);
      
      // Broadcast to room, but clients will filter by targetUserId
      io.to(roomId.toString()).emit('call:offer', {
        from: socket.userId.toString(),
        targetUserId: targetUserId.toString(),
        offer,
        roomId: roomId.toString(),
        user: socket.user
      });
    });

    // WebRTC signaling - Answer
    socket.on('call:answer', (data) => {
      const { targetUserId, answer } = data;
      console.log('Forwarding answer from', socket.userId, 'to', targetUserId);
      
      // Find target user's socket and send answer
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId && s.userId.toString() === targetUserId.toString());
      
      if (targetSocket) {
        targetSocket.emit('call:answer', {
          from: socket.userId.toString(),
          answer
        });
      } else {
        // Fallback: broadcast to room
        const user = socket.user;
        const userRoom = user.currentRoom;
        if (userRoom) {
          io.to(userRoom.toString()).emit('call:answer', {
            from: socket.userId.toString(),
            targetUserId: targetUserId.toString(),
            answer
          });
        }
      }
    });

    // WebRTC signaling - ICE Candidate
    socket.on('call:ice-candidate', (data) => {
      const { targetUserId, candidate } = data;
      console.log('Forwarding ICE candidate from', socket.userId, 'to', targetUserId);
      
      // Find target user's socket and send ICE candidate
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId && s.userId.toString() === targetUserId.toString());
      
      if (targetSocket) {
        targetSocket.emit('call:ice-candidate', {
          from: socket.userId.toString(),
          candidate
        });
      } else {
        // Fallback: broadcast to room
        const user = socket.user;
        const userRoom = user.currentRoom;
        if (userRoom) {
          io.to(userRoom.toString()).emit('call:ice-candidate', {
            from: socket.userId.toString(),
            targetUserId: targetUserId.toString(),
            candidate
          });
        }
      }
    });

    // Handle call start
    socket.on('call:start', async (data) => {
      try {
        const { roomId, type = 'video' } = data;
        const call = await Call.create({
          roomId: roomId,
          participants: [{ user: socket.userId, joinedAt: new Date() }],
          type,
          status: 'active'
        });

        activeCalls.set(call.id.toString(), call);
        io.to(roomId.toString()).emit('call:started', { callId: call.id, type });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle call end
    socket.on('call:end', async (data) => {
      try {
        const { callId } = data;
        const call = await Call.findById(callId);
        if (call) {
          await call.end();
          activeCalls.delete(callId);

          io.to(call.roomId.toString()).emit('call:ended', { callId });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle user joining call
    socket.on('call:join', async (data) => {
      try {
        const { callId, isVideoEnabled = true, isAudioEnabled = true } = data;
        const call = await Call.findById(callId);
        if (call) {
          await call.addParticipant(socket.userId, {
            isVideoEnabled,
            isAudioEnabled
          });

          io.to(call.roomId.toString()).emit('call:user-joined', {
            callId,
            userId: socket.userId,
            user: {
              id: socket.user.id,
              name: socket.user.name,
              profileImage: socket.user.profileImage
            }
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle media toggle (for user's own media)
    socket.on('user:media-toggle', (data) => {
      const { roomId, type, enabled } = data; // type: 'video' or 'audio'
      if (roomId) {
        socket.to(roomId.toString()).emit('call:media-toggled', {
          userId: socket.userId,
          type,
          enabled
        });
      }
    });

    // Handle user starting media
    socket.on('user:media-started', (data) => {
      const { roomId } = data;
      if (roomId) {
        socket.to(roomId.toString()).emit('user:media-started', {
          userId: socket.userId,
          user: socket.user,
          isVideoEnabled: data.isVideoEnabled,
          isAudioEnabled: data.isAudioEnabled
        });
      }
    });

    // Handle user stopping media
    socket.on('user:media-stopped', (data) => {
      const { roomId } = data;
      if (roomId) {
        socket.to(roomId.toString()).emit('user:media-stopped', {
          userId: socket.userId
        });
      }
    });

    // Handle profile update
    socket.on('user:profile-updated', async (data) => {
      try {
        const { userId, profileData } = data;
        const user = await User.findById(userId);
        if (user) {
          const updatedUser = await user.update(profileData);
          // Broadcast to all rooms user is in
          if (user.currentRoom) {
            io.to(user.currentRoom.toString()).emit('user:profile-changed', {
              userId: user.id,
              user: updatedUser.toJSON()
            });
          }
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle scroll position sync
    socket.on('room:scroll-update', (data) => {
      const { roomId, scrollTop, scrollLeft } = data;
      socket.to(roomId.toString()).emit('room:scroll-changed', {
        userId: socket.userId,
        scrollTop,
        scrollLeft
      });
    });

    // Handle new message
    socket.on('message:send', async (data) => {
      try {
        const { roomId, content, type = 'text', file } = data;

        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        // Verify user is in the room
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const isParticipant = room.participants.some(p => p.id.toString() === socket.userId.toString());
        if (!isParticipant) {
          socket.emit('error', { message: 'You are not a participant in this room' });
          return;
        }

        const message = await Message.create({
          roomId: roomId,
          senderId: socket.userId,
          content: content || '',
          type,
          file
        });

        const populatedMessage = await Message.findById(message.id);
        
        // Convert to plain object for socket emission
        const messageData = {
          id: populatedMessage.id,
          roomId: populatedMessage.roomId.toString(),
          senderId: populatedMessage.senderId.toString(),
          content: populatedMessage.content,
          type: populatedMessage.type,
          file: populatedMessage.file,
          sender: populatedMessage.sender ? {
            id: populatedMessage.sender.id.toString(),
            name: populatedMessage.sender.name,
            email: populatedMessage.sender.email,
            profileImage: populatedMessage.sender.profileImage,
            department: populatedMessage.sender.department,
            designation: populatedMessage.sender.designation
          } : null,
          createdAt: populatedMessage.createdAt,
          updatedAt: populatedMessage.updatedAt
        };

        console.log('Emitting message:new to room', roomId.toString(), 'Message ID:', messageData.id);
        io.to(roomId.toString()).emit('message:new', messageData);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      console.log(`User disconnected: ${socket.userId}, reason: ${reason}`);

      try {
        // Update user offline status
        const user = await User.findById(socket.userId);
        if (user) {
          await user.update({
            isOnline: false,
            socketId: null,
            lastSeen: new Date()
          });
        }

        // Leave all rooms
        if (user && user.currentRoom) {
          socket.leave(user.currentRoom.toString());
        }

        // Emit updated online users
        const onlineUsers = await User.findOnline();
        io.emit('users:online', onlineUsers);
      } catch (error) {
        console.error('Error in socket disconnect handler:', error);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error for user', socket.userId, ':', error);
    });
  });
};

module.exports = { initializeSocket };

