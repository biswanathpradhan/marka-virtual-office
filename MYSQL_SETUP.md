# MySQL Database Setup Guide

## Prerequisites

- MySQL or MariaDB installed (Laragon includes MySQL)
- Node.js installed
- Database user with appropriate permissions

## Configuration

### 1. Environment Variables

Update your `.env` file with MySQL configuration:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=node-office
```

**Note**: If using Laragon with default settings, the password is usually empty:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=node-office
```

### 2. Install Dependencies

```bash
npm install
```

This will install `mysql2` package for MySQL connectivity.

## Running Migrations

### Create Database and Tables

Run all migrations to create the database and all tables:

```bash
npm run migrate
```

This will:
1. Create the `node-office` database if it doesn't exist
2. Create all required tables in the correct order
3. Set up foreign key relationships
4. Create necessary indexes

### Migration Files

The migrations are located in `server/migrations/`:

1. `001_create_users_table.js` - Users table
2. `002_create_rooms_table.js` - Rooms table
3. `003_create_room_participants_table.js` - Room participants junction table
4. `004_create_messages_table.js` - Messages table
5. `005_create_calls_table.js` - Calls table
6. `006_create_call_participants_table.js` - Call participants table

### Rollback Migrations

To rollback all migrations (drop all tables):

```bash
npm run migrate:rollback
```

**Warning**: This will delete all data!

## Database Schema

### Tables Created

1. **users** - User accounts and profiles
2. **rooms** - Virtual office rooms
3. **room_participants** - Many-to-many relationship between rooms and users
4. **messages** - Chat messages and file uploads
5. **calls** - Video/audio call records
6. **call_participants** - Call participants and their settings

### Table Relationships

```
users (1) ──< (many) room_participants (many) >── (1) rooms
users (1) ──< (many) messages
rooms (1) ──< (many) messages
rooms (1) ──< (many) calls
users (1) ──< (many) call_participants (many) >── (1) calls
```

## Manual Database Setup (Alternative)

If you prefer to set up the database manually:

1. **Create Database**:
   ```sql
   CREATE DATABASE `node-office` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Run Migrations Manually**:
   - Open MySQL command line or phpMyAdmin
   - Select the `node-office` database
   - Run each migration file's SQL in order

## Verification

After running migrations, verify the setup:

```sql
USE node-office;
SHOW TABLES;
```

You should see:
- users
- rooms
- room_participants
- messages
- calls
- call_participants

## Troubleshooting

### Connection Error

If you get a connection error:
1. Check MySQL is running
2. Verify credentials in `.env`
3. Check MySQL port (default: 3306)
4. Ensure user has CREATE DATABASE permission

### Foreign Key Errors

If you get foreign key constraint errors:
- Make sure migrations run in order
- Check that referenced tables exist
- Verify table engine is InnoDB (required for foreign keys)

### Permission Errors

If you get permission errors:
```sql
GRANT ALL PRIVILEGES ON node-office.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## Connection File

The database connection is configured in `server/config/database.js`:

- Uses connection pooling for better performance
- Automatically creates database if it doesn't exist
- Handles connection errors gracefully
- Supports keep-alive connections

## Model Files

All models have been updated to use MySQL:
- `server/models/User.js`
- `server/models/Room.js`
- `server/models/Message.js`
- `server/models/Call.js`

Models use the `query()` helper from the database config for all database operations.

