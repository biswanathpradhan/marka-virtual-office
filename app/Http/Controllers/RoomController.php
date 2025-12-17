<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoomController extends Controller
{
    public function index()
    {
        $rooms = Room::where('is_public', true)
            ->orWhereHas('participants', function ($query) {
                $query->where('user_id', Auth::id());
            })
            ->with(['creator', 'activePresences'])
            ->get();

        return view('rooms.index', compact('rooms'));
    }

    public function create()
    {
        return view('rooms.create');
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

        return redirect()->route('virtual-office', $room->id);
    }
}

