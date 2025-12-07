<?php
/**
 * Minimal bootstrap to standardize runtime setup and configuration access.
 * - Loads Composer autoloader and common utils
 * - Loads app config and secrets
 * - Provides helpers: config($key, $default), secret($key, $default)
 * - Applies timezone and error display based on environment
 */

// Load Composer autoloader
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
}

// Common utilities (e.g., e() for escaping)
$utilsPath = __DIR__ . '/../utils.php';
if (file_exists($utilsPath)) {
    require_once $utilsPath;
}

// Load configuration arrays
$__APP_CONFIG = [];
$__APP_SECRETS = [];

$appConfigPath = __DIR__ . '/../config/app.php';
if (file_exists($appConfigPath)) {
    $__APP_CONFIG = require $appConfigPath;
}

$secretsPath = __DIR__ . '/../config/secrets.php';
if (file_exists($secretsPath)) {
    $__APP_SECRETS = require $secretsPath;
}

// Dot-notation array getter
if (!function_exists('clocktower_array_get')) {
    function clocktower_array_get(array $array, string $key, $default = null) {
        if ($key === '' || $key === null) {
            return $array;
        }
        $segments = explode('.', $key);
        foreach ($segments as $segment) {
            if (is_array($array) && array_key_exists($segment, $array)) {
                $array = $array[$segment];
            } else {
                return $default;
            }
        }
        return $array;
    }
}

// Public helpers
if (!function_exists('config')) {
    /**
     * Get a config value with precedence: ENV > config/secrets.php > config/app.php.
     */
    function config(string $key, $default = null) {
        global $__APP_CONFIG, $__APP_SECRETS;

        // Known environment overrides mapping
        $knownEnv = [
            'db.default_dsn' => 'DB_DSN',
            'db.default_user' => 'DB_USER',
            'db.default_password' => 'DB_PASSWORD',
            'timezone' => 'APP_TZ',
            'env' => 'APP_ENV',
            'base_url' => 'APP_BASE_URL',
        ];

        if (isset($knownEnv[$key])) {
            $val = getenv($knownEnv[$key]);
            if ($val !== false && $val !== null && $val !== '') {
                return $val;
            }
        }

        // Check secrets second (for any sensitive override like db.dsn if provided there)
        $fromSecrets = clocktower_array_get($__APP_SECRETS, $key, null);
        if ($fromSecrets !== null) {
            return $fromSecrets;
        }

        // Fallback to app defaults
        return clocktower_array_get($__APP_CONFIG, $key, $default);
    }
}

if (!function_exists('secret')) {
    /**
     * Get a secret value with precedence: ENV > config/secrets.php > $default.
     */
    function secret(string $key, $default = null) {
        global $__APP_SECRETS;
        // Map secrets to environment variables when appropriate
        $envMap = [
            'db.user' => 'DB_USER',
            'db.password' => 'DB_PASSWORD',
            'db.dsn' => 'DB_DSN',
            'tte.convention_id' => 'TTE_CONVENTION_ID',
            'tte.api_key' => 'TTE_API_KEY',
            'tte.api_user' => 'TTE_API_USER',
            'tte.api_password' => 'TTE_API_PASSWORD',
        ];

        if (isset($envMap[$key])) {
            $val = getenv($envMap[$key]);
            if ($val !== false && $val !== null && $val !== '') {
                return $val;
            }
        }

        $fromSecrets = clocktower_array_get($__APP_SECRETS, $key, null);
        if ($fromSecrets !== null) {
            return $fromSecrets;
        }

        return $default;
    }
}

// Apply timezone
$tz = config('timezone', 'UTC') ?: 'UTC';
@date_default_timezone_set($tz);

// Error reporting and display based on environment
$env = strtolower((string)config('env', 'dev'));
if ($env === 'prod' || $env === 'production') {
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED & ~E_STRICT);
    ini_set('display_errors', '0');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}
