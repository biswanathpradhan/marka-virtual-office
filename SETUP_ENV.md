# Environment Variables Setup Guide

## Quick Setup

1. **Copy the template file:**
   ```bash
   # Windows PowerShell
   Copy-Item env.template .env
   
   # Linux/Mac
   cp env.template .env
   ```

2. **Edit the `.env` file** and update these required values:
   - `DB_PASSWORD` - Your MySQL password
   - `JWT_SECRET` - Generate a strong secret (see below)
   - `CLIENT_URL` - Your frontend URL (for production)

3. **Generate JWT Secret** (for production):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste it as `JWT_SECRET` in your `.env` file.

## Required Variables

All variables are already defined in `env.template`. You only need to **update the values**, not add new variables.

### Must Update:
- `DB_PASSWORD` - Your MySQL root password (or dedicated user password)
- `JWT_SECRET` - Strong random string (especially for production)

### Optional Updates:
- `PORT` - Default: 5000 (change if port is in use)
- `DB_HOST` - Default: localhost (change for remote MySQL)
- `DB_USER` - Default: root (use dedicated user in production)
- `DB_NAME` - Default: node-office (change if needed)
- `CLIENT_URL` - Update for production domain
- `NODE_ENV` - Set to "production" for production

### Already Configured (No Changes Needed):
- `DB_PORT` - 3306 (standard MySQL port)
- `JWT_EXPIRE` - 7d (7 days)
- `MAX_FILE_SIZE` - 26214400 (25MB)
- `UPLOAD_DIR` - ./server/uploads
- `RECORDINGS_DIR` - ./server/recordings

## After Setup

1. **Create directories:**
   ```bash
   mkdir -p server/uploads server/recordings
   ```

2. **Run migrations:**
   ```bash
   npm run migrate
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

## Security Notes

- **Never commit `.env` file** to version control
- `.env` is already in `.gitignore`
- Use strong passwords in production
- Generate a new `JWT_SECRET` for each environment
- Use a dedicated MySQL user (not root) in production

