# Virtual Office - Real-time Collaboration Platform

A comprehensive virtual office solution with real-time video/audio calls, chat, file sharing, and virtual office layout.

## Features

### Core Features
- ✅ Real-time video and audio calls (1-on-1 and group)
- ✅ Microsoft Teams-like layout with camera on/off
- ✅ Call recording capabilities (audio and video)
- ✅ Clear audio with echo cancellation
- ✅ Works across any network (not just local)
- ✅ Chat with file sharing (up to 25MB, drag-and-drop)
- ✅ Messages cannot be deleted (stored permanently)
- ✅ Customizable office layout with images
- ✅ User positioning in virtual office (real-time movement)
- ✅ Profile management (image, department, designation, name)
- ✅ Mobile support with front/back camera switching
- ✅ Security features (penetration testing ready)
- ✅ iframe integration support
- ✅ Real-time communication for work-from-home employees

### Admin Features
- ✅ Super admin account (created automatically)
- ✅ Super admin can create and delete all rooms
- ✅ Super admin can remove users (hard delete)
- ✅ Super admin can view all chat messages and files
- ✅ Super admin can filter messages by date and room
- ✅ User invitation system (no public registration)

### User Management
- ✅ Users can only see rooms they're invited to
- ✅ Users can create new rooms
- ✅ Users can delete their own rooms (soft delete)
- ✅ Super admin can see soft-deleted rooms for data access
- ✅ Password change option in profile
- ✅ Leave room functionality with cleanup

### UI Features
- ✅ Draggable video panel (can be moved anywhere)
- ✅ Toggle video panel on/off
- ✅ Minimize/maximize video panel
- ✅ Room manager for easy room switching
- ✅ Admin panel for super admin management

## Tech Stack

### Backend
- Node.js + Express
- Socket.io for real-time communication
- WebRTC for peer-to-peer video/audio
- MySQL 8.0+ with mysql2/promise
- JWT authentication
- Multer for file uploads
- Security: Helmet, CORS, Rate Limiting
- Database migrations system

### Frontend
- React
- Socket.io-client
- WebRTC APIs (simple-peer)
- React-draggable for UI elements
- React-dropzone for file uploads
- Responsive design for mobile

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd node-office
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Set up MySQL**
   - Install MySQL 8.0+ if not already installed
   - Start MySQL service:
     ```bash
     # Linux/Mac
     sudo systemctl start mysql
     
     # Windows
     net start MySQL80
     ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=node-office
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRE=7d
   MAX_FILE_SIZE=26214400
   UPLOAD_DIR=./server/uploads
   RECORDINGS_DIR=./server/recordings
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```
   
   This creates:
   - Database `node-office`
   - All required tables
   - Super admin account (email: `admin@virtualoffice.com`, password: `Admin@123`)

6. **Create required directories**
   ```bash
   mkdir -p server/uploads server/recordings
   ```

7. **Run the application**
   ```bash
   npm run dev
   ```
   
   The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Quick Start (Development)

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd node-office
   npm run install-all
   ```

2. **Configure MySQL**
   - Ensure MySQL is running
   - Update `.env` with your MySQL credentials

3. **Run migrations**
   ```bash
   npm run migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Login as super admin**
   - Email: `admin@virtualoffice.com`
   - Password: `Admin@123`
   - ⚠️ Change password immediately!

## Database

The application uses **MySQL 8.0+**. 

### Database Setup

1. **Install MySQL** (if not already installed)
2. **Create database user** (optional, can use root):
   ```sql
   CREATE USER 'nodeoffice'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON `node-office`.* TO 'nodeoffice'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Run migrations**:
   ```bash
   npm run migrate
   ```

### Database Schema

The migration system creates the following tables:
- `users` - User accounts and profiles
- `rooms` - Virtual office rooms
- `room_participants` - Room membership
- `room_invitations` - Room access invitations
- `messages` - Chat messages (non-deletable)
- `calls` - Call records
- `call_participants` - Call participants
- `call_recordings` - Call recording metadata

### Super Admin Account

After running migrations, a super admin account is automatically created:
- **Email**: `admin@virtualoffice.com`
- **Password**: `Admin@123`
- **Role**: `superadmin`

⚠️ **IMPORTANT**: Change this password immediately after first login!

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/profile` - Update profile (password for users, email for super admin)
- `PUT /api/users/position` - Update position in office

