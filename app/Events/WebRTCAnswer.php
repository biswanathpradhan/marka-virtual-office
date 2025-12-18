<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WebRTCAnswer implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $fromUserId,
        public int $toUserId,
        public int $roomId,
        public string $answer
    ) {
    }

    public function broadcastOn(): Channel
    {
        // Use public channel - API endpoint already authenticates the sender
        return new Channel('user.' . $this->toUserId);
    }

    public function broadcastAs(): string
    {
        return 'webrtc.answer';
    }

    public function broadcastWith(): array
    {
        return [
            'from_user_id' => $this->fromUserId,
            'room_id' => $this->roomId,
            'answer' => $this->answer,
        ];
    }
}

