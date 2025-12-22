# Virtual Office - Real-time Collaboration Platform

A comprehensive virtual office solution with real-time video/audio calls, chat, file sharing, and virtual office layout.

## Features

- ✅ Real-time video and audio calls (1-on-1 and group)
- ✅ Microsoft Teams-like layout with camera on/off
- ✅ Call recording capabilities
- ✅ Clear audio with echo cancellation
- ✅ Works across any network (not just local)
- ✅ Chat with file sharing (up to 25MB)
- ✅ Messages cannot be deleted (stored in database)
- ✅ Super admin can view all messages
- ✅ Customizable office layout with images
- ✅ User positioning in virtual office (real-time movement)
- ✅ Profile management (image, department, designation, name)
- ✅ Mobile support with front/back camera switching
- ✅ Security features (penetration testing ready)
- ✅ iframe integration support
- ✅ Real-time communication for work-from-home employees

## Tech Stack

### Backend
- Node.js + Express
- Socket.io for real-time communication
- WebRTC for peer-to-peer video/audio
- MongoDB with Mongoose
- JWT authentication
- Multer for file uploads
- Security: Helmet, CORS, Rate Limiting

### Frontend
- React
- Socket.io-client
- WebRTC APIs
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

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
Make sure MongoDB is running on your system.

5. **Run the application**
```bash
# Development mode (runs both server and client)
npm run dev

# Or run separately:
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

## Environment Variables

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/virtual-office
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/position` - Update position in office

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id/join` - Join room
- `PUT /api/rooms/:id/leave` - Leave room
- `PUT /api/rooms/:id/layout` - Update room layout

### Messages
- `GET /api/messages/:roomId` - Get messages
- `POST /api/messages` - Send message

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:filename` - Download file

### Admin
- `GET /api/admin/messages` - Get all messages (super admin)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get platform statistics

## Socket.io Events

### Client → Server
- `room:join` - Join a room
- `room:leave` - Leave a room
- `user:position-update` - Update user position
- `call:offer` - WebRTC offer
- `call:answer` - WebRTC answer
- `call:ice-candidate` - ICE candidate
- `call:start` - Start a call
- `call:end` - End a call
- `call:join` - Join a call
- `call:media-toggle` - Toggle video/audio
- `message:send` - Send message

### Server → Client
- `users:online` - Online users list
- `room:joined` - Room joined confirmation
- `room:user-joined` - User joined room
- `room:user-left` - User left room
- `user:position-changed` - User position updated
- `call:offer` - Incoming call offer
- `call:answer` - Call answer received
- `call:ice-candidate` - ICE candidate received
- `call:started` - Call started
- `call:ended` - Call ended
- `call:user-joined` - User joined call
- `call:media-toggled` - Media toggled
- `message:new` - New message received

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet.js for security headers
- Input validation with express-validator
- CORS configuration
- File upload size limits
- SQL injection prevention (MongoDB)
- XSS protection
- CSRF protection ready

## Mobile Support

- Responsive design
- Front/back camera switching
- Touch-optimized controls
- Mobile WebRTC support

## iframe Integration

The application can be embedded in existing applications using an iframe:

```html
<iframe 
  src="https://your-domain.com" 
  width="100%" 
  height="800px"
  allow="camera; microphone; fullscreen"
  frameborder="0">
</iframe>
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Update `JWT_SECRET` with a strong random string
3. Configure MongoDB connection string
4. Set up HTTPS
5. Build the React app: `npm run build`
6. Use a process manager like PM2
7. Set up reverse proxy (nginx)

## License

MIT

