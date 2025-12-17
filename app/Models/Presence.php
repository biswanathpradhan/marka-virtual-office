<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Presence extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'room_id',
        'status',
        'position_x',
        'position_y',
        'audio_enabled',
        'video_enabled',
        'avatar_url',
        'last_seen_at',
    ];

    protected $casts = [
        'position_x' => 'decimal:2',
        'position_y' => 'decimal:2',
        'audio_enabled' => 'boolean',
        'video_enabled' => 'boolean',
        'last_seen_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function updateLastSeen(): void
    {
        $this->update(['last_seen_at' => now()]);
    }

    public function isActive(): bool
    {
        return $this->status !== 'offline' && 
               $this->last_seen_at && 
               $this->last_seen_at->diffInSeconds(now()) < 30;
    }
}

