<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar_url',
        'position',
        'department',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function presences()
    {
        return $this->hasMany(Presence::class);
    }

    public function rooms()
    {
        return $this->hasMany(Room::class, 'created_by');
    }

    public function settings()
    {
        return $this->hasOne(UserSettings::class);
    }

    public function roomParticipants()
    {
        return $this->hasMany(RoomParticipant::class);
    }
}

