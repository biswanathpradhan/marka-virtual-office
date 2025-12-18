<?php

return [
    'default' => env('BROADCAST_DRIVER', 'pusher'),
    'connections' => [
        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY', 'local-key'),
            'secret' => env('PUSHER_APP_SECRET', 'local-secret'),
            'app_id' => env('PUSHER_APP_ID', 'local-app-id'),
            'options' => [
                'cluster' => env('PUSHER_APP_CLUSTER', 'mt1'),
                'host' => env('PUSHER_HOST', '127.0.0.1'),
                'port' => env('PUSHER_PORT', 6001),
                'scheme' => env('PUSHER_SCHEME', 'http'),
                'encrypted' => false,
                'useTLS' => false,
            ],
            'client_options' => [],
        ],
        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST', '127.0.0.1'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
            ],
        ],
        'ably' => [
            'driver' => 'ably',
            'key' => env('ABLY_KEY'),
        ],
        'log' => [
            'driver' => 'log',
        ],
        'null' => [
            'driver' => 'null',
        ],
    ],
];

