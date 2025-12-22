/**
 * Migration: Create room_invitations table
 * Description: Creates the room_invitations table for managing room access
 */

const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const up = async () => {
  // Create room_invitations table
  const sql = `
    CREATE TABLE IF NOT EXISTS room_invitations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      roomId INT NOT NULL,
      userId INT NOT NULL,
      invitedBy INT NOT NULL,
      status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_invitation (roomId, userId),
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invitedBy) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_roomId (roomId),
      INDEX idx_userId (userId),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log('✅ Created room_invitations table');
  } catch (error) {
    console.error('❌ Error creating room_invitations table:', error.message);
    throw error;
  }

  // Create super admin user if not exists
  try {
    const [existingAdmin] = await query('SELECT id FROM users WHERE email = ?', ['admin@virtualoffice.com']);
    
    if (!existingAdmin || existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await query(
        `INSERT INTO users (name, email, password, role, department, designation) 
         VALUES (?, ?, ?, 'superadmin', 'Administration', 'Super Administrator')`,
        ['Super Admin', 'admin@virtualoffice.com', hashedPassword]
      );
      console.log('✅ Created super admin user (email: admin@virtualoffice.com, password: Admin@123)');
    } else {
      console.log('ℹ️  Super admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating super admin user:', error.message);
    // Don't throw - this is not critical for migration
  }
};

const down = async () => {
  const sql = `DROP TABLE IF EXISTS room_invitations;`;
  try {
    await query(sql);
    console.log('✅ Dropped room_invitations table');
  } catch (error) {
    console.error('❌ Error dropping room_invitations table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

