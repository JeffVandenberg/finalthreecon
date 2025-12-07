<?php
// Centralized PDO connection using bootstrap config with precedence ENV > secret() > config().
if (!function_exists('config') || !function_exists('secret')) {
    // Ensure bootstrap is loaded when db_connect.php is used directly
    $bootstrapPath = __DIR__ . '/core/bootstrap.php';
    if (file_exists($bootstrapPath)) {
        require_once $bootstrapPath;
    }
}

$dsn = getenv('DB_DSN') ?: (secret('db.dsn') ?: config('db.default_dsn'));
$user = getenv('DB_USER') ?: (secret('db.user') ?: config('db.default_user'));
$password = getenv('DB_PASSWORD') ?: (secret('db.password') ?: config('db.default_password'));

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $dbh = new PDO($dsn, $user, $password, $options);
} catch (Throwable $e) {
    http_response_code(500);
    echo 'Database connection failed. Please check configuration.';
    // For non-prod environments, you can uncomment to see error details
    // echo '<pre>' . htmlspecialchars($e->getMessage(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</pre>';
    exit(1);
}

return $dbh;