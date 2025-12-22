const express = require('express');
const { body, validationResult } = require('express-validator');
const RoomInvitation = require('../models/RoomInvitation');
const User = require('../models/User');
const Room = require('../models/Room');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   POST /api/invitations/users
// @desc    Invite a user (super admin only)
// @access  Private (Super Admin)
router.post('/users', authorize('superadmin'), [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('department').optional().trim(),
  body('designation').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, name, password, department, designation } = req.body;

    // Check if user exists
    let user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      // Create new user
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        department: department || '',
        designation: designation || ''
      });
    }

    res.json({
      success: true,
      message: 'User invited successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        designation: user.designation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/invitations/rooms/:roomId
// @desc    Invite user to a room
// @access  Private
router.post('/rooms/:roomId', [
  body('userId').notEmpty().withMessage('User ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { roomId } = req.params;
    const { userId } = req.body;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Check if user has permission (must be room creator or super admin)
    if (room.createdBy !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to invite users to this room' });
    }

    // Check if invitation already exists
    const existingInvitation = await RoomInvitation.findInvitation(roomId, userId);
    if (existingInvitation) {
      if (existingInvitation.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'User is already a member of this room' });
      }
      // Update existing invitation to pending
      await existingInvitation.update({ status: 'pending' });
      return res.json({
        success: true,
        message: 'Invitation resent',
        invitation: existingInvitation
      });
    }

    // Create invitation
    const invitation = await RoomInvitation.create({
      roomId: parseInt(roomId),
      userId: parseInt(userId),
      invitedBy: req.user.id,
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'User invited to room',
      invitation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/invitations/rooms
// @desc    Get pending room invitations for current user
// @access  Private
router.get('/rooms', async (req, res) => {
  try {
    const invitations = await RoomInvitation.findByUser(req.user.id);
    res.json({
      success: true,
      invitations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/invitations/rooms/:invitationId/accept
// @desc    Accept room invitation
// @access  Private
router.put('/rooms/:invitationId/accept', async (req, res) => {
  try {
    const invitation = await RoomInvitation.findById(req.params.invitationId);
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await invitation.update({ status: 'accepted' });

    // Add user to room
    const room = await Room.findById(invitation.roomId);
    if (room) {
      await room.addParticipant(req.user.id);
    }

    res.json({
      success: true,
      message: 'Invitation accepted',
      room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/invitations/rooms/:invitationId/reject
// @desc    Reject room invitation
// @access  Private
router.put('/rooms/:invitationId/reject', async (req, res) => {
  try {
    const invitation = await RoomInvitation.findById(req.params.invitationId);
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await invitation.update({ status: 'rejected' });

    res.json({
      success: true,
      message: 'Invitation rejected'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

