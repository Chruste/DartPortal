<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';
require __DIR__ . '/portal_social_lib.php';

$userId = portal_require_authenticated_user();

$query = isset($_GET['q']) && is_string($_GET['q']) ? trim($_GET['q']) : '';

try {
    require __DIR__ . '/db_user.php';

    portal_json_response([
        'success' => true,
        'results' => portal_search_users($mysqli_user, $userId, $query),
    ]);
} catch (Throwable $exception) {
    portal_log_error('Freundesuche Fehler', $exception);
    portal_json_response(['success' => false, 'message' => 'Suche konnte nicht ausgefuehrt werden.'], 500);
}