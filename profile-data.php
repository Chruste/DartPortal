<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';
require __DIR__ . '/portal_social_lib.php';

$userId = portal_require_authenticated_user();

try {
    require __DIR__ . '/db.php';
    require __DIR__ . '/db_user.php';

    portal_json_response([
        'success' => true,
        'profile' => portal_fetch_profile($mysqli_user, $mysqli, $userId),
        'friends' => portal_fetch_friends($mysqli_user, $userId),
        'invitations' => portal_fetch_invitations($mysqli_user, $userId),
        'gameInvitations' => portal_fetch_game_invitations($mysqli_user, $userId),
        'sentGameInvitations' => portal_fetch_sent_game_invitations($mysqli_user, $userId),
    ]);
} catch (Throwable $exception) {
    portal_log_error('Profil-Daten Fehler', $exception);
    portal_json_response(['success' => false, 'message' => 'Profil-Daten konnten nicht geladen werden.'], 500);
}