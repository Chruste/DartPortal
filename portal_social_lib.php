<?php

declare(strict_types=1);

require_once __DIR__ . '/oauth_config.php';

function portal_json_response(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    echo json_encode($payload);
    exit;
}

function portal_require_authenticated_user(): int
{
    if (!isset($_SESSION['user_id'])) {
        portal_json_response(['success' => false, 'message' => 'Nicht eingeloggt.'], 401);
    }

    return (int) $_SESSION['user_id'];
}

function portal_require_post_request(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        portal_json_response(['success' => false, 'message' => 'Nur POST erlaubt.'], 405);
    }
}

function portal_read_json_input(): array
{
    $rawInput = file_get_contents('php://input');
    $decoded = json_decode($rawInput ?: '', true);
    return is_array($decoded) ? $decoded : [];
}

function portal_require_csrf_token(array $input): void
{
    $submittedToken = isset($input['csrfToken']) && is_string($input['csrfToken'])
        ? $input['csrfToken']
        : '';
    $expectedToken = $_SESSION['csrf_token'] ?? '';

    if ($submittedToken === '' || !is_string($expectedToken) || $expectedToken === '' || !hash_equals($expectedToken, $submittedToken)) {
        portal_json_response(['success' => false, 'message' => 'Ungueltiges CSRF-Token.'], 403);
    }
}

function portal_text_length(string $value): int
{
    return function_exists('mb_strlen') ? (int) mb_strlen($value, 'UTF-8') : strlen($value);
}

function portal_normalize_display_name(string $displayName): string
{
    $normalized = trim(preg_replace('/\s+/u', ' ', $displayName) ?? '');

    if ($normalized === '') {
        throw new InvalidArgumentException('Der Anzeigename darf nicht leer sein.');
    }

    if (portal_text_length($normalized) > 60) {
        throw new InvalidArgumentException('Der Anzeigename darf maximal 60 Zeichen lang sein.');
    }

    return $normalized;
}

function portal_normalize_scolia_value(mixed $value): string
{
    if (!is_string($value)) {
        return '';
    }

    $normalized = trim($value);
    if (portal_text_length($normalized) > 191) {
        throw new InvalidArgumentException('Scolia-Werte duerfen maximal 191 Zeichen lang sein.');
    }

    return $normalized;
}

function portal_format_datetime(?string $value): string
{
    if ($value === null || trim($value) === '') {
        return '';
    }

    try {
        $date = new DateTimeImmutable($value);
        return $date->format('d.m.Y H:i');
    } catch (Throwable) {
        return $value;
    }
}

function portal_fetch_single_value(mysqli $mysqli, string $sql, string $types, mixed ...$params): ?array
{
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('DB Prepare fehlgeschlagen.');
    }

    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return is_array($row) ? $row : null;
}

function portal_fetch_profile(mysqli $portalDb, mysqli $authDb, int $userId): array
{
    $portalUser = portal_fetch_single_value(
        $portalDb,
        'SELECT id, display_name, last_login FROM portal_users WHERE id = ? LIMIT 1',
        'i',
        $userId
    );

    if ($portalUser === null) {
        throw new RuntimeException('Portal-Benutzer nicht gefunden.');
    }

    $scoliaConfig = portal_fetch_single_value(
        $authDb,
        'SELECT serial_number, api_token FROM scolia_config WHERE user_id = ? LIMIT 1',
        'i',
        $userId
    );

    return [
        'userId' => (int) $portalUser['id'],
        'displayName' => (string) $portalUser['display_name'],
        'lastLogin' => portal_format_datetime((string) ($portalUser['last_login'] ?? '')),
        'serialNumber' => (string) ($scoliaConfig['serial_number'] ?? ''),
        'accessToken' => (string) ($scoliaConfig['api_token'] ?? ''),
    ];
}

function portal_fetch_friends(mysqli $portalDb, int $userId): array
{
    $sql = '
        SELECT
            pu.id,
            pu.display_name,
            pu.last_login
        FROM friendships f
        INNER JOIN portal_users pu
            ON pu.id = CASE WHEN f.user_one_id = ? THEN f.user_two_id ELSE f.user_one_id END
        WHERE f.active = 1
          AND f.status = "accepted"
          AND (f.user_one_id = ? OR f.user_two_id = ?)
        ORDER BY pu.display_name ASC, pu.id ASC
    ';
    $stmt = $portalDb->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Freunde konnten nicht geladen werden.');
    }

    $stmt->bind_param('iii', $userId, $userId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $friends = [];
    while ($result && ($row = $result->fetch_assoc())) {
        $friends[] = [
            'id' => (int) $row['id'],
            'name' => (string) $row['display_name'],
            'lastLogin' => portal_format_datetime((string) ($row['last_login'] ?? '')),
        ];
    }

    $stmt->close();
    return $friends;
}

function portal_fetch_invitations(mysqli $portalDb, int $userId): array
{
    $sql = '
        SELECT
            pu.id,
            pu.display_name,
            pu.last_login,
            f.requested_by_user_id
        FROM friendships f
        INNER JOIN portal_users pu
            ON pu.id = CASE WHEN f.user_one_id = ? THEN f.user_two_id ELSE f.user_one_id END
        WHERE f.active = 1
          AND f.status = "pending"
          AND (f.user_one_id = ? OR f.user_two_id = ?)
        ORDER BY pu.display_name ASC, pu.id ASC
    ';
    $stmt = $portalDb->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Einladungen konnten nicht geladen werden.');
    }

    $stmt->bind_param('iii', $userId, $userId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $invitations = [];
    while ($result && ($row = $result->fetch_assoc())) {
        $requestedByUserId = (int) ($row['requested_by_user_id'] ?? 0);
        $invitations[] = [
            'id' => (int) $row['id'],
            'name' => (string) $row['display_name'],
            'lastLogin' => portal_format_datetime((string) ($row['last_login'] ?? '')),
            'direction' => $requestedByUserId === $userId ? 'outgoing' : 'incoming',
        ];
    }

    $stmt->close();
    return $invitations;
}

function portal_friendship_pair(int $userId, int $targetUserId): array
{
    return $userId < $targetUserId
        ? [$userId, $targetUserId]
        : [$targetUserId, $userId];
}

function portal_fetch_friendship(mysqli $portalDb, int $userId, int $targetUserId, bool $forUpdate = false): ?array
{
    [$userOneId, $userTwoId] = portal_friendship_pair($userId, $targetUserId);
    $sql = 'SELECT id, requested_by_user_id, status, active FROM friendships WHERE user_one_id = ? AND user_two_id = ? LIMIT 1';
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }

    return portal_fetch_single_value($portalDb, $sql, 'ii', $userOneId, $userTwoId);
}

function portal_fetch_user(mysqli $portalDb, int $userId): ?array
{
    return portal_fetch_single_value(
        $portalDb,
        'SELECT id, display_name, last_login FROM portal_users WHERE id = ? LIMIT 1',
        'i',
        $userId
    );
}

function portal_search_users(mysqli $portalDb, int $userId, string $query): array
{
    $search = trim($query);
    if ($search === '') {
        return [];
    }

    $searchLike = '%' . $search . '%';
    $sql = '
        SELECT id, display_name, last_login
        FROM portal_users
        WHERE id <> ?
          AND (display_name LIKE ? OR CAST(id AS CHAR) LIKE ?)
        ORDER BY display_name ASC, id ASC
        LIMIT 25
    ';
    $stmt = $portalDb->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Suche konnte nicht vorbereitet werden.');
    }

    $stmt->bind_param('iss', $userId, $searchLike, $searchLike);
    $stmt->execute();
    $result = $stmt->get_result();

    $users = [];
    while ($result && ($row = $result->fetch_assoc())) {
        $targetId = (int) $row['id'];
        $friendship = portal_fetch_friendship($portalDb, $userId, $targetId);
        $action = 'invite';
        $actionLabel = 'Einladen';
        $actionEnabled = true;

        if (is_array($friendship)) {
            $isActive = (int) ($friendship['active'] ?? 0) === 1;
            $status = (string) ($friendship['status'] ?? '');
            $requestedByUserId = (int) ($friendship['requested_by_user_id'] ?? 0);

            if ($isActive && $status === 'accepted') {
                $action = 'remove';
                $actionLabel = 'Entfernen';
            } elseif ($isActive && $status === 'pending' && $requestedByUserId === $userId) {
                $action = 'cancel';
                $actionLabel = 'Abbrechen';
            } elseif ($isActive && $status === 'pending') {
                $action = 'incoming_pending';
                $actionLabel = 'Offen';
                $actionEnabled = false;
            }
        }

        $users[] = [
            'id' => $targetId,
            'name' => (string) $row['display_name'],
            'lastLogin' => portal_format_datetime((string) ($row['last_login'] ?? '')),
            'action' => $action,
            'actionLabel' => $actionLabel,
            'actionEnabled' => $actionEnabled,
        ];
    }

    $stmt->close();
    return $users;
}

function portal_apply_friend_action(mysqli $portalDb, int $userId, int $targetUserId, string $action): string
{
    if ($targetUserId <= 0 || $targetUserId === $userId) {
        throw new InvalidArgumentException('Ungueltiger Benutzer.');
    }

    $targetUser = portal_fetch_user($portalDb, $targetUserId);
    if ($targetUser === null) {
        throw new InvalidArgumentException('Benutzer nicht gefunden.');
    }

    [$userOneId, $userTwoId] = portal_friendship_pair($userId, $targetUserId);
    $portalDb->begin_transaction();

    try {
        $friendship = portal_fetch_friendship($portalDb, $userId, $targetUserId, true);

        switch ($action) {
            case 'invite':
                if ($friendship === null) {
                    $insert = $portalDb->prepare(
                        'INSERT INTO friendships (user_one_id, user_two_id, requested_by_user_id, status, active, created_at, updated_at) VALUES (?, ?, ?, "pending", 1, NOW(), NOW())'
                    );
                    if (!$insert) {
                        throw new RuntimeException('Einladung konnte nicht gespeichert werden.');
                    }

                    $insert->bind_param('iii', $userOneId, $userTwoId, $userId);
                    $insert->execute();
                    $insert->close();
                } else {
                    $isActive = (int) ($friendship['active'] ?? 0) === 1;
                    $status = (string) ($friendship['status'] ?? '');
                    $requestedByUserId = (int) ($friendship['requested_by_user_id'] ?? 0);

                    if ($isActive && $status === 'accepted') {
                        throw new InvalidArgumentException('Ihr seid bereits befreundet.');
                    }

                    if ($isActive && $status === 'pending' && $requestedByUserId !== $userId) {
                        throw new InvalidArgumentException('Du hast bereits eine offene Einladung erhalten.');
                    }

                    if ($isActive && $status === 'pending') {
                        throw new InvalidArgumentException('Du hast bereits eine Einladung gesendet.');
                    }

                    $update = $portalDb->prepare(
                        'UPDATE friendships SET requested_by_user_id = ?, status = "pending", active = 1, updated_at = NOW() WHERE id = ?'
                    );
                    if (!$update) {
                        throw new RuntimeException('Einladung konnte nicht aktualisiert werden.');
                    }

                    $friendshipId = (int) $friendship['id'];
                    $update->bind_param('ii', $userId, $friendshipId);
                    $update->execute();
                    $update->close();
                }

                $portalDb->commit();
                return 'Einladung gesendet.';

            case 'cancel':
                if ($friendship === null || (int) ($friendship['active'] ?? 0) !== 1 || (string) ($friendship['status'] ?? '') !== 'pending' || (int) ($friendship['requested_by_user_id'] ?? 0) !== $userId) {
                    throw new InvalidArgumentException('Es gibt keine eigene offene Einladung zum Abbrechen.');
                }

                $update = $portalDb->prepare(
                    'UPDATE friendships SET status = "cancelled", active = 0, updated_at = NOW() WHERE id = ?'
                );
                if (!$update) {
                    throw new RuntimeException('Einladung konnte nicht abgebrochen werden.');
                }

                $friendshipId = (int) $friendship['id'];
                $update->bind_param('i', $friendshipId);
                $update->execute();
                $update->close();

                $portalDb->commit();
                return 'Einladung abgebrochen.';

            case 'accept':
                if ($friendship === null || (int) ($friendship['active'] ?? 0) !== 1 || (string) ($friendship['status'] ?? '') !== 'pending' || (int) ($friendship['requested_by_user_id'] ?? 0) === $userId) {
                    throw new InvalidArgumentException('Es gibt keine offene Einladung zum Annehmen.');
                }

                $update = $portalDb->prepare(
                    'UPDATE friendships SET status = "accepted", active = 1, updated_at = NOW() WHERE id = ?'
                );
                if (!$update) {
                    throw new RuntimeException('Einladung konnte nicht angenommen werden.');
                }

                $friendshipId = (int) $friendship['id'];
                $update->bind_param('i', $friendshipId);
                $update->execute();
                $update->close();

                $portalDb->commit();
                return 'Freundschaft angenommen.';

            case 'reject':
                if ($friendship === null || (int) ($friendship['active'] ?? 0) !== 1 || (string) ($friendship['status'] ?? '') !== 'pending' || (int) ($friendship['requested_by_user_id'] ?? 0) === $userId) {
                    throw new InvalidArgumentException('Es gibt keine offene Einladung zum Ablehnen.');
                }

                $update = $portalDb->prepare(
                    'UPDATE friendships SET status = "rejected", active = 0, updated_at = NOW() WHERE id = ?'
                );
                if (!$update) {
                    throw new RuntimeException('Einladung konnte nicht abgelehnt werden.');
                }

                $friendshipId = (int) $friendship['id'];
                $update->bind_param('i', $friendshipId);
                $update->execute();
                $update->close();

                $portalDb->commit();
                return 'Einladung abgelehnt.';

            case 'remove':
                if ($friendship === null || (int) ($friendship['active'] ?? 0) !== 1 || (string) ($friendship['status'] ?? '') !== 'accepted') {
                    throw new InvalidArgumentException('Es gibt keine aktive Freundschaft zum Entfernen.');
                }

                $update = $portalDb->prepare(
                    'UPDATE friendships SET status = "removed", active = 0, updated_at = NOW() WHERE id = ?'
                );
                if (!$update) {
                    throw new RuntimeException('Freundschaft konnte nicht entfernt werden.');
                }

                $friendshipId = (int) $friendship['id'];
                $update->bind_param('i', $friendshipId);
                $update->execute();
                $update->close();

                $portalDb->commit();
                return 'Freundschaft entfernt.';

            default:
                throw new InvalidArgumentException('Unbekannte Aktion.');
        }
    } catch (Throwable $exception) {
        $portalDb->rollback();
        throw $exception;
    }
}

function portal_game_invitation_sources(): array
{
    return [
        [
            'gameType' => 'shanghai21',
            'gameLabel' => 'Shanghai 21',
            'gamePath' => '/shanghai21/',
            'sessions' => 'shanghai21_sessions',
            'participants' => 'shanghai21_session_participants',
        ],
        [
            'gameType' => 'shanghai42',
            'gameLabel' => 'Shanghai 42',
            'gamePath' => '/shanghai42/',
            'sessions' => 'shanghai42_sessions',
            'participants' => 'shanghai42_session_participants',
        ],
    ];
}

function portal_game_invitation_status_label(string $status): string
{
    return match (strtolower(trim($status))) {
        'declined' => 'Abgelehnt',
        default => 'Laufend',
    };
}

function portal_fetch_game_invitations(mysqli $portalDb, int $userId): array
{
    $invitations = [];

    foreach (portal_game_invitation_sources() as $source) {
        $sql = "
            SELECT
                p.session_id AS save_id,
                s.save_name,
                p.invited_by_user_id,
                inviter.display_name AS inviter_name,
                p.created_at,
                p.updated_at
            FROM {$source['participants']} p
            INNER JOIN {$source['sessions']} s
                ON s.id = p.session_id
            LEFT JOIN portal_users inviter
                ON inviter.id = p.invited_by_user_id
            WHERE p.portal_user_id = ?
              AND p.invitation_status = 'pending'
              AND p.is_active = 1
              AND s.is_deleted = 0
            ORDER BY p.updated_at DESC, p.id DESC
        ";

        $stmt = $portalDb->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Spiel-Einladungen konnten nicht geladen werden.');
        }

        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($result && ($row = $result->fetch_assoc())) {
            $updatedAtRaw = (string) ($row['updated_at'] ?? '');
            $invitations[] = [
                'gameType' => (string) $source['gameType'],
                'gameLabel' => (string) $source['gameLabel'],
                'gamePath' => (string) $source['gamePath'],
                'saveId' => (int) ($row['save_id'] ?? 0),
                'saveName' => (string) ($row['save_name'] ?? $source['gameLabel']),
                'inviterUserId' => (int) ($row['invited_by_user_id'] ?? 0),
                'inviterName' => (string) ($row['inviter_name'] ?? 'Unbekannt'),
                'updatedAt' => portal_format_datetime($updatedAtRaw),
                'updatedAtRaw' => $updatedAtRaw,
            ];
        }

        $stmt->close();
    }

    usort(
        $invitations,
        static fn (array $left, array $right): int => strcmp((string) ($right['updatedAtRaw'] ?? ''), (string) ($left['updatedAtRaw'] ?? ''))
    );

    return array_map(
        static function (array $invitation): array {
            unset($invitation['updatedAtRaw']);
            return $invitation;
        },
        $invitations
    );
}

