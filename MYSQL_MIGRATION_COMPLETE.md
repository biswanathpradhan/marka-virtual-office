# MySQL Migration Complete ✅

## Summary

The application has been successfully migrated from MongoDB to MySQL. All database models, routes, and socket handlers have been updated to use MySQL with proper connection pooling and migration support.

## What Was Changed

### 1. Database Configuration
- **Created**: `server/config/database.js`
  - MySQL connection pool configuration
  - Database creation helper
  - Connection testing
  - Query helper functions

### 2. Migration Files
Created 6 migration files in `server/migrations/`:
- `001_create_users_table.js` - Users table
- `002_create_rooms_table.js` - Rooms table  
- `003_create_room_participants_table.js` - Room participants junction table
- `004_create_messages_table.js` - Messages table
- `005_create_calls_table.js` - Calls table
- `006_create_call_participants_table.js` - Call participants table

### 3. Migration Runners
- `runMigrations.js` - Runs all migrations in order
- `rollbackMigrations.js` - Rolls back all migrations

### 4. Updated Models
All models converted from Mongoose to MySQL:
- `server/models/User.js` - Now uses MySQL queries
- `server/models/Room.js` - Now uses MySQL queries
- `server/models/Message.js` - Now uses MySQL queries
- `server/models/Call.js` - Now uses MySQL queries

### 5. Updated Routes
All routes updated to use new MySQL models:
- `server/routes/auth.js`
- `server/routes/users.js`
- `server/routes/rooms.js`
- `server/routes/messages.js`
- `server/routes/files.js`
- `server/routes/admin.js`

### 6. Updated Middleware
- `server/middleware/auth.js` - Updated to use MySQL User model

### 7. Updated Socket Handlers
- `server/socket/socketHandler.js` - All database operations updated

### 8. Package Dependencies
- Removed: `mongoose`
- Added: `mysql2`

### 9. Environment Variables
Updated `.env.example` with MySQL configuration:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=node-office
```

## How to Use

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=node-office
```

### 3. Run Migrations
```bash
npm run migrate
```

This will:
- Create the `node-office` database
- Create all tables with proper relationships
- Set up indexes and foreign keys

### 4. Start Application
```bash
npm run dev
```

## Database Schema

### Tables
1. **users** - User accounts and profiles
2. **rooms** - Virtual office rooms
3. **room_participants** - Many-to-many: rooms ↔ users
4. **messages** - Chat messages and files
5. **calls** - Video/audio call records
6. **call_participants** - Call participants and settings

### Key Features
- Foreign key constraints for data integrity
- Indexes on frequently queried fields
- UTF8MB4 charset for full Unicode support
- InnoDB engine for transactions and foreign keys
- Auto-increment IDs
- Timestamps (createdAt, updatedAt)

## Migration Commands

### Run Migrations
```bash
npm run migrate
```

### Rollback Migrations
```bash
npm run migrate:rollback
```

**Warning**: Rollback will delete all tables and data!

## Verification

After running migrations, verify in MySQL:

```sql
USE node-office;
SHOW TABLES;
```

You should see all 6 tables listed.

## Notes

- All `_id` references changed to `id` (MySQL uses numeric IDs)
- Mongoose `.populate()` replaced with JOIN queries
- Model methods updated to use MySQL query syntax
- Connection pooling enabled for better performance
- Database automatically created if it doesn't exist

## Troubleshooting

### Connection Issues
- Verify MySQL is running
- Check credentials in `.env`
- Ensure user has CREATE DATABASE permission

### Migration Issues
- Run migrations in order (they're numbered)
- Check foreign key constraints
- Verify InnoDB engine is available

### Model Issues
- All models now return plain objects (not Mongoose documents)
- Use `.toJSON()` to exclude sensitive fields
- Update methods return updated objects

## Next Steps

1. Test all API endpoints
2. Test real-time features (Socket.io)
3. Verify file uploads work
4. Test user authentication
5. Check admin features

The application is now fully migrated to MySQL! 🎉

