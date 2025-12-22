# Quick Start Guide

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd node-office
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env` (or create `.env` manually)
   - Update the values as needed:
     ```env
     PORT=5000
     NODE_ENV=development
     CLIENT_URL=http://localhost:3000
     MONGODB_URI=mongodb://localhost:27017/virtual-office
     JWT_SECRET=your-secret-key-change-this
     JWT_EXPIRE=7d
     ```

4. **Start MongoDB**
   - Make sure MongoDB is running on your system
   - Default connection: `mongodb://localhost:27017`

5. **Run the application**
   ```bash
   # Development mode (runs both server and client)
   npm run dev
   
   # Or run separately:
   # Terminal 1: Backend
   npm run server
   
   # Terminal 2: Frontend
   npm run client
   ```

6. **Access the application**
   - Open your browser and go to: `http://localhost:3000`
   - Register a new account or login

## First User Setup

1. **Register an account**
   - Go to `/register`
   - Fill in your details
   - The first user can be manually set as superadmin in the database if needed

2. **Create a Super Admin** (Optional)
   ```javascript
   // In MongoDB shell or Compass
   db.users.updateOne(
     { email: "your-email@example.com" },
     { $set: { role: "superadmin" } }
   )
   ```

## Features to Test

### 1. Virtual Office Layout
- Users appear as avatars in the office
- Drag your avatar to move around
- Other users see your position in real-time

### 2. Video/Audio Calls
- Click "Start Call" to begin a video call
- Toggle camera on/off
- Toggle microphone on/off
- Switch between front/back camera (mobile)
- Record the call

### 3. Chat
- Send text messages
- Upload files (up to 25MB)
- Drag and drop files
- View message history

### 4. Profile Management
- Click your name in the header
- Update profile image, name, department, designation

### 5. Admin Features (Super Admin)
- View all messages: `/api/admin/messages`
- View all users: `/api/admin/users`
- View statistics: `/api/admin/stats`

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod` or check MongoDB service
- Verify connection string in `.env`
- Check MongoDB port (default: 27017)

### Port Already in Use
- Change `PORT` in `.env` file
- Or stop the process using the port

### CORS Errors
- Update `CLIENT_URL` in `.env` to match your frontend URL
- Ensure both server and client URLs are correct

### WebRTC Not Working
- WebRTC requires HTTPS in production
- For development, use `http://localhost` (works locally)
- Check browser permissions for camera/microphone

### File Upload Fails
- Check `server/uploads` directory exists and has write permissions
- Verify file size is under 25MB
- Check file type is allowed

## Development Tips

1. **Hot Reload**: Both server (nodemon) and client (React) support hot reload
2. **Database**: Use MongoDB Compass for easy database management
3. **Logs**: Check console for server logs and browser console for client logs
4. **Socket.io**: Use browser DevTools Network tab to monitor WebSocket connections

## Next Steps

- Read `README.md` for detailed documentation
- Check `SECURITY.md` for security best practices
- See `DEPLOYMENT.md` for production deployment guide
- Customize the office layout images
- Add more rooms and features as needed

## Support

For issues or questions:
1. Check the documentation files
2. Review error messages in console
3. Check MongoDB connection and data
4. Verify environment variables

