/**
 * Migration: Create users table
 * Description: Creates the users table with all required fields
 */

const { query, pool } = require('../config/database');

const up = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      profileImage TEXT DEFAULT NULL,
      department VARCHAR(100) DEFAULT NULL,
      designation VARCHAR(100) DEFAULT NULL,
      role ENUM('user', 'admin', 'superadmin') DEFAULT 'user',
      isOnline BOOLEAN DEFAULT FALSE,
      lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
      currentRoom INT DEFAULT NULL,
      position_x DECIMAL(10, 2) DEFAULT 0,
      position_y DECIMAL(10, 2) DEFAULT 0,
      socketId VARCHAR(255) DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_role (role),
      INDEX idx_isOnline (isOnline),
      INDEX idx_currentRoom (currentRoom)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log('✅ Created users table');
  } catch (error) {
    console.error('❌ Error creating users table:', error.message);
    throw error;
  }
};

const down = async () => {
  const sql = `DROP TABLE IF EXISTS users;`;
  try {
    await query(sql);
    console.log('✅ Dropped users table');
  } catch (error) {
    console.error('❌ Error dropping users table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

