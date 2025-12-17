<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ChatController extends Controller
{
    public function index(Room $room)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Allow access if room is public or user is a participant
        if (!$room->is_public && !$room->participants()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $messages = ChatMessage::where('room_id', $room->id)
            ->with(['user' => function($query) {
                $query->select('id', 'name', 'email', 'avatar_url');
            }])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'messages' => $messages,
        ]);
    }

    public function store(Request $request, Room $room)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Allow access if room is public or user is a participant
        if (!$room->is_public && !$room->participants()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'content' => 'required_without:file|string|max:1000',
            'type' => 'required|in:text,image,file',
            'file' => 'required_if:type,image,file|file|max:10240', // 10MB max
        ]);

        $fileUrl = null;
        $content = $validated['content'] ?? '';

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('chat/' . $room->id, 'public');
            $fileUrl = '/storage/' . $path;
            $content = $file->getClientOriginalName();
        }

        $message = ChatMessage::create([
            'room_id' => $room->id,
            'user_id' => Auth::id(),
            'content' => $content,
            'type' => $validated['type'],
            'file_url' => $fileUrl,
        ]);

        $message->load(['user' => function($query) {
            $query->select('id', 'name', 'email', 'avatar_url');
        }]);

        // Broadcast message to room
        broadcast(new \App\Events\ChatMessageSent($room->id, $message))->toOthers();

        return response()->json($message, 201);
    }
}

