<?php

namespace App\Events;

use App\Models\Presence;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserLeftRoom implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Presence $presence)
    {
    }

    public function broadcastOn(): Channel
    {
        return new Channel('room.' . $this->presence->room_id);
    }

    public function broadcastAs(): string
    {
        return 'user.left';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->presence->user_id,
            'presence_id' => $this->presence->id,
        ];
    }
}

