/**
 * Migration: Create rooms table
 * Description: Creates the rooms table for virtual office spaces
 */

const { query } = require('../config/database');

const up = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(500) DEFAULT NULL,
      type ENUM('office', 'meeting', 'private') DEFAULT 'office',
      createdBy INT NOT NULL,
      layout_backgroundImage TEXT DEFAULT NULL,
      layout_width INT DEFAULT 1920,
      layout_height INT DEFAULT 1080,
      settings_allowRecording BOOLEAN DEFAULT TRUE,
      settings_maxParticipants INT DEFAULT 50,
      isActive BOOLEAN DEFAULT TRUE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_createdBy (createdBy),
      INDEX idx_isActive (isActive),
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log('✅ Created rooms table');
  } catch (error) {
    console.error('❌ Error creating rooms table:', error.message);
    throw error;
  }
};

const down = async () => {
  const sql = `DROP TABLE IF EXISTS rooms;`;
  try {
    await query(sql);
    console.log('✅ Dropped rooms table');
  } catch (error) {
    console.error('❌ Error dropping rooms table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

