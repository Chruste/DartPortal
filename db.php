<?php
declare(strict_types=1);

require_once __DIR__ . '/oauth_config.php';

// DB config from env vars, then secret file fallback.
$host = oauth_env('DB_HOST', 'localhost');
$db = oauth_env('DB_NAME', 'db_447002_1');
$user = oauth_env('DB_USER');
$pw = oauth_env('DB_PASS');

if ($user === '' || $pw === '') {
    throw new RuntimeException('DB_USER und DB_PASS fehlen (weder Umgebungsvariable noch Secret-Datei).');
}

$mysqli = new mysqli($host, $user, $pw, $db);
if ($mysqli->connect_error) {
    throw new RuntimeException('DB-Verbindung fehlgeschlagen: ' . $mysqli->connect_error);
}

$mysqli->set_charset('utf8mb4');