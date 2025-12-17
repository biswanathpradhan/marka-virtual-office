<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Virtual Office - {{ config('app.name', 'Laravel') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app" data-room-id="{{ $room }}"></div>
    
    <noscript>
        <div style="padding: 2rem; text-align: center;">
            <h2>JavaScript Required</h2>
            <p>Please enable JavaScript to use Virtual Office.</p>
        </div>
    </noscript>
</body>
</html>