function portal_fetch_sent_game_invitations(mysqli $portalDb, int $userId): array
{
    $invitations = [];

    foreach (portal_game_invitation_sources() as $source) {
        $sql = "
            SELECT
                p.session_id AS save_id,
                s.save_name,
                p.portal_user_id AS invited_user_id,
                target.display_name AS invited_name,
                p.invitation_status,
                p.created_at,
                p.updated_at
            FROM {$source['participants']} p
            INNER JOIN {$source['sessions']} s
                ON s.id = p.session_id
            LEFT JOIN portal_users target
                ON target.id = p.portal_user_id
            WHERE p.invited_by_user_id = ?
              AND p.invitation_status IN ('pending', 'declined')
              AND s.is_deleted = 0
            ORDER BY p.updated_at DESC, p.id DESC
        ";

        $stmt = $portalDb->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Gesendete Spiel-Einladungen konnten nicht geladen werden.');
        }

        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($result && ($row = $result->fetch_assoc())) {
            $status = (string) ($row['invitation_status'] ?? 'pending');
            $updatedAtRaw = (string) ($row['updated_at'] ?? '');
            $invitations[] = [
                'gameType' => (string) $source['gameType'],
                'gameLabel' => (string) $source['gameLabel'],
                'gamePath' => (string) $source['gamePath'],
                'saveId' => (int) ($row['save_id'] ?? 0),
                'saveName' => (string) ($row['save_name'] ?? $source['gameLabel']),
                'invitedUserId' => (int) ($row['invited_user_id'] ?? 0),
                'invitedName' => (string) ($row['invited_name'] ?? 'Unbekannt'),
                'status' => $status,
                'statusLabel' => portal_game_invitation_status_label($status),
                'updatedAt' => portal_format_datetime($updatedAtRaw),
                'updatedAtRaw' => $updatedAtRaw,
            ];
        }

        $stmt->close();
    }

    usort(
        $invitations,
        static fn (array $left, array $right): int => strcmp((string) ($right['updatedAtRaw'] ?? ''), (string) ($left['updatedAtRaw'] ?? ''))
    );

    return array_map(
        static function (array $invitation): array {
            unset($invitation['updatedAtRaw']);
            return $invitation;
        },
        $invitations
    );
}