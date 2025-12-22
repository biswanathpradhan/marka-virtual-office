const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');
const Call = require('../models/Call');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

// @route   GET /api/admin/messages
// @desc    Get all messages (super admin only) - messages cannot be deleted
// @access  Private (SuperAdmin)
router.get('/messages', authorize('superadmin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const { roomId, userId, search } = req.query;

    let result;
    if (roomId) {
      result = await Message.findByRoom(roomId, page, limit);
    } else if (userId) {
      // Get messages by user
      const { query } = require('../config/database');
      const sql = `
        SELECT m.*, 
          u.id as sender_id, u.name as sender_name, u.email as sender_email, 
          u.profileImage as sender_profileImage, u.department as sender_department, 
          u.designation as sender_designation,
          r.id as room_id, r.name as room_name, r.type as room_type
        FROM messages m
        JOIN users u ON m.senderId = u.id
        JOIN rooms r ON m.roomId = r.id
        WHERE m.senderId = ? AND m.isDeleted = FALSE
        ORDER BY m.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      const offset = (page - 1) * limit;
      const rows = await query(sql, [userId, limit, offset]);
      
      const messages = rows.map(row => {
        const message = new Message(row);
        message.sender = {
          id: row.sender_id,
          name: row.sender_name,
          email: row.sender_email,
          profileImage: row.sender_profileImage,
          department: row.sender_department,
          designation: row.sender_designation
        };
        message.room = {
          id: row.room_id,
          name: row.room_name,
          type: row.room_type
        };
        return message;
      });

      const countRows = await query('SELECT COUNT(*) as total FROM messages WHERE senderId = ? AND isDeleted = FALSE', [userId]);
      const total = countRows && countRows[0] ? countRows[0].total : 0;

      result = {
        messages,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      };
    } else {
      result = await Message.findAll(page, limit);
    }

    res.json({
      success: true,
      messages: result.messages,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      total: result.total
    });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/rooms/:roomId/messages
// @desc    Get all messages for a specific room (super admin) - includes deleted messages
// @access  Private (SuperAdmin)
router.get('/rooms/:roomId/messages', authorize('superadmin'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;

    // Super admin can see deleted messages
    const result = await Message.findByRoom(roomId, page, limit, true);

    res.json({
      success: true,
      messages: result.messages,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      total: result.total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with stats
// @access  Private (Admin/SuperAdmin)
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Private (Admin/SuperAdmin)
router.get('/stats', async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    const [userCount] = await query('SELECT COUNT(*) as total FROM users');
    const [onlineCount] = await query('SELECT COUNT(*) as total FROM users WHERE isOnline = TRUE');
    const [roomCount] = await query('SELECT COUNT(*) as total FROM rooms WHERE isActive = TRUE');
    const totalMessages = await Message.count();
    const totalCalls = await Call.count();

    res.json({
      success: true,
      stats: {
        totalUsers: userCount.total,
        onlineUsers: onlineCount.total,
        totalRooms: roomCount.total,
        totalMessages,
        totalCalls
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user (super admin only - hard delete)
// @access  Private (SuperAdmin)
router.delete('/users/:id', authorize('superadmin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent deleting self
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hard delete user
    const { query } = require('../config/database');
    await query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'User permanently deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/admin/rooms
// @desc    Delete all rooms (super admin only)
// @access  Private (SuperAdmin)
router.delete('/rooms', authorize('superadmin'), async (req, res) => {
  try {
    const { query } = require('../config/database');
    await query('DELETE FROM rooms');
    
    res.json({
      success: true,
      message: 'All rooms deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

