<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RoomInvitation;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class InviteController extends Controller
{
    public function invite(Request $request, Room $room)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        try {
            // Generate invite link - user will need to login first, then join room
            $inviteLink = url("/virtual-office/{$room->id}");
            $inviterName = Auth::user()->name;

            Mail::to($validated['email'])->send(
                new RoomInvitation($room, $inviterName, $inviteLink)
            );

            return response()->json([
                'message' => 'Invitation sent successfully to ' . $validated['email'],
                'room_id' => $room->id,
                'room_name' => $room->name,
                'invite_link' => $inviteLink,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send invitation email: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to send invitation: ' . $e->getMessage(),
            ], 500);
        }
    }
}

