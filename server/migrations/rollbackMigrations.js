/**
 * Migration Rollback
 * Rolls back all migrations in reverse order
 */

const { testConnection } = require('../config/database');
const fs = require('fs');
const path = require('path');

const rollbackMigrations = async () => {
  try {
    console.log('🔄 Rolling back database migrations...\n');

    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Get all migration files in reverse order
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && 
        file !== 'runMigrations.js' && 
        file !== 'rollbackMigrations.js')
      .sort()
      .reverse();

    console.log(`\n📋 Found ${files.length} migration(s) to rollback\n`);

    // Rollback each migration
    for (const file of files) {
      const migration = require(path.join(migrationsDir, file));
      if (migration.down) {
        console.log(`Rolling back: ${file}...`);
        await migration.down();
      }
    }

    console.log('\n✅ All migrations rolled back successfully!\n');
  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    process.exit(1);
  }
};

// Run rollback if called directly
if (require.main === module) {
  rollbackMigrations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { rollbackMigrations };