### Rooms
- `GET /api/rooms` - Get all rooms (filtered by invitations)
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms` - Create room
- `DELETE /api/rooms/:id` - Delete room (soft delete for users, hard delete for super admin)
- `PUT /api/rooms/:id/join` - Join room
- `PUT /api/rooms/:id/leave` - Leave room
- `PUT /api/rooms/:id/layout` - Update room layout

### Messages
- `GET /api/messages/:roomId` - Get messages for a room
- `POST /api/messages` - Send message

### Files
- `POST /api/files/upload` - Upload file (max 25MB)
- `GET /api/files/:filename` - Download file

### Admin (Super Admin Only)
- `GET /api/admin/messages` - Get all messages (with filters)
- `GET /api/admin/rooms/:roomId/messages` - Get messages for a room (includes deleted)
- `GET /api/admin/users` - Get all users
- `DELETE /api/admin/users/:id` - Delete user (hard delete)
- `DELETE /api/admin/rooms` - Delete all rooms
- `GET /api/admin/stats` - Get platform statistics

### Invitations
- `POST /api/invitations/users` - Invite new user (super admin)
- `POST /api/invitations/rooms/:roomId` - Invite user to room
- `GET /api/invitations/rooms` - Get pending invitations
- `PUT /api/invitations/rooms/:invitationId/accept` - Accept invitation
- `PUT /api/invitations/rooms/:invitationId/reject` - Reject invitation

## Socket.io Events

### Client → Server
- `room:join` - Join a room
- `room:leave` - Leave a room
- `user:position-update` - Update user position
- `call:offer` - WebRTC offer
- `call:answer` - WebRTC answer
- `call:ice-candidate` - ICE candidate
- `user:media-toggle` - Toggle video/audio
- `message:send` - Send message
- `room:scroll-update` - Update scroll position

### Server → Client
- `users:online` - Online users list
- `room:joined` - Room joined confirmation
- `room:user-joined` - User joined room
- `room:user-left` - User left room
- `user:position-changed` - User position updated
- `user:profile-changed` - User profile updated
- `call:offer` - Incoming call offer
- `call:answer` - Call answer received
- `call:ice-candidate` - ICE candidate received
- `user:media-started` - User started media
- `user:media-stopped` - User stopped media
- `user:media-toggled` - Media toggled
- `message:new` - New message received
- `room:scroll-changed` - Scroll position changed

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet.js for security headers
- Input validation with express-validator
- CORS configuration
- File upload size limits (25MB)
- SQL injection prevention (prepared statements)
- XSS protection
- CSRF protection ready
- Trust proxy configuration for rate limiting

## Mobile Support

- Responsive design
- Front/back camera switching
- Touch-optimized controls
- Mobile WebRTC support
- Process polyfill for browser compatibility

## iframe Integration

The application can be embedded in existing applications using an iframe:

```html
<iframe 
  src="https://your-domain.com" 
  width="100%" 
  height="800px"
  allow="camera; microphone; fullscreen; autoplay"
  frameborder="0"
  style="border: none;">
</iframe>
```

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions.

### Quick Deployment

For production deployment:

```bash
# Install dependencies
npm run install-all

# Run migrations
npm run migrate

# Build React app
npm run build

# Start with PM2
pm2 start server/index.js --name virtual-office
pm2 save
```

Or use the deployment script (Linux/Mac):
```bash
chmod +x deploy.sh
./deploy.sh production
```

## Development Scripts

- `npm run dev` - Start development server (both frontend and backend)
- `npm run server` - Start backend server only
- `npm run client` - Start frontend development server only
- `npm run build` - Build React app for production
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run migrate:rollback` - Rollback migrations
- `npm run install-all` - Install all dependencies (root + client)

## Troubleshooting

### Common Issues

1. **MySQL connection error**
   - Check MySQL service is running
   - Verify credentials in `.env`
   - Check MySQL user permissions

2. **Migration errors**
   - Ensure MySQL 8.0+ is installed
   - Verify database user has CREATE privileges
   - Check migration logs

3. **WebRTC not working**
   - Ensure HTTPS is enabled (required for WebRTC)
   - Check browser console for errors
   - Verify STUN/TURN server configuration

4. **Socket.io connection issues**
   - Check nginx proxy configuration
   - Verify WebSocket upgrade headers
   - Check firewall rules

5. **File upload fails**
   - Check uploads directory exists and has permissions
   - Verify disk space
   - Check MAX_FILE_SIZE in `.env`

## License

MIT
