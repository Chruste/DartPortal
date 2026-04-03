<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /login.php');
    exit;
}

$submittedToken = $_POST['csrf_token'] ?? '';
$expectedToken = $_SESSION['csrf_token'] ?? '';
if ($submittedToken === '' || $expectedToken === '' || !hash_equals($expectedToken, $submittedToken)) {
    header('Location: /login.php?error=csrf');
    exit;
}

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
}

session_destroy();

header('Location: /login.php?info=abgemeldet');
exit;
