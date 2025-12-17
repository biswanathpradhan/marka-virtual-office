<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserSettingsController extends Controller
{
    public function show()
    {
        $settings = Auth::user()->settings;

        if (!$settings) {
            $settings = UserSettings::create([
                'user_id' => Auth::id(),
            ]);
        }

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'preferred_camera' => 'nullable|string',
            'preferred_microphone' => 'nullable|string',
            'preferred_speaker' => 'nullable|string',
            'auto_join_audio' => 'boolean',
            'auto_join_video' => 'boolean',
            'notification_preferences' => 'nullable|array',
        ]);

        $settings = Auth::user()->settings;

        if (!$settings) {
            $settings = UserSettings::create([
                'user_id' => Auth::id(),
                ...$validated,
            ]);
        } else {
            $settings->update($validated);
        }

        return response()->json($settings);
    }
}

