/**
 * Migration Runner
 * Runs all migrations in order
 */

const { createDatabase, testConnection } = require('../config/database');
const fs = require('fs');
const path = require('path');

const runMigrations = async () => {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Create database if it doesn't exist
    await createDatabase();

    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Get all migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && file !== 'runMigrations.js')
      .sort();

    console.log(`\n📋 Found ${files.length} migration(s) to run\n`);

    // Run each migration
    for (const file of files) {
      const migration = require(path.join(migrationsDir, file));
      if (migration.up) {
        console.log(`Running: ${file}...`);
        await migration.up();
      }
    }

    console.log('\n✅ All migrations completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
};

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runMigrations };

