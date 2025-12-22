/**
 * Migration: Add soft delete to rooms table
 * Description: Adds isDeleted field to rooms for soft deletion
 */

const { query } = require('../config/database');

const up = async () => {
  try {
    // Check if column already exists
    const [columns] = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'rooms' 
      AND COLUMN_NAME = 'isDeleted'
    `);

    if (columns && columns.length === 0) {
      await query(`
        ALTER TABLE rooms 
        ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE,
        ADD INDEX idx_isDeleted (isDeleted)
      `);
      console.log('✅ Added isDeleted column to rooms table');
    } else {
      console.log('ℹ️  isDeleted column already exists in rooms table');
    }
  } catch (error) {
    console.error('❌ Error adding isDeleted to rooms table:', error.message);
    throw error;
  }
};

const down = async () => {
  try {
    await query('ALTER TABLE rooms DROP COLUMN isDeleted');
    console.log('✅ Removed isDeleted column from rooms table');
  } catch (error) {
    console.error('❌ Error removing isDeleted from rooms table:', error.message);
    throw error;
  }
};

module.exports = { up, down };

