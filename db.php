<?php
declare(strict_types=1);

require_once __DIR__ . '/oauth_config.php';

// DB config from env vars, then secret file fallback.
$host = oauth_env('DB_HOST');
$db = oauth_env('DB_NAME');
$user = oauth_env('DB_USER');
$pw = oauth_env('DB_PASS');

if ($user === '' || $pw === '') {
    error_log('DB_USER und DB_PASS fehlen (weder Umgebungsvariable noch Secret-Datei).');
    if (!headers_sent()) {
        http_response_code(500);
    }
    exit('Interner Serverfehler.');
}

$mysqli = new mysqli($host, $user, $pw, $db);
if ($mysqli->connect_error) {
    error_log('DB-Verbindung fehlgeschlagen: ' . $mysqli->connect_error);
    if (!headers_sent()) {
        http_response_code(500);
    }
    exit('Interner Serverfehler.');
}

$mysqli->set_charset('utf8mb4');