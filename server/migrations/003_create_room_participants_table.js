/**
 * Migration: Create room_participants table
 * Description: Creates junction table for many-to-many relationship between rooms and users
 */

const { query } = require('../config/database');

const up = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS room_participants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      roomId INT NOT NULL,
      userId INT NOT NULL,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_participant (roomId, userId),
      INDEX idx_roomId (roomId),
      INDEX idx_userId (userId),
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log('✅ Created room_participants table');
  } catch (error) {
    console.error('❌ Error creating room_participants table:', error.message);
    throw error;
  }
};

const down = async () => {
  const sql = `DROP TABLE IF EXISTS room_participants;`;
  try {
    await query(sql);
    console.log('✅ Dropped room_participants table');
  } catch (error) {
    console.error('❌ Error dropping room_participants table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

