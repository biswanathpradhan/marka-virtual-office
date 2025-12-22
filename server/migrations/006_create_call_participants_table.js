/**
 * Migration: Create call_participants table
 * Description: Creates table for tracking call participants and their settings
 */

const { query } = require('../config/database');

const up = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS call_participants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      callId INT NOT NULL,
      userId INT NOT NULL,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      leftAt DATETIME DEFAULT NULL,
      isVideoEnabled BOOLEAN DEFAULT TRUE,
      isAudioEnabled BOOLEAN DEFAULT TRUE,
      INDEX idx_callId (callId),
      INDEX idx_userId (userId),
      FOREIGN KEY (callId) REFERENCES calls(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log('✅ Created call_participants table');
  } catch (error) {
    console.error('❌ Error creating call_participants table:', error.message);
    throw error;
  }
};

const down = async () => {
  const sql = `DROP TABLE IF EXISTS call_participants;`;
  try {
    await query(sql);
    console.log('✅ Dropped call_participants table');
  } catch (error) {
    console.error('❌ Error dropping call_participants table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

