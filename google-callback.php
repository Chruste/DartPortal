<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';

require __DIR__ . '/oauth_config.php';

function oauth_http_post_form(string $url, array $data): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException('OAuth Token Request fehlgeschlagen: ' . $error);
    }

    $json = json_decode($response, true);
    if (!is_array($json) || $statusCode >= 400) {
        throw new RuntimeException('OAuth Token Response ungueltig.');
    }

    return $json;
}

function oauth_http_get_json(string $url, string $bearerToken = ''): array
{
    $ch = curl_init($url);
    $curlOptions = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ];
    if ($bearerToken !== '') {
        $curlOptions[CURLOPT_HTTPHEADER] = ['Authorization: Bearer ' . $bearerToken];
    }
    curl_setopt_array($ch, $curlOptions);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException('OAuth Userinfo Request fehlgeschlagen: ' . $error);
    }

    $json = json_decode($response, true);
    if (!is_array($json) || $statusCode >= 400) {
        throw new RuntimeException('OAuth Userinfo Response ungueltig.');
    }

    return $json;
}

function upsert_oauth_user(mysqli $mysqli, string $googleId, string $email, string $displayName): int
{
    $selectSql = 'SELECT id FROM oauth_users WHERE google_id = ? OR email = ? LIMIT 1';
    $stmt = $mysqli->prepare($selectSql);
    if (!$stmt) {
        throw new RuntimeException('DB Prepare fehlgeschlagen.');
    }

    $stmt->bind_param('ss', $googleId, $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    if (is_array($user)) {
        $id = (int) $user['id'];
        $updateSql = 'UPDATE oauth_users SET google_id = ?, email = ?, display_name = ?, last_login = NOW() WHERE id = ?';
        $update = $mysqli->prepare($updateSql);
        if (!$update) {
            throw new RuntimeException('DB Update Prepare fehlgeschlagen.');
        }

        $update->bind_param('sssi', $googleId, $email, $displayName, $id);
        $update->execute();
        $update->close();

        return $id;
    }

    $insertSql = 'INSERT INTO oauth_users (google_id, email, display_name, created_at, last_login) VALUES (?, ?, ?, NOW(), NOW())';
    $insert = $mysqli->prepare($insertSql);
    if (!$insert) {
        throw new RuntimeException('DB Insert Prepare fehlgeschlagen.');
    }

    $insert->bind_param('sss', $googleId, $email, $displayName);
    $insert->execute();
    $newId = (int) $insert->insert_id;
    $insert->close();

    return $newId;
}

function upsert_portal_user(mysqli $mysqli, int $userId, string $displayName): void
{
    $sql = '
        INSERT INTO portal_users (id, display_name, created_at, last_login)
        VALUES (?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), last_login = NOW()
    ';
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Portal-User DB Prepare fehlgeschlagen.');
    }

    $stmt->bind_param('is', $userId, $displayName);
    $stmt->execute();
    $stmt->close();
}

try {
    $config = oauth_google_config();
    oauth_require_config($config);

    if (isset($_GET['error'])) {
        header('Location: /login.php?error=oauth_abgebrochen');
        exit;
    }

    $code = $_GET['code'] ?? '';
    $state = $_GET['state'] ?? '';
    $expectedState = $_SESSION['oauth_state'] ?? '';

    if (!is_string($code) || $code === '' || !is_string($state) || $state === '') {
        header('Location: /login.php?error=oauth_code_fehlt');
        exit;
    }

    if (!is_string($expectedState) || $expectedState === '' || !hash_equals($expectedState, $state)) {
        header('Location: /login.php?error=oauth_state_ungueltig');
        exit;
    }

    unset($_SESSION['oauth_state']);

    $tokenData = oauth_http_post_form('https://oauth2.googleapis.com/token', [
        'client_id' => $config['client_id'],
        'client_secret' => $config['client_secret'],
        'code' => $code,
        'grant_type' => 'authorization_code',
        'redirect_uri' => oauth_redirect_uri($config),
    ]);

    $accessToken = $tokenData['access_token'] ?? '';
    if (!is_string($accessToken) || $accessToken === '') {
        header('Location: /login.php?error=oauth_token_fehlt');
        exit;
    }

    $userInfo = oauth_http_get_json('https://www.googleapis.com/oauth2/v3/userinfo', $accessToken);

    $googleId = isset($userInfo['sub']) && is_string($userInfo['sub']) ? trim($userInfo['sub']) : '';
    $email = isset($userInfo['email']) && is_string($userInfo['email']) ? trim($userInfo['email']) : '';
    $displayName = isset($userInfo['name']) && is_string($userInfo['name']) ? trim($userInfo['name']) : '';
    $emailVerified = ($userInfo['email_verified'] ?? false) === true || ($userInfo['email_verified'] ?? '') === 'true';

    if ($googleId === '' || $email === '' || $emailVerified !== true) {
        header('Location: /login.php?error=oauth_userinfo_unvollstaendig');
        exit;
    }

    if ($displayName === '') {
        $displayName = $email;
    }

    $userId = upsert_oauth_user($mysqli, $googleId, $email, $displayName);
    upsert_portal_user($mysqli_user, $userId, $displayName);

    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $displayName;
    $_SESSION['user_email'] = $email;
    $_SESSION['auth_method'] = 'google';

    header('Location: /index.php');
    exit;
} catch (Throwable $exception) {
    error_log('Google OAuth Fehler: ' . $exception->getMessage());
    header('Location: /login.php?error=oauth_serverfehler');
    exit;
}
