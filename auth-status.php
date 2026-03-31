<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';

header('Content-Type: application/json');

echo json_encode([
    'authenticated' => isset($_SESSION['user_id']),
    'username' => $_SESSION['username'] ?? null,
    'email' => $_SESSION['user_email'] ?? null,
    'auth_method' => $_SESSION['auth_method'] ?? null,
]);
