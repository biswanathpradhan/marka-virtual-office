<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WebRTCController extends Controller
{
    public function getIceServers()
    {
        return response()->json([
            'iceServers' => [
                [
                    'urls' => 'stun:stun.l.google.com:19302',
                ],
                [
                    'urls' => 'stun:stun1.l.google.com:19302',
                ],
            ],
        ]);
    }

    public function offer(Request $request, Room $room)
    {
        $validated = $request->validate([
            'target_user_id' => 'required|exists:users,id',
            'offer' => 'required|string',
        ]);

        broadcast(new \App\Events\WebRTCOffer(
            Auth::id(),
            $validated['target_user_id'],
            $room->id,
            $validated['offer']
        ))->toOthers();

        return response()->json(['message' => 'Offer sent']);
    }

    public function answer(Request $request, Room $room)
    {
        $validated = $request->validate([
            'target_user_id' => 'required|exists:users,id',
            'answer' => 'required|string',
        ]);

        broadcast(new \App\Events\WebRTCAnswer(
            Auth::id(),
            $validated['target_user_id'],
            $room->id,
            $validated['answer']
        ))->toOthers();

        return response()->json(['message' => 'Answer sent']);
    }

    public function iceCandidate(Request $request, Room $room)
    {
        $validated = $request->validate([
            'target_user_id' => 'required|exists:users,id',
            'candidate' => 'required|string',
        ]);

        broadcast(new \App\Events\WebRTCIceCandidate(
            Auth::id(),
            $validated['target_user_id'],
            $room->id,
            $validated['candidate']
        ))->toOthers();

        return response()->json(['message' => 'ICE candidate sent']);
    }
}

