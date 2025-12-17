<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Rooms - Virtual Office</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
            margin: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 2rem;
        }
        .btn {
            padding: 0.75rem 1.5rem;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: bold;
            transition: transform 0.2s;
            display: inline-block;
        }
        .btn:hover {
            transform: scale(1.05);
        }
        .btn-danger {
            background: #e24a4a;
            color: white;
        }
        .rooms-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        .room-card {
            background: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s;
        }
        .room-card:hover {
            transform: translateY(-5px);
        }
        .room-card h3 {
            margin: 0 0 0.5rem 0;
            color: #333;
        }
        .room-card p {
            color: #666;
            margin: 0.5rem 0;
            font-size: 0.9rem;
        }
        .room-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
        }
        .room-actions {
            display: flex;
            gap: 0.5rem;
        }
        .btn-small {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
        }
        .empty-state {
            text-align: center;
            color: white;
            padding: 4rem 2rem;
        }
        .empty-state h2 {
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 Virtual Office Rooms</h1>
            <div>
                <a href="{{ route('rooms.create') }}" class="btn">+ Create Room</a>
                <form method="POST" action="{{ route('logout') }}" style="display: inline-block; margin-left: 1rem;">
                    @csrf
                    <button type="submit" class="btn btn-danger">Logout</button>
                </form>
            </div>
        </div>

        @if(session('error'))
            <div style="background: #e24a4a; color: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                {{ session('error') }}
            </div>
        @endif

        @if(session('success'))
            <div style="background: #4a90e2; color: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                {{ session('success') }}
            </div>
        @endif

        @if($rooms->count() > 0)
            <div class="rooms-grid">
                @foreach($rooms as $room)
                    <div class="room-card">
                        <h3>{{ $room->name }}</h3>
                        @if($room->description)
                            <p>{{ $room->description }}</p>
                        @endif
                        <div class="room-meta">
                            <div>
                                <small style="color: #999;">
                                    👥 {{ $room->activePresences->count() }}/{{ $room->max_participants }} participants
                                </small>
                            </div>
                            <div class="room-actions">
                                <a href="{{ route('virtual-office', $room->id) }}" class="btn btn-small">Join</a>
                                @if($room->created_by === Auth::id())
                                    <form method="POST" action="{{ route('rooms.destroy', $room->id) }}" style="display: inline-block;" onsubmit="return confirm('Are you sure you want to delete this room?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="btn btn-small btn-danger">Delete</button>
                                    </form>
                                @endif
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        @else
            <div class="empty-state">
                <h2>No rooms available</h2>
                <p>Create your first virtual office room to get started!</p>
                <a href="{{ route('rooms.create') }}" class="btn" style="margin-top: 1rem;">Create Room</a>
            </div>
        @endif
    </div>
</body>
</html>

