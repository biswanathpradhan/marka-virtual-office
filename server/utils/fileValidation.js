const path = require('path');

// Allowed file types
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  // Documents
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain', 'text/csv',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  // Other
  'application/json', 'application/xml'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const validateFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    errors.push('File type not allowed');
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
  if (dangerousExtensions.includes(ext)) {
    errors.push('File extension not allowed for security reasons');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    return 'image';
  }
  if (mimetype.startsWith('video/')) {
    return 'video';
  }
  if (mimetype.startsWith('audio/')) {
    return 'audio';
  }
  return 'file';
};

module.exports = {
  validateFile,
  getFileType,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES
};

