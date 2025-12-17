<?php

$allowedOrigins = array_filter(array_merge(
    explode(',', env('CORS_ALLOWED_ORIGINS', '')),
    [env('FRONTEND_URL', env('APP_URL', 'http://localhost:3000'))],
    ['https://video-call.hmindustries.co', 'http://video-call.hmindustries.co']
));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $allowedOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

