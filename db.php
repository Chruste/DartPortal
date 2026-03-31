<?php
declare(strict_types=1);

// Server-side DB config via environment variables.
$host = getenv('DB_HOST') ?: 'localhost';
$db = getenv('DB_NAME') ?: 'db_447002_1';
$user = getenv('DB_USER') ?: '';
$pw = getenv('DB_PASS') ?: '';

if ($user === '' || $pw === '') {
    throw new RuntimeException('DB_USER und DB_PASS muessen als Umgebungsvariablen gesetzt sein.');
}

$mysqli = new mysqli($host, $user, $pw, $db);
if ($mysqli->connect_error) {
    throw new RuntimeException('DB-Verbindung fehlgeschlagen: ' . $mysqli->connect_error);
}

$mysqli->set_charset('utf8mb4');