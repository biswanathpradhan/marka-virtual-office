<?php

namespace App\Mail;

use App\Models\Room;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RoomInvitation extends Mailable
{
    use Queueable, SerializesModels;

    public $room;
    public $inviterName;
    public $inviteLink;

    public function __construct(Room $room, $inviterName, $inviteLink)
    {
        $this->room = $room;
        $this->inviterName = $inviterName;
        $this->inviteLink = $inviteLink;
    }

    public function build()
    {
        return $this->subject('Invitation to join ' . $this->room->name)
                    ->view('emails.room-invitation')
                    ->with([
                        'room' => $this->room,
                        'inviterName' => $this->inviterName,
                        'inviteLink' => $this->inviteLink,
                    ]);
    }
}

