<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'preferred_camera',
        'preferred_microphone',
        'preferred_speaker',
        'auto_join_audio',
        'auto_join_video',
        'notification_preferences',
    ];

    protected $casts = [
        'auto_join_audio' => 'boolean',
        'auto_join_video' => 'boolean',
        'notification_preferences' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

