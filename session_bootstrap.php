<?php

declare(strict_types=1);

function portal_latest_deploy_mtime(string $rootDir): int
{
    $latestMtime = 0;
    $allowedExtensions = ['php', 'js', 'css', 'json', 'ico', 'png', 'jpg', 'jpeg', 'webp', 'svg'];

    $directory = new RecursiveDirectoryIterator($rootDir, FilesystemIterator::SKIP_DOTS);
    $filtered = new RecursiveCallbackFilterIterator(
        $directory,
        static function (SplFileInfo $current): bool {
            if ($current->isDir()) {
                return !in_array($current->getFilename(), ['.git', '.github', 'node_modules'], true);
            }

            return true;
        }
    );
    $iterator = new RecursiveIteratorIterator($filtered, RecursiveIteratorIterator::LEAVES_ONLY);

    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile()) {
            continue;
        }

        $extension = strtolower($fileInfo->getExtension());
        if (!in_array($extension, $allowedExtensions, true)) {
            continue;
        }

        $mtime = $fileInfo->getMTime();
        if ($mtime > $latestMtime) {
            $latestMtime = $mtime;
        }
    }

    return $latestMtime;
}

function portal_asset_version(): string
{
    static $version = null;

    if ($version !== null) {
        return $version;
    }

    $latestMtime = portal_latest_deploy_mtime(__DIR__);
    $version = $latestMtime > 0 ? gmdate('YmdHis', $latestMtime) : gmdate('YmdHis');
    return $version;
}

function portal_asset_url(string $path): string
{
    $separator = str_contains($path, '?') ? '&' : '?';
    return $path . $separator . 'v=' . rawurlencode(portal_asset_version());
}

function portal_is_https_request(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }

    if ((int) ($_SERVER['SERVER_PORT'] ?? 0) === 443) {
        return true;
    }

    $requestScheme = (string) ($_SERVER['REQUEST_SCHEME'] ?? '');
    if (strtolower($requestScheme) === 'https') {
        return true;
    }

    // Common reverse-proxy header (e.g. nginx/traefik/load balancer).
    $forwardedProto = (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '');
    if ($forwardedProto !== '' && strtolower(trim(explode(',', $forwardedProto)[0])) === 'https') {
        return true;
    }

    return false;
}

function portal_should_enforce_https(): bool
{
    $value = getenv('APP_ENFORCE_HTTPS');
    if ($value === false || $value === null || trim((string) $value) === '') {
        return true;
    }

    return !in_array(strtolower(trim((string) $value)), ['0', 'false', 'no', 'off'], true);
}

$isCli = PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg';
$isHttps = portal_is_https_request();

if (!$isCli && portal_should_enforce_https() && !$isHttps) {
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    $requestUri = (string) ($_SERVER['REQUEST_URI'] ?? '/');

    if ($host !== '') {
        header('Location: https://' . $host . $requestUri, true, 308);
        exit;
    }
}

if ($isHttps) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

if (session_status() === PHP_SESSION_NONE) {
    $cookieParams = session_get_cookie_params();

    session_set_cookie_params([
        'lifetime' => $cookieParams['lifetime'] ?? 0,
        'path' => $cookieParams['path'] ?? '/',
        'domain' => $cookieParams['domain'] ?? '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');

    session_start();
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
