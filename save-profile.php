<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';
require __DIR__ . '/portal_social_lib.php';

$userId = portal_require_authenticated_user();
portal_require_post_request();

$input = portal_read_json_input();
portal_require_csrf_token($input);

try {
    $displayName = portal_normalize_display_name((string) ($input['displayName'] ?? ''));
    $serialNumber = portal_normalize_scolia_value($input['serialNumber'] ?? '');
    $accessToken = portal_normalize_scolia_value($input['accessToken'] ?? '');

    require __DIR__ . '/db.php';
    require __DIR__ . '/db_user.php';

    $updatePortalUser = $mysqli_user->prepare('UPDATE portal_users SET display_name = ? WHERE id = ?');
    if (!$updatePortalUser) {
        throw new RuntimeException('Profil konnte nicht gespeichert werden.');
    }

    $updatePortalUser->bind_param('si', $displayName, $userId);
    $updatePortalUser->execute();
    $updatePortalUser->close();

    $saveScolia = $mysqli->prepare(
        'INSERT INTO scolia_config (user_id, serial_number, api_token)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE serial_number = VALUES(serial_number), api_token = VALUES(api_token)'
    );
    if (!$saveScolia) {
        throw new RuntimeException('Scolia-Einstellungen konnten nicht gespeichert werden.');
    }

    $saveScolia->bind_param('iss', $userId, $serialNumber, $accessToken);
    $saveScolia->execute();
    $saveScolia->close();

    $_SESSION['username'] = $displayName;

    portal_json_response([
        'success' => true,
        'message' => 'Profil gespeichert.',
        'profile' => portal_fetch_profile($mysqli_user, $mysqli, $userId),
    ]);
} catch (InvalidArgumentException $exception) {
    portal_json_response(['success' => false, 'message' => $exception->getMessage()], 400);
} catch (Throwable $exception) {
    error_log('Profil speichern Fehler: ' . $exception->getMessage());
    portal_json_response(['success' => false, 'message' => 'Profil konnte nicht gespeichert werden.'], 500);
}