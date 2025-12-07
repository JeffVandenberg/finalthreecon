<?php
/**
 * Application non-secret configuration defaults.
 * Precedence: ENV > config/secrets.php > these defaults.
 */

return [
    'app_name' => 'Final Three Con Tools',

    // Optional base URL for links; can be empty for relative links
    'base_url' => getenv('APP_BASE_URL') ?: '',

    // Default timezone; can be overridden via APP_TZ env var
    'timezone' => getenv('APP_TZ') ?: 'UTC',

    // Environment: dev, staging, prod (affects error display)
    'env' => getenv('APP_ENV') ?: 'dev',

    'db' => [
        // Default DSN; can be overridden via DB_DSN env var
        'default_dsn' => 'mysql:host=127.0.0.1;dbname=clocktowercon;charset=utf8mb4',
        'default_user' => 'root',
        'default_password' => '',
    ],

    'tte' => [
        'convention_url' => getenv('APP_CONV_URL') ?: 'final-three-con-2026',
    ],

    'features' => [
        'use_tailwind_cdn' => true,
    ],
];
