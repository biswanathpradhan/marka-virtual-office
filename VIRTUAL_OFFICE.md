# Virtual Office Feature Documentation

## Overview

The Virtual Office feature provides an interactive, real-time digital workspace where users can see other participants live, manage their availability and settings, and communicate through audio and video calls.

## Features Implemented

### ✅ Core Features
- **Real-time Presence Visibility** - See who's online, their status, and position in the workspace
- **Interactive Workspace** - Click-to-move avatars on a shared canvas
- **Audio/Video Communication** - WebRTC-based peer-to-peer communication
- **User Controls** - Toggle audio/video, manage device settings
- **Room Management** - Create, join, and leave virtual rooms
- **User Settings** - Save preferred camera, microphone, and speaker preferences

### ✅ Technical Features
- **Real-time Broadcasting** - Laravel Echo with Pusher for live updates
- **WebRTC Integration** - Peer-to-peer audio/video streaming
- **Secure Connections** - Authentication-based access control
- **Scalable Architecture** - Ready for multiple rooms and group interactions

## Database Structure

### Tables
- `rooms` - Virtual office rooms
- `presences` - User presence tracking with position and status
- `user_settings` - User preferences for audio/video devices
- `room_participants` - Room membership tracking

## API Endpoints

### Virtual Office
- `GET /api/virtual-office/rooms` - List all available rooms
- `POST /api/virtual-office/rooms` - Create a new room
- `GET /api/virtual-office/rooms/{room}` - Get room details
- `POST /api/virtual-office/rooms/{room}/join` - Join a room
- `POST /api/virtual-office/rooms/{room}/leave` - Leave a room
- `PUT /api/virtual-office/rooms/{room}/presence` - Update presence
- `GET /api/virtual-office/rooms/{room}/presences` - Get all presences

### WebRTC
- `GET /api/webrtc/ice-servers` - Get STUN/TURN servers
- `POST /api/webrtc/rooms/{room}/offer` - Send WebRTC offer
- `POST /api/webrtc/rooms/{room}/answer` - Send WebRTC answer
- `POST /api/webrtc/rooms/{room}/ice-candidate` - Send ICE candidate

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings

## Real-time Events

### Broadcast Channels
- `room.{roomId}` - Room-specific events
- `user.{userId}` - User-specific WebRTC events

### Events
- `user.joined` - When a user joins a room
- `user.left` - When a user leaves a room
- `presence.updated` - When a user's presence is updated
- `webrtc.offer` - WebRTC offer signal
- `webrtc.answer` - WebRTC answer signal
- `webrtc.ice-candidate` - ICE candidate signal

## Setup Instructions

### 1. Install Dependencies
```bash
composer install
npm install
```

### 2. Configure Environment
Update `.env` file:
```env
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-app-key
PUSHER_APP_SECRET=your-app-secret
PUSHER_APP_CLUSTER=mt1
```

### 3. Run Migrations
```bash
php artisan migrate
```

### 4. Start Development Servers
```bash
# Terminal 1: Vite dev server
npm run dev

# Terminal 2: Laravel server
php artisan serve
```

### 5. Access Virtual Office
Navigate to `/virtual-office/{roomId}` after authentication.

## Usage

### Creating a Room
```bash
POST /api/virtual-office/rooms
{
    "name": "Main Office",
    "description": "Our main virtual office space",
    "is_public": true,
    "max_participants": 50
}
```

### Joining a Room
Navigate to `/virtual-office/{roomId}` or use the API:
```bash
POST /api/virtual-office/rooms/{roomId}/join
```

## Requirements

- PHP >= 8.1
- Laravel 10
- Node.js >= 16.x
- Pusher account (for WebSocket broadcasting)
- HTTPS (required for WebRTC in production)

## Security Considerations

1. **Authentication** - All routes require authentication via Laravel Sanctum
2. **Authorization** - Room access is controlled via `canJoin()` method
3. **HTTPS** - Required for WebRTC to work properly
4. **CORS** - Configure CORS settings in `config/cors.php`

## Future Enhancements

- Multiple rooms support
- Screen sharing
- Text chat
- File sharing
- Recording capabilities
- Breakout rooms
- Whiteboard collaboration
- Custom avatars and themes

