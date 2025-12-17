<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WebRTCOffer implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $fromUserId,
        public int $toUserId,
        public int $roomId,
        public string $offer
    ) {
    }

    public function broadcastOn(): Channel
    {
        return new Channel('user.' . $this->toUserId);
    }

    public function broadcastAs(): string
    {
        return 'webrtc.offer';
    }

    public function broadcastWith(): array
    {
        return [
            'from_user_id' => $this->fromUserId,
            'room_id' => $this->roomId,
            'offer' => $this->offer,
        ];
    }
}

