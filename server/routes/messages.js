const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Room = require('../models/Room');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/messages/:roomId
// @desc    Get messages for a room
// @access  Private
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Convert roomId to number if it's a string
    const roomIdNum = typeof roomId === 'string' ? parseInt(roomId) : roomId;
    
    if (isNaN(roomIdNum)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID' });
    }

    // Verify user has access to room
    const room = await Room.findById(roomIdNum);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Ensure participants array exists
    if (!room.participants || !Array.isArray(room.participants)) {
      room.participants = [];
    }

    const isParticipant = room.participants.some(p => p && p.id && p.id.toString() === req.user.id.toString());
    if (!isParticipant && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await Message.findByRoom(roomIdNum, page, limit);

    res.json({
      success: true,
      messages: result.messages,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      total: result.total
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/messages
// @desc    Create a new message
// @access  Private
router.post('/', [
  body('room').notEmpty().withMessage('Room ID is required'),
  body('content').optional().trim(),
  body('type').optional().isIn(['text', 'file', 'image', 'system']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { room, content, type = 'text', file } = req.body;

    // Verify room exists and user has access
    const roomDoc = await Room.findById(room);
    if (!roomDoc) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const message = await Message.create({
      roomId: room,
      senderId: req.user.id,
      content,
      type,
      file
    });

    const populatedMessage = await Message.findById(message.id);

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

