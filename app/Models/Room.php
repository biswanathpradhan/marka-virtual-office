<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'created_by',
        'is_public',
        'max_participants',
        'settings',
        'background_image',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'settings' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($room) {
            if (empty($room->slug)) {
                $room->slug = Str::slug($room->name) . '-' . Str::random(6);
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function presences(): HasMany
    {
        return $this->hasMany(Presence::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(RoomParticipant::class);
    }

    public function activePresences(): HasMany
    {
        // Get presences that are online, away, or busy (not offline)
        // Also check that last_seen_at is recent (within last 60 seconds) to ensure they're actually active
        return $this->hasMany(Presence::class)
            ->where('status', '!=', 'offline')
            ->where('last_seen_at', '>=', now()->subSeconds(60));
    }

    public function canJoin(User $user): bool
    {
        if ($this->is_public) {
            return true;
        }

        return $this->participants()->where('user_id', $user->id)->exists();
    }

    public function getActiveParticipantsCount(): int
    {
        return $this->activePresences()->count();
    }
}

