const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', async (req, res) => {
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

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile (password for users, email for super admin)
// @access  Private
router.put('/profile', [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('department').optional().trim(),
  body('designation').optional().trim(),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, department, designation, profileImage, email, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (designation !== undefined) updateData.designation = designation;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    
    // Super admin can change email, regular users can change password
    if (req.user.role === 'superadmin' && email) {
      // Check if email is already taken
      const existingUser = await User.findByEmail(email.toLowerCase());
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      updateData.email = email.toLowerCase();
    } else if (password && req.user.role !== 'superadmin') {
      // Regular users can change password
      updateData.password = password;
    }

    const updatedUser = await user.update(updateData);

    res.json({
      success: true,
      user: updatedUser.toJSON()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/position
// @desc    Update user position in office
// @access  Private
router.put('/position', [
  body('x').custom((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (isNaN(num)) {
      throw new Error('X position must be a number');
    }
    return true;
  }),
  body('y').custom((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (isNaN(num)) {
      throw new Error('Y position must be a number');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Ensure x and y are numbers
    const x = typeof req.body.x === 'string' ? parseFloat(req.body.x) : Number(req.body.x);
    const y = typeof req.body.y === 'string' ? parseFloat(req.body.y) : Number(req.body.y);
    
    if (isNaN(x) || isNaN(y)) {
      return res.status(400).json({ success: false, message: 'X and Y positions must be valid numbers' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updatedUser = await user.update({ position: { x, y } });

    res.json({
      success: true,
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

