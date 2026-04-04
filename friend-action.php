<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';
require __DIR__ . '/portal_social_lib.php';

$userId = portal_require_authenticated_user();
portal_require_post_request();

$input = portal_read_json_input();
portal_require_csrf_token($input);

$action = isset($input['action']) && is_string($input['action']) ? trim($input['action']) : '';
$targetUserId = isset($input['targetUserId']) ? (int) $input['targetUserId'] : 0;

try {
    require __DIR__ . '/db_user.php';

    $message = portal_apply_friend_action($mysqli_user, $userId, $targetUserId, $action);

    portal_json_response([
        'success' => true,
        'message' => $message,
        'friends' => portal_fetch_friends($mysqli_user, $userId),
        'invitations' => portal_fetch_invitations($mysqli_user, $userId),
    ]);
} catch (InvalidArgumentException $exception) {
    portal_json_response(['success' => false, 'message' => $exception->getMessage()], 400);
} catch (Throwable $exception) {
    error_log('Freundesystem Aktion Fehler: ' . $exception->getMessage());
    portal_json_response(['success' => false, 'message' => 'Aktion konnte nicht ausgefuehrt werden.'], 500);
}