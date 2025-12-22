/**
 * Migration: Create calls table
 * Description: Creates the calls table for tracking video/audio calls
 */

const { query } = require('../config/database');

const up = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS calls (
      id INT AUTO_INCREMENT PRIMARY KEY,
      roomId INT NOT NULL,
      type ENUM('audio', 'video') DEFAULT 'video',
      status ENUM('active', 'ended', 'recording') DEFAULT 'active',
      recording_isRecording BOOLEAN DEFAULT FALSE,
      recording_recordingPath VARCHAR(500) DEFAULT NULL,
      recording_startedAt DATETIME DEFAULT NULL,
      recording_endedAt DATETIME DEFAULT NULL,
      startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      endedAt DATETIME DEFAULT NULL,
      duration INT DEFAULT NULL,
      INDEX idx_roomId (roomId),
      INDEX idx_status (status),
      INDEX idx_startedAt (startedAt),
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log('✅ Created calls table');
  } catch (error) {
    console.error('❌ Error creating calls table:', error.message);
    throw error;
  }
};

const down = async () => {
  const sql = `DROP TABLE IF EXISTS calls;`;
  try {
    await query(sql);
    console.log('✅ Dropped calls table');
  } catch (error) {
    console.error('❌ Error dropping calls table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

