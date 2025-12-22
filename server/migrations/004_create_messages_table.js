/**
 * Migration: Create messages table
 * Description: Creates the messages table for chat functionality
 */

const { query } = require('../config/database');

const up = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      roomId INT NOT NULL,
      senderId INT NOT NULL,
      content TEXT DEFAULT NULL,
      type ENUM('text', 'file', 'image', 'system') DEFAULT 'text',
      file_originalName VARCHAR(255) DEFAULT NULL,
      file_fileName VARCHAR(255) DEFAULT NULL,
      file_filePath VARCHAR(500) DEFAULT NULL,
      file_fileSize BIGINT DEFAULT NULL,
      file_mimeType VARCHAR(100) DEFAULT NULL,
      isDeleted BOOLEAN DEFAULT FALSE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_roomId (roomId),
      INDEX idx_senderId (senderId),
      INDEX idx_createdAt (createdAt),
      INDEX idx_type (type),
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log('✅ Created messages table');
  } catch (error) {
    console.error('❌ Error creating messages table:', error.message);
    throw error;
  }
};

const down = async () => {
  const sql = `DROP TABLE IF EXISTS messages;`;
  try {
    await query(sql);
    console.log('✅ Dropped messages table');
  } catch (error) {
    console.error('❌ Error dropping messages table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

