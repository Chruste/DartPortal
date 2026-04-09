<?php

declare(strict_types=1);

function portal_log_file_path(): string
{
    return __DIR__ . '/private_config/dartportal_error.log';
}

function portal_log_rotation_limit_bytes(): int
{
    if (defined('PORTAL_LOG_ROTATION_MAX_BYTES')) {
        $configuredLimit = (int) constant('PORTAL_LOG_ROTATION_MAX_BYTES');
        if ($configuredLimit > 0) {
            return $configuredLimit;
        }
    }

    return 5242880;
}

function portal_log_rotation_max_files(): int
{
    if (defined('PORTAL_LOG_ROTATION_MAX_FILES')) {
        $configuredCount = (int) constant('PORTAL_LOG_ROTATION_MAX_FILES');
        if ($configuredCount > 1) {
            return $configuredCount;
        }
    }

    return 9;
}

function portal_rotate_log_file_if_needed(string $logFile, int $maxBytes = 5242880): void
{
    if (!is_file($logFile)) {
        return;
    }

    $fileSize = @filesize($logFile);
    if (!is_int($fileSize) || $fileSize < $maxBytes) {
        return;
    }

    $maxFiles = portal_log_rotation_max_files();
    $oldestFile = $logFile . '.' . $maxFiles;
    if (is_file($oldestFile)) {
        @unlink($oldestFile);
    }

    for ($index = $maxFiles - 1; $index >= 1; $index--) {
        $sourceFile = $logFile . '.' . $index;
        if (!is_file($sourceFile)) {
            continue;
        }

        $targetFile = $logFile . '.' . ($index + 1);
        @rename($sourceFile, $targetFile);
    }

    @rename($logFile, $logFile . '.1');
}

function portal_log_error(string $message, ?Throwable $exception = null, array $context = []): void
{
    $timestamp = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
    $entry = [
        '[' . $timestamp . ']',
        $message,
    ];

    if ($exception !== null) {
        $entry[] = 'exception=' . get_class($exception);
        $entry[] = 'exception_message=' . $exception->getMessage();
        $entry[] = 'file=' . $exception->getFile() . ':' . $exception->getLine();
    }

    if ($context !== []) {
        $contextJson = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (is_string($contextJson)) {
            $entry[] = 'context=' . $contextJson;
        }
    }

    $line = implode(' ', $entry) . PHP_EOL;

    $logFile = portal_log_file_path();
    $directory = dirname($logFile);

    if (is_dir($directory) && is_writable($directory) && (!is_file($logFile) || is_writable($logFile))) {
        portal_rotate_log_file_if_needed($logFile, portal_log_rotation_limit_bytes());

        $written = @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
        if ($written !== false) {
            return;
        }
    }

    error_log(trim($line));
}

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

    $secrets = load_auth_secrets();
    if (is_array($secrets) && $secrets !== []) {
        return $secrets;
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
        $fileValue = $secrets['user_' . $map[$key]] ?? ($secrets[$map[$key]] ?? '');
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
