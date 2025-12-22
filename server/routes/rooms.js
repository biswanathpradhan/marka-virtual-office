const express = require('express');
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/rooms
// @desc    Get all rooms (filtered by invitations for regular users, all for super admin)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.findAll(req.user.id, req.user.role);
    res.json({
      success: true,
      rooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get room by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
router.post('/', [
  body('name').trim().notEmpty().withMessage('Room name is required'),
  body('type').optional().isIn(['office', 'meeting', 'private']).withMessage('Invalid room type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, type = 'office', layout } = req.body;

    const room = await Room.create({
      name,
      description,
      type,
      createdBy: req.user.id,
      layout: layout || {}
    });

    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/rooms/:id/join
// @desc    Join a room
// @access  Private
router.put('/:id/join', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Check if user is already a participant
    const isParticipant = room.participants.some(p => p.id === req.user.id);
    if (!isParticipant) {
      await room.addParticipant(req.user.id);
    }

    // Update user's current room
    const user = await User.findById(req.user.id);
    if (user) {
      await user.update({ currentRoom: room.id });
    }

    const updatedRoom = await Room.findById(room.id);

    res.json({
      success: true,
      room: updatedRoom
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/rooms/:id/leave
// @desc    Leave a room
// @access  Private
router.put('/:id/leave', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await room.removeParticipant(req.user.id);

    // Update user's current room
    const user = await User.findById(req.user.id);
    if (user) {
      await user.update({ currentRoom: null });
    }

    res.json({
      success: true,
      message: 'Left room successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/rooms/:id/layout
// @desc    Update room layout
// @access  Private
router.put('/:id/layout', [
  body('backgroundImage').optional().trim(),
  body('width').optional().isNumeric(),
  body('height').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const { backgroundImage, width, height } = req.body;
    if (backgroundImage !== undefined) room.layout.backgroundImage = backgroundImage;
    if (width !== undefined) room.layout.width = width;
    if (height !== undefined) room.layout.height = height;

    await room.save();

    res.json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete a room (soft delete for users, hard delete for super admin)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Check permissions
    const isCreator = room.createdBy === req.user.id || (typeof room.createdBy === 'object' && room.createdBy.id === req.user.id);
    const isSuperAdmin = req.user.role === 'superadmin';

    if (!isCreator && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this room' });
    }

    if (isSuperAdmin) {
      // Hard delete for super admin
      await room.hardDelete();
      res.json({
        success: true,
        message: 'Room permanently deleted'
      });
    } else {
      // Soft delete for regular users
      await room.softDelete();
      res.json({
        success: true,
        message: 'Room deleted (soft delete)'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

