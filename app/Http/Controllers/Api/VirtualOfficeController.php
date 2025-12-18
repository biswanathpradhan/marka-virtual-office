<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Presence;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class VirtualOfficeController extends Controller
{
    public function index()
    {
        $rooms = Room::where('is_public', true)
            ->orWhereHas('participants', function ($query) {
                $query->where('user_id', Auth::id());
            })
            ->with(['creator', 'activePresences.user'])
            ->get();

        return response()->json([
            'rooms' => $rooms,
        ]);
    }

    public function show(Room $room)
    {
        if (!$room->canJoin(Auth::user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get all active presences - use same logic as join() method
        $presences = Presence::where('room_id', $room->id)
            ->where(function($query) {
                $query->where('status', 'online') // Include all online users
                      ->orWhere(function($q) {
                          $q->where('status', '!=', 'offline')
                            ->where('last_seen_at', '>=', now()->subMinutes(5)); // Or active within 5 minutes
                      });
            })
            ->with(['user' => function($query) {
                $query->select('id', 'name', 'email', 'avatar_url', 'position', 'department');
            }])
            ->orderBy('last_seen_at', 'desc')
            ->get();

        return response()->json([
            'room' => $room,
            'presences' => $presences,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_public' => 'boolean',
            'max_participants' => 'integer|min:1|max:100',
        ]);

        $room = Room::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'created_by' => Auth::id(),
            'is_public' => $validated['is_public'] ?? true,
            'max_participants' => $validated['max_participants'] ?? 50,
        ]);

        return response()->json($room->load('creator'), 201);
    }

    public function join(Room $room)
    {
        if (!$room->canJoin(Auth::user())) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($room->getActiveParticipantsCount() >= $room->max_participants) {
            return response()->json(['message' => 'Room is full'], 403);
        }

        $presence = Presence::firstOrCreate(
            [
                'user_id' => Auth::id(),
                'room_id' => $room->id,
            ],
            [
                'status' => 'online',
                'position_x' => rand(100, 800),
                'position_y' => rand(100, 600),
                'audio_enabled' => Auth::user()->settings?->auto_join_audio ?? true,
                'video_enabled' => Auth::user()->settings?->auto_join_video ?? true,
            ]
        );

        // Always update status to 'online' when joining (camera OFF by default)
        $presence->update([
            'status' => 'online',
            'last_seen_at' => now(),
            'video_enabled' => false, // Camera OFF by default
            'audio_enabled' => true, // Audio ON by default
        ]);

        broadcast(new \App\Events\UserJoinedRoom($presence))->toOthers();

        // Get all active presences with user data
        // Use a more lenient query to get all presences that are not explicitly offline
        // Include users active within last 5 minutes OR users with status 'online' (just joined)
        $activePresences = Presence::where('room_id', $room->id)
            ->where(function($query) {
                $query->where('status', 'online') // Include all online users
                      ->orWhere(function($q) {
                          $q->where('status', '!=', 'offline')
                            ->where('last_seen_at', '>=', now()->subMinutes(5)); // Or active within 5 minutes
                      });
            })
            ->with(['user' => function($query) {
                $query->select('id', 'name', 'email', 'avatar_url', 'position', 'department');
            }])
            ->orderBy('last_seen_at', 'desc')
            ->get();

        \Log::info('User joined room', [
            'user_id' => Auth::id(),
            'room_id' => $room->id,
            'active_presences_count' => $activePresences->count(),
            'presence_ids' => $activePresences->pluck('user_id')->toArray(),
            'presence_details' => $activePresences->map(function($p) {
                return [
                    'user_id' => $p->user_id,
                    'user_name' => $p->user->name ?? 'Unknown',
                    'status' => $p->status,
                    'last_seen' => $p->last_seen_at,
                ];
            })->toArray(),
        ]);

        return response()->json([
            'presence' => $presence->load(['user' => function($query) {
                $query->select('id', 'name', 'email', 'avatar_url', 'position', 'department');
            }]),
            'room' => $room->load(['creator']),
            'active_presences' => $activePresences,
        ]);
    }

    public function leave(Room $room)
    {
        $presence = Presence::where('user_id', Auth::id())
            ->where('room_id', $room->id)
            ->first();

        if ($presence) {
            // Update presence status to offline
            $presence->update([
                'status' => 'offline',
                'last_seen_at' => now(),
                'video_enabled' => false,
                'audio_enabled' => false,
            ]);
            
            // Broadcast to other users that this user left
            broadcast(new \App\Events\UserLeftRoom($presence))->toOthers();
        }

        return response()->json(['message' => 'Left room successfully']);
    }

    public function updatePresence(Request $request, Room $room)
    {
        $validated = $request->validate([
            'position_x' => 'nullable|numeric',
            'position_y' => 'nullable|numeric',
            'status' => 'nullable|in:online,away,busy,offline',
            'audio_enabled' => 'nullable|boolean',
            'video_enabled' => 'nullable|boolean',
        ]);

        $presence = Presence::where('user_id', Auth::id())
            ->where('room_id', $room->id)
            ->firstOrFail();

        $presence->update(array_merge($validated, ['last_seen_at' => now()]));

        broadcast(new \App\Events\PresenceUpdated($presence))->toOthers();

        return response()->json($presence->load('user'));
    }

    public function getPresences(Room $room)
    {
        // Use the same query logic as join() to ensure consistency
        $presences = Presence::where('room_id', $room->id)
            ->where(function($query) {
                $query->where('status', 'online') // Include all online users
                      ->orWhere(function($q) {
                          $q->where('status', '!=', 'offline')
                            ->where('last_seen_at', '>=', now()->subMinutes(5)); // Or active within 5 minutes
                      });
            })
            ->with(['user' => function($query) {
                $query->select('id', 'name', 'email', 'avatar_url', 'position', 'department');
            }])
            ->orderBy('last_seen_at', 'desc')
            ->get();

        return response()->json($presences);
    }

    public function updateBackground(Request $request, Room $room)
    {
        if ($room->created_by !== Auth::id()) {
            return response()->json(['message' => 'Only room creator can change background'], 403);
        }

        $validated = $request->validate([
            'background_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max
            'background_image_url' => 'nullable|string|max:1000',
        ]);

        if ($request->hasFile('background_image')) {
            // Delete old background if exists
            if ($room->background_image && strpos($room->background_image, '/storage/') === 0) {
                $oldPath = str_replace('/storage/', '', $room->background_image);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }
            
            // Store new background
            $path = $request->file('background_image')->store('room-backgrounds', 'public');
            $room->background_image = '/storage/' . $path;
        } elseif ($request->has('background_image_url')) {
            $url = $request->input('background_image_url');
            if (!empty($url)) {
                // Validate URL format
                if (filter_var($url, FILTER_VALIDATE_URL) || strpos($url, '/storage/') === 0) {
                    $room->background_image = $url;
                } else {
                    return response()->json(['message' => 'Invalid URL format'], 422);
                }
            } else {
                // Empty URL means remove background
                if ($room->background_image && strpos($room->background_image, '/storage/') === 0) {
                    $oldPath = str_replace('/storage/', '', $room->background_image);
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }
                $room->background_image = null;
            }
        }

        $room->save();

        return response()->json([
            'background_image' => $room->background_image,
        ]);
    }
}

