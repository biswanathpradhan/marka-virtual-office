const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');
const Room = require('../models/Room');
const { authenticate } = require('../middleware/auth');
const { validateFile } = require('../utils/fileValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow all file types but check size in upload middleware
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: fileFilter
});

// @route   POST /api/files/upload
// @desc    Upload a file and create a message
// @access  Private
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate file
    const validation = validateFile(req.file);
    if (!validation.valid) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: validation.errors.join(', ') });
    }

    const { room } = req.body;
    if (!room) {
      // Delete uploaded file if room is not provided
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Room ID is required' });
    }

    // Verify room exists
    const roomDoc = await Room.findById(room);
    if (!roomDoc) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Determine message type based on file mime type
    let messageType = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    }

    // Create message with file info
    const message = await Message.create({
      roomId: room,
      senderId: req.user.id,
      type: messageType,
      file: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    const populatedMessage = await Message.findById(message.id);

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    // Delete file if message creation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/files/:filename
// @desc    Download a file
// @access  Private
router.get('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Verify user has access to the file (by checking if they're in the room)
    const message = await Message.findOne({ 'file.fileName': filename });
    if (message) {
      const room = await Room.findById(message.room);
      if (room && !room.participants.includes(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

