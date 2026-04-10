<?php

declare(strict_types=1);

require_once __DIR__ . '/oauth_config.php';

$userDbHost = user_env('USER_DB_HOST');
$userDbName = user_env('USER_DB_NAME');
$userDbUser = user_env('USER_DB_USER');
$userDbPass = user_env('USER_DB_PASS');

if ($userDbHost === '' || $userDbName === '') {
    throw new RuntimeException('USER_DB_HOST und USER_DB_NAME fehlen (weder Umgebungsvariable noch Secret-Datei konfiguriert).');
}

if ($userDbUser === '' || $userDbPass === '') {
    throw new RuntimeException('USER_DB_USER und USER_DB_PASS fehlen (weder Umgebungsvariable noch Secret-Datei konfiguriert).');
}

$mysqli_user = new mysqli($userDbHost, $userDbUser, $userDbPass, $userDbName);
if ($mysqli_user->connect_error) {
    portal_log_error('Portal-DB-Verbindung fehlgeschlagen: ' . $mysqli_user->connect_error);
    if (!headers_sent()) {
        http_response_code(500);
    }
    exit('Interner Serverfehler.');
}

$mysqli_user->set_charset('utf8mb4');
