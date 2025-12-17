<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Room Invitation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4a90e2;
            margin: 0;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4a90e2;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #3a80d2;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Virtual Office Invitation</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p><strong>{{ $inviterName }}</strong> has invited you to join the virtual office room: <strong>{{ $room->name }}</strong>.</p>
            @if($room->description)
            <p>{{ $room->description }}</p>
            @endif
            <p>Click the button below to join the room:</p>
            <div style="text-align: center;">
                <a href="{{ $inviteLink }}" class="button">Join Room</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4a90e2;">{{ $inviteLink }}</p>
        </div>
        <div class="footer">
            <p>This invitation was sent from {{ config('mail.from.name', 'RedFox') }} Virtual Office.</p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>

