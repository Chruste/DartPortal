<?php

declare(strict_types=1);

function load_auth_secrets(): array
{
    static $secrets = null;
    if ($secrets !== null) {
        return $secrets;
    }

    $paths = [];

    $envPath = getenv('DARTPORTAL_AUTH_SECRETS_FILE');
    if (is_string($envPath) && $envPath !== '') {
        $paths[] = $envPath;
    }

    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if (is_string($documentRoot) && $documentRoot !== '') {
        $paths[] = dirname($documentRoot) . '/secrets/dartportal_auth.php';
    }

    // Fallback for shared hosting when external paths are restricted.
    $paths[] = dirname(__DIR__) . '/secrets/dartportal_auth.php';
    $paths[] = __DIR__ . '/private_config/dartportal_auth.php';

    foreach ($paths as $secretFile) {
        if (!is_string($secretFile) || $secretFile === '' || !is_file($secretFile) || !is_readable($secretFile)) {
            continue;
        }

        $loaded = require $secretFile;
        if (is_array($loaded)) {
            $secrets = $loaded;
            return $secrets;
        }
    }

    $secrets = [];
    return $secrets;
}

function oauth_env(string $key, string $default = ''): string
{
    $value = getenv($key);
    if ($value !== false && $value !== null && $value !== '') {
        return $value;
    }

    $map = [
        'GOOGLE_CLIENT_ID'     => 'google_client_id',
        'GOOGLE_CLIENT_SECRET' => 'google_client_secret',
        'APP_BASE_URL'         => 'app_base_url',
        'DB_HOST'              => 'db_host',
        'DB_NAME'              => 'db_name',
        'DB_USER'              => 'db_user',
        'DB_PASS'              => 'db_pass',
    ];

    if (isset($map[$key])) {
        $secrets = load_auth_secrets();
        $fileValue = $secrets[$map[$key]] ?? '';
        if ($fileValue !== '') {
            return (string) $fileValue;
        }
    }

    return $default;
}

function load_user_db_secrets(): array
{
    static $secrets = null;
    if ($secrets !== null) {
        return $secrets;
    }

    $paths = [];

    $envPath = getenv('DARTPORTAL_USER_SECRETS_FILE');
    if (is_string($envPath) && $envPath !== '') {
        $paths[] = $envPath;
    }

    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if (is_string($documentRoot) && $documentRoot !== '') {
        $paths[] = dirname($documentRoot) . '/secrets/dartportal_user.php';
    }

    $paths[] = dirname(__DIR__) . '/secrets/dartportal_user.php';
    $paths[] = __DIR__ . '/private_config/dartportal_user.php';

    foreach ($paths as $secretFile) {
        if (!is_string($secretFile) || $secretFile === '' || !is_file($secretFile) || !is_readable($secretFile)) {
            continue;
        }

        $loaded = require $secretFile;
        if (is_array($loaded)) {
            $secrets = $loaded;
            return $secrets;
        }
    }

    $secrets = [];
    return $secrets;
}

function user_env(string $key, string $default = ''): string
{
    $value = getenv($key);
    if ($value !== false && $value !== null && $value !== '') {
        return $value;
    }

    $map = [
        'USER_DB_HOST' => 'db_host',
        'USER_DB_NAME' => 'db_name',
        'USER_DB_USER' => 'db_user',
        'USER_DB_PASS' => 'db_pass',
    ];

    if (isset($map[$key])) {
        $secrets = load_user_db_secrets();
        $fileValue = $secrets[$map[$key]] ?? '';
        if ($fileValue !== '') {
            return (string) $fileValue;
        }
    }

    return $default;
}

function oauth_google_config(): array
{
    return [
        'client_id' => oauth_env('GOOGLE_CLIENT_ID'),
        'client_secret' => oauth_env('GOOGLE_CLIENT_SECRET'),
        'base_url' => rtrim(oauth_env('APP_BASE_URL', 'https://chruste.de.cool'), '/'),
    ];
}

function oauth_redirect_uri(array $config): string
{
    return $config['base_url'] . '/google-callback.php';
}

function oauth_require_config(array $config): void
{
    if ($config['client_id'] === '' || $config['client_secret'] === '') {
        http_response_code(500);
        echo 'Google OAuth ist nicht konfiguriert. Bitte GOOGLE_CLIENT_ID und GOOGLE_CLIENT_SECRET setzen.';
        exit;
    }
}
