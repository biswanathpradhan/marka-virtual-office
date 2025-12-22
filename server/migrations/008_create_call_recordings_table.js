/**
 * Migration: Create call_recordings table
 * Description: Creates the call_recordings table for storing call recording metadata
 */

const { query } = require('../config/database');

const up = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS call_recordings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      callId INT DEFAULT NULL,
      roomId INT NOT NULL,
      recordedBy INT NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      filePath TEXT NOT NULL,
      fileType ENUM('audio', 'video') NOT NULL,
      fileSize BIGINT DEFAULT 0,
      duration INT DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (recordedBy) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_roomId (roomId),
      INDEX idx_recordedBy (recordedBy),
      INDEX idx_createdAt (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log('✅ Created call_recordings table');
  } catch (error) {
    console.error('❌ Error creating call_recordings table:', error.message);
    throw error;
  }
};

const down = async () => {
  const sql = `DROP TABLE IF EXISTS call_recordings;`;
  try {
    await query(sql);
    console.log('✅ Dropped call_recordings table');
  } catch (error) {
    console.error('❌ Error dropping call_recordings table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

