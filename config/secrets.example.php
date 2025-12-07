<?php
/**
 * Example secrets configuration file.
 *
 * Copy this file to config/secrets.php and fill in the values for your environment.
 * NOTE: Do NOT commit config/secrets.php with real secrets to version control.
 */
return [
    'db' => [
        // Database user and password for PDO connection
        'user' => 'your_db_user',
        'password' => 'your_db_password',
        // Optional DSN override (otherwise use ENV DB_DSN or config/app.php default)
        'dsn' => '',
    ],

    'tte' => [
        // Tabletop.Events credentials
        'convention_id' => 'CHANGE_ME',
        'api_key' => 'CHANGE_ME',
        'api_user' => '',
        'api_password' => '',
    ],
];
