<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';
require __DIR__ . '/portal_social_lib.php';

$userId = portal_require_authenticated_user();

try {
    require __DIR__ . '/db_user.php';
} catch (Throwable $exception) {
    error_log('Shanghai Storage DB Fehler: ' . $exception->getMessage());
    portal_json_response(['success' => false, 'message' => 'Datenbank nicht erreichbar.'], 500);
}

function portal_shanghai_storage_config(string $gameType): array
{
    $normalized = strtolower(trim($gameType));
    $map = [
        'shanghai21' => [
            'sessions' => 'shanghai21_sessions',
            'participants' => 'shanghai21_session_participants',
            'events' => 'shanghai21_events',
        ],
        'shanghai42' => [
            'sessions' => 'shanghai42_sessions',
            'participants' => 'shanghai42_session_participants',
            'events' => 'shanghai42_events',
        ],
    ];

    if (!isset($map[$normalized])) {
        throw new InvalidArgumentException('Ungueltiger Spieltyp.');
    }

    return ['gameType' => $normalized] + $map[$normalized];
}

function portal_shanghai_default_save_name(string $gameType): string
{
    return match (strtolower(trim($gameType))) {
        'shanghai42' => 'Shanghai 42',
        default => 'Shanghai 21',
    };
}

function portal_shanghai_normalize_save_name(mixed $value, string $gameType): string
{
    $saveName = trim((string) ($value ?? ''));
    if ($saveName === '') {
        $saveName = portal_shanghai_default_save_name($gameType);
    }

    if (function_exists('mb_substr')) {
        return mb_substr($saveName, 0, 160, 'UTF-8');
    }
    return substr($saveName, 0, 160);
}

function portal_shanghai_normalize_portal_user_id(mixed $value): ?int
{
    if (!is_numeric($value)) {
        return null;
    }

    $normalized = (int) $value;
    return $normalized > 0 ? $normalized : null;
}

function portal_shanghai_normalize_participants(array $state, int $ownerUserId): array
{
    $players = $state['players'] ?? [];
    if (!is_array($players)) {
        $players = [];
    }

    $participants = [];

    foreach ($players as $fallbackSeatNo => $player) {
        if (!is_array($player)) {
            continue;
        }

        $seatNo = isset($player['index']) && is_numeric($player['index'])
            ? (int) $player['index']
            : (int) $fallbackSeatNo;
        $seatNo = max(0, $seatNo);

        $displayName = trim((string) ($player['name'] ?? 'Spieler'));
        $displayName = $displayName !== '' ? $displayName : 'Spieler';

        $portalUserId = portal_shanghai_normalize_portal_user_id(
            $player['portalUserId'] ?? $player['playerUserId'] ?? $player['userId'] ?? null
        );
        if ($portalUserId === null && $seatNo === 0) {
            $portalUserId = $ownerUserId;
        }

        $participantRole = strtolower(trim((string) ($player['participantRole'] ?? '')));
        if (!in_array($participantRole, ['owner', 'friend', 'guest'], true)) {
            $participantRole = $portalUserId === $ownerUserId
                ? 'owner'
                : ($portalUserId !== null ? 'friend' : 'guest');
        }

        $invitationStatus = strtolower(trim((string) ($player['invitationStatus'] ?? '')));
        if (!in_array($invitationStatus, ['accepted', 'pending', 'declined', 'removed'], true)) {
            $invitationStatus = 'accepted';
        }

        $invitedByUserId = portal_shanghai_normalize_portal_user_id($player['invitedByUserId'] ?? null);
        if ($invitedByUserId === null && $participantRole === 'friend' && $portalUserId !== null && $portalUserId !== $ownerUserId) {
            $invitedByUserId = $ownerUserId;
        }

        $currentTargetIndex = isset($player['currentIndex']) && is_numeric($player['currentIndex'])
            ? max(0, (int) $player['currentIndex'])
            : 0;
        $currentTotalScore = isset($player['totalScore']) && is_numeric($player['totalScore'])
            ? (int) $player['totalScore']
            : 0;

        $participants[$seatNo] = [
            'seatNo' => $seatNo,
            'portalUserId' => $portalUserId,
            'invitedByUserId' => $invitedByUserId,
            'displayName' => function_exists('mb_substr')
                ? mb_substr($displayName, 0, 120, 'UTF-8')
                : substr($displayName, 0, 120),
            'participantRole' => $participantRole,
            'invitationStatus' => $invitationStatus,
            'currentTargetIndex' => $currentTargetIndex,
            'currentTotalScore' => $currentTotalScore,
        ];
    }

    if ($participants === []) {
        $participants[0] = [
            'seatNo' => 0,
            'portalUserId' => $ownerUserId,
            'invitedByUserId' => null,
            'displayName' => 'Spieler 1',
            'participantRole' => 'owner',
            'invitationStatus' => 'accepted',
            'currentTargetIndex' => 0,
            'currentTotalScore' => 0,
        ];
    }

    ksort($participants);
    return array_values($participants);
}

function portal_shanghai_state_meta(array $state, int $ownerUserId): array
{
    $seatParticipants = portal_shanghai_normalize_participants($state, $ownerUserId);
    $participants = [];
    $summaryParts = [];

    foreach ($seatParticipants as $participant) {
        $participants[] = [
            'seatNo' => $participant['seatNo'],
            'portalUserId' => $participant['portalUserId'],
            'name' => $participant['displayName'],
            'totalScore' => $participant['currentTotalScore'],
            'participantRole' => $participant['participantRole'],
            'invitationStatus' => $participant['invitationStatus'],
        ];

        $summaryParts[] = $participant['displayName'] . ' (' . $participant['currentTotalScore'] . ')';
    }

    $participantsJson = json_encode($participants, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($participantsJson === false) {
        throw new RuntimeException('Teilnehmer konnten nicht serialisiert werden.');
    }

    return [
        'participantSummary' => implode(', ', $summaryParts),
        'participantsJson' => $participantsJson,
        'participants' => $seatParticipants,
        'participantCount' => count($seatParticipants),
    ];
}

function portal_shanghai_state_json(array $state): string
{
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Spielstand konnte nicht serialisiert werden.');
    }

    return $json;
}

function portal_shanghai_sync_participants(mysqli $db, string $table, int $sessionId, array $participants): array
{
    $selectStmt = $db->prepare("SELECT id, seat_no, portal_user_id, display_name FROM {$table} WHERE session_id = ?");
    if (!$selectStmt) {
        throw new RuntimeException('Teilnehmer konnten nicht geladen werden.');
    }

    $selectStmt->bind_param('i', $sessionId);
    $selectStmt->execute();
    $result = $selectStmt->get_result();

    $existingBySeat = [];
    while ($result && ($row = $result->fetch_assoc())) {
        $existingBySeat[(int) $row['seat_no']] = [
            'id' => (int) $row['id'],
            'portalUserId' => isset($row['portal_user_id']) ? (int) $row['portal_user_id'] : null,
            'displayName' => (string) ($row['display_name'] ?? ''),
        ];
    }
    $selectStmt->close();

    $insertStmt = $db->prepare(
        "INSERT INTO {$table} (
            session_id,
            seat_no,
            portal_user_id,
            invited_by_user_id,
            display_name,
            participant_role,
            invitation_status,
            current_target_index,
            current_total_score,
            is_active,
            joined_at,
            last_throw_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3), ?)"
    );
    if (!$insertStmt) {
        throw new RuntimeException('Teilnehmer konnten nicht gespeichert werden.');
    }

    $updateStmt = $db->prepare(
        "UPDATE {$table}
         SET portal_user_id = ?,
             invited_by_user_id = ?,
             display_name = ?,
             participant_role = ?,
             invitation_status = ?,
             current_target_index = ?,
             current_total_score = ?,
             is_active = 1,
             last_throw_at = COALESCE(?, last_throw_at)
         WHERE id = ?"
    );
    if (!$updateStmt) {
        throw new RuntimeException('Teilnehmer konnten nicht aktualisiert werden.');
    }

    $deactivateStmt = $db->prepare(
        "UPDATE {$table}
         SET is_active = 0,
             invitation_status = CASE WHEN participant_role = 'owner' THEN invitation_status ELSE 'removed' END
         WHERE id = ?"
    );
    if (!$deactivateStmt) {
        throw new RuntimeException('Teilnehmer konnten nicht deaktiviert werden.');
    }

    $lookup = [];
    $seenSeats = [];
    $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s.u');

    foreach ($participants as $participant) {
        $seatNo = (int) $participant['seatNo'];
        $portalUserId = $participant['portalUserId'];
        $invitedByUserId = $participant['invitedByUserId'];
        $displayName = $participant['displayName'];
        $participantRole = $participant['participantRole'];
        $invitationStatus = $participant['invitationStatus'];
        $currentTargetIndex = (int) $participant['currentTargetIndex'];
        $currentTotalScore = (int) $participant['currentTotalScore'];
        $lastThrowAt = ($currentTargetIndex > 0 || $currentTotalScore !== 0) ? $now : null;

        if (isset($existingBySeat[$seatNo])) {
            $participantId = (int) $existingBySeat[$seatNo]['id'];
            $updateStmt->bind_param(
                'iisssiisi',
                $portalUserId,
                $invitedByUserId,
                $displayName,
                $participantRole,
                $invitationStatus,
                $currentTargetIndex,
                $currentTotalScore,
                $lastThrowAt,
                $participantId
            );
            $updateStmt->execute();
        } else {
            $insertStmt->bind_param(
                'iiiisssiis',
                $sessionId,
                $seatNo,
                $portalUserId,
                $invitedByUserId,
                $displayName,
                $participantRole,
                $invitationStatus,
                $currentTargetIndex,
                $currentTotalScore,
                $lastThrowAt
            );
            $insertStmt->execute();
            $participantId = (int) $insertStmt->insert_id;
        }

        $lookup[$seatNo] = [
            'participantId' => $participantId,
            'portalUserId' => $portalUserId,
            'displayName' => $displayName,
        ];
        $seenSeats[$seatNo] = true;
    }

    foreach ($existingBySeat as $seatNo => $existingParticipant) {
        if (isset($seenSeats[$seatNo])) {
            continue;
        }

        $participantId = (int) $existingParticipant['id'];
        $deactivateStmt->bind_param('i', $participantId);
        $deactivateStmt->execute();
    }

    $insertStmt->close();
    $updateStmt->close();
    $deactivateStmt->close();

    return $lookup;
}

function portal_shanghai_normalize_event(array $event, array $participantLookup = [], int $recordedByUserId = 0): array
{
    $eventType = trim((string) ($event['eventType'] ?? 'state_update'));
    $eventSource = trim((string) ($event['source'] ?? ''));
    $playerIndex = isset($event['playerIndex']) && is_numeric($event['playerIndex'])
        ? (int) $event['playerIndex']
        : null;
    $participant = $playerIndex !== null && isset($participantLookup[$playerIndex])
        ? $participantLookup[$playerIndex]
        : null;

    $playerName = trim((string) ($event['playerName'] ?? ($participant['displayName'] ?? '')));
    $targetLabel = trim((string) ($event['targetLabel'] ?? ''));
    $sectorResult = trim((string) ($event['sectorResult'] ?? ''));
    $scoreDelta = isset($event['scoreDelta']) && is_numeric($event['scoreDelta'])
        ? (int) $event['scoreDelta']
        : 0;
    $scoreAfter = isset($event['scoreAfter']) && is_numeric($event['scoreAfter'])
        ? (int) $event['scoreAfter']
        : 0;
    $detectedAt = trim((string) ($event['detectedAt'] ?? ''));

    $payload = $event['payload'] ?? [];
    if (!is_array($payload)) {
        $payload = ['value' => $payload];
    }

    $playerUserId = portal_shanghai_normalize_portal_user_id(
        $event['playerUserId'] ?? ($participant['portalUserId'] ?? null)
    );
    $participantId = isset($participant['participantId']) ? (int) $participant['participantId'] : null;

    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payloadJson === false) {
        throw new RuntimeException('Ereignis-Payload konnte nicht serialisiert werden.');
    }

    $detectedAtSql = null;
    if ($detectedAt !== '') {
        try {
            $detectedAtSql = (new DateTimeImmutable($detectedAt))->format('Y-m-d H:i:s.u');
        } catch (Throwable) {
            $detectedAtSql = null;
        }
    }

    return [
        'participantId' => $participantId,
        'playerUserId' => $playerUserId,
        'recordedByUserId' => $recordedByUserId > 0 ? $recordedByUserId : null,
        'eventType' => substr($eventType !== '' ? $eventType : 'state_update', 0, 32),
        'eventSource' => substr($eventSource, 0, 32),
        'playerIndex' => $playerIndex,
        'playerName' => substr($playerName !== '' ? $playerName : 'Spieler', 0, 120),
        'targetLabel' => substr($targetLabel, 0, 20),
        'sectorResult' => substr($sectorResult, 0, 32),
        'scoreDelta' => $scoreDelta,
        'scoreAfter' => $scoreAfter,
        'detectedAt' => $detectedAtSql,
        'payloadJson' => $payloadJson,
    ];
}

function portal_shanghai_fetch_session_for_user(mysqli $db, array $config, int $saveId, int $userId, bool $forUpdate = false): ?array
{
    $sql = "SELECT
                s.id,
                s.owner_user_id,
                s.save_name,
                s.participant_summary,
                s.updated_at,
                s.state_json,
                s.event_count,
                s.last_event_at,
                s.participant_count,
                s.is_archived
            FROM {$config['sessions']} s
            WHERE s.id = ?
              AND s.is_deleted = 0
              AND (
                    s.owner_user_id = ?
                    OR EXISTS (
                        SELECT 1
                        FROM {$config['participants']} p
                        WHERE p.session_id = s.id
                          AND p.portal_user_id = ?
                          AND p.is_active = 1
                          AND p.invitation_status IN ('accepted', 'pending')
                    )
              )
            LIMIT 1";

    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }

    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Speicherstand konnte nicht geladen werden.');
    }

    $stmt->bind_param('iii', $saveId, $userId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    return is_array($row) ? $row : null;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = strtolower(trim((string) ($_GET['action'] ?? 'list')));
        $config = portal_shanghai_storage_config((string) ($_GET['gameType'] ?? ''));

        if ($action === 'list') {
            $page = isset($_GET['page']) && is_numeric($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
            $pageSizeInput = isset($_GET['pageSize']) && is_numeric($_GET['pageSize']) ? (int) $_GET['pageSize'] : 10;
            $pageSize = max(1, min(10, $pageSizeInput));
            $offset = ($page - 1) * $pageSize;

            $filterUpdatedAt = trim((string) ($_GET['filterUpdatedAt'] ?? ''));
            $filterSaveName = trim((string) ($_GET['filterSaveName'] ?? ''));
            $filterParticipants = trim((string) ($_GET['filterParticipants'] ?? ''));
            $filterUpdatedAtLike = '%' . $filterUpdatedAt . '%';
            $filterSaveNameLike = '%' . $filterSaveName . '%';
            $filterParticipantsLike = '%' . $filterParticipants . '%';

            $countStmt = $mysqli_user->prepare(
                "SELECT COUNT(*) AS total_count
                 FROM {$config['sessions']} s
                 WHERE s.is_deleted = 0
                   AND (
                        s.owner_user_id = ?
                        OR EXISTS (
                            SELECT 1
                            FROM {$config['participants']} p
                            WHERE p.session_id = s.id
                              AND p.portal_user_id = ?
                              AND p.is_active = 1
                              AND p.invitation_status IN ('accepted', 'pending')
                        )
                   )
                   AND (? = '' OR DATE_FORMAT(s.updated_at, '%d.%m.%Y %H:%i') LIKE ?)
                   AND (? = '' OR s.save_name LIKE ?)
                   AND (? = '' OR s.participant_summary LIKE ?)"
            );
            if (!$countStmt) {
                throw new RuntimeException('Spielstaende konnten nicht geladen werden.');
            }

            $countStmt->bind_param(
                'iissssss',
                $userId,
                $userId,
                $filterUpdatedAt,
                $filterUpdatedAtLike,
                $filterSaveName,
                $filterSaveNameLike,
                $filterParticipants,
                $filterParticipantsLike
            );
            $countStmt->execute();
            $countResult = $countStmt->get_result();
            $countRow = $countResult ? $countResult->fetch_assoc() : null;
            $countStmt->close();
            $totalCount = is_array($countRow) ? (int) ($countRow['total_count'] ?? 0) : 0;

            $stmt = $mysqli_user->prepare(
                "SELECT s.id, s.owner_user_id, s.save_name, s.participant_summary, s.updated_at, s.is_archived
                 FROM {$config['sessions']} s
                 WHERE s.is_deleted = 0
                   AND (
                        s.owner_user_id = ?
                        OR EXISTS (
                            SELECT 1
                            FROM {$config['participants']} p
                            WHERE p.session_id = s.id
                              AND p.portal_user_id = ?
                              AND p.is_active = 1
                              AND p.invitation_status IN ('accepted', 'pending')
                        )
                   )
                   AND (? = '' OR DATE_FORMAT(s.updated_at, '%d.%m.%Y %H:%i') LIKE ?)
                   AND (? = '' OR s.save_name LIKE ?)
                   AND (? = '' OR s.participant_summary LIKE ?)
                 ORDER BY s.updated_at DESC, s.id DESC
                 LIMIT ? OFFSET ?"
            );
            if (!$stmt) {
                throw new RuntimeException('Spielstaende konnten nicht geladen werden.');
            }

            $stmt->bind_param(
                'iissssssii',
                $userId,
                $userId,
                $filterUpdatedAt,
                $filterUpdatedAtLike,
                $filterSaveName,
                $filterSaveNameLike,
                $filterParticipants,
                $filterParticipantsLike,
                $pageSize,
                $offset
            );
            $stmt->execute();
            $result = $stmt->get_result();

            $saves = [];
            while ($result && ($row = $result->fetch_assoc())) {
                $saves[] = [
                    'id' => (int) $row['id'],
                    'saveName' => (string) ($row['save_name'] ?? portal_shanghai_default_save_name($config['gameType'])),
                    'updatedAt' => portal_format_datetime((string) ($row['updated_at'] ?? '')),
                    'participantSummary' => (string) ($row['participant_summary'] ?? ''),
                    'isArchived' => !empty($row['is_archived']),
                    'isOwner' => (int) ($row['owner_user_id'] ?? 0) === $userId,
                ];
            }

            $stmt->close();
            portal_json_response([
                'success' => true,
                'saves' => $saves,
                'totalCount' => $totalCount,
                'page' => $page,
                'pageSize' => $pageSize,
            ]);
        }

        if ($action === 'load') {
            $saveId = isset($_GET['saveId']) && is_numeric($_GET['saveId']) ? (int) $_GET['saveId'] : 0;
            if ($saveId <= 0) {
                throw new InvalidArgumentException('Ungueltiger Speicherstand.');
            }

            $row = portal_shanghai_fetch_session_for_user($mysqli_user, $config, $saveId, $userId);
            if ($row === null) {
                portal_json_response(['success' => false, 'message' => 'Spielstand nicht gefunden.'], 404);
            }

            $state = json_decode((string) ($row['state_json'] ?? '{}'), true);
            if (!is_array($state)) {
                $state = [];
            }

            portal_json_response([
                'success' => true,
                'save' => [
                    'id' => (int) $row['id'],
                    'saveName' => (string) ($row['save_name'] ?? portal_shanghai_default_save_name($config['gameType'])),
                    'updatedAt' => portal_format_datetime((string) ($row['updated_at'] ?? '')),
                    'participantSummary' => (string) ($row['participant_summary'] ?? ''),
                    'eventCount' => (int) ($row['event_count'] ?? 0),
                    'participantCount' => (int) ($row['participant_count'] ?? 0),
                    'isArchived' => !empty($row['is_archived']),
                    'isOwner' => (int) ($row['owner_user_id'] ?? 0) === $userId,
                    'state' => $state,
                ],
            ]);
        }

        throw new InvalidArgumentException('Ungueltige Aktion.');
    }

    portal_require_post_request();

    $input = portal_read_json_input();
    portal_require_csrf_token($input);

    $config = portal_shanghai_storage_config((string) ($input['gameType'] ?? ''));
    $action = strtolower(trim((string) ($input['action'] ?? '')));

    if ($action === 'create') {
        $state = isset($input['state']) && is_array($input['state']) ? $input['state'] : [];
        $stateJson = portal_shanghai_state_json($state);
        $meta = portal_shanghai_state_meta($state, $userId);
        $saveName = portal_shanghai_normalize_save_name($input['saveName'] ?? '', $config['gameType']);

        $mysqli_user->begin_transaction();

        try {
            $stmt = $mysqli_user->prepare(
                "INSERT INTO {$config['sessions']} (
                    owner_user_id,
                    save_name,
                    participant_summary,
                    participants_json,
                    state_json,
                    participant_count
                ) VALUES (?, ?, ?, ?, ?, ?)"
            );
            if (!$stmt) {
                throw new RuntimeException('Speicherstand konnte nicht angelegt werden.');
            }

            $stmt->bind_param('issssi', $userId, $saveName, $meta['participantSummary'], $meta['participantsJson'], $stateJson, $meta['participantCount']);
            $stmt->execute();
            $saveId = (int) $stmt->insert_id;
            $stmt->close();

            portal_shanghai_sync_participants($mysqli_user, $config['participants'], $saveId, $meta['participants']);

            $mysqli_user->commit();
        } catch (Throwable $exception) {
            $mysqli_user->rollback();
            throw $exception;
        }

        portal_json_response([
            'success' => true,
            'message' => 'Speichern aktiviert.',
            'save' => [
                'id' => $saveId,
                'saveName' => $saveName,
                'updatedAt' => portal_format_datetime((new DateTimeImmutable('now'))->format('Y-m-d H:i:s')),
                'participantSummary' => $meta['participantSummary'],
                'participantCount' => $meta['participantCount'],
                'isArchived' => false,
                'isOwner' => true,
                'state' => $state,
            ],
        ]);
    }

    if ($action === 'copy') {
        $sourceSaveId = isset($input['saveId']) && is_numeric($input['saveId']) ? (int) $input['saveId'] : 0;
        if ($sourceSaveId <= 0) {
            throw new InvalidArgumentException('Ungueltiger Speicherstand.');
        }

        $sessionRow = portal_shanghai_fetch_session_for_user($mysqli_user, $config, $sourceSaveId, $userId);
        if ($sessionRow === null) {
            portal_json_response(['success' => false, 'message' => 'Spielstand nicht gefunden.'], 404);
        }

        $copiedState = json_decode((string) ($sessionRow['state_json'] ?? '{}'), true);
        if (!is_array($copiedState)) {
            $copiedState = [];
        }

        if (isset($copiedState['players'][0]) && is_array($copiedState['players'][0])) {
            $copiedState['players'][0]['portalUserId'] = $userId;
            $copiedState['players'][0]['participantRole'] = 'owner';
            $copiedState['players'][0]['invitationStatus'] = 'accepted';
            $copiedState['players'][0]['invitedByUserId'] = null;
        }

        $saveName = portal_shanghai_normalize_save_name(
            $input['saveName'] ?? ((string) ($sessionRow['save_name'] ?? portal_shanghai_default_save_name($config['gameType'])) . ' (Kopie)'),
            $config['gameType']
        );
        $stateJson = portal_shanghai_state_json($copiedState);
        $meta = portal_shanghai_state_meta($copiedState, $userId);
        $sourceEventCount = (int) ($sessionRow['event_count'] ?? 0);
        $sourceLastEventAt = !empty($sessionRow['last_event_at']) ? (string) $sessionRow['last_event_at'] : null;

        $mysqli_user->begin_transaction();

        try {
            $insertSessionStmt = $mysqli_user->prepare(
                "INSERT INTO {$config['sessions']} (
                    owner_user_id,
                    save_name,
                    participant_summary,
                    participants_json,
                    state_json,
                    participant_count,
                    event_count,
                    last_event_at,
                    is_archived
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)"
            );
            if (!$insertSessionStmt) {
                throw new RuntimeException('Speicherstand konnte nicht kopiert werden.');
            }

            $insertSessionStmt->bind_param(
                'issssiis',
                $userId,
                $saveName,
                $meta['participantSummary'],
                $meta['participantsJson'],
                $stateJson,
                $meta['participantCount'],
                $sourceEventCount,
                $sourceLastEventAt
            );
            $insertSessionStmt->execute();
            $saveId = (int) $insertSessionStmt->insert_id;
            $insertSessionStmt->close();

            $participantLookup = portal_shanghai_sync_participants($mysqli_user, $config['participants'], $saveId, $meta['participants']);

            if ($sourceEventCount > 0) {
                $eventSelectStmt = $mysqli_user->prepare(
                    "SELECT
                        e.player_user_id,
                        e.recorded_by_user_id,
                        e.event_no,
                        e.event_type,
                        e.event_source,
                        e.player_index,
                        e.player_name,
                        e.target_label,
                        e.sector_result,
                        e.score_delta,
                        e.score_after,
                        e.detected_at,
                        e.payload_json,
                        p.seat_no
                     FROM {$config['events']} e
                     LEFT JOIN {$config['participants']} p ON p.id = e.participant_id
                     WHERE e.session_id = ?
                     ORDER BY e.event_no ASC"
                );
                if (!$eventSelectStmt) {
                    throw new RuntimeException('Ereignisse konnten nicht kopiert werden.');
                }

                $eventSelectStmt->bind_param('i', $sourceSaveId);
                $eventSelectStmt->execute();
                $eventResult = $eventSelectStmt->get_result();

                $eventInsertStmt = $mysqli_user->prepare(
                    "INSERT INTO {$config['events']} (
                        session_id,
                        participant_id,
                        player_user_id,
                        recorded_by_user_id,
                        event_no,
                        event_type,
                        event_source,
                        player_index,
                        player_name,
                        target_label,
                        sector_result,
                        score_delta,
                        score_after,
                        detected_at,
                        payload_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                );
                if (!$eventInsertStmt) {
                    throw new RuntimeException('Ereignisse konnten nicht kopiert werden.');
                }

                while ($eventResult && ($eventRow = $eventResult->fetch_assoc())) {
                    $seatNo = isset($eventRow['seat_no']) ? (int) $eventRow['seat_no'] : null;
                    $participantId = $seatNo !== null && isset($participantLookup[$seatNo])
                        ? (int) $participantLookup[$seatNo]['participantId']
                        : null;
                    $playerUserId = isset($eventRow['player_user_id']) ? (int) $eventRow['player_user_id'] : null;
                    $recordedByUserId = isset($eventRow['recorded_by_user_id']) ? (int) $eventRow['recorded_by_user_id'] : null;
                    $eventNo = (int) ($eventRow['event_no'] ?? 0);
                    $playerIndex = isset($eventRow['player_index']) ? (int) $eventRow['player_index'] : null;
                    $scoreDelta = (int) ($eventRow['score_delta'] ?? 0);
                    $scoreAfter = (int) ($eventRow['score_after'] ?? 0);
                    $detectedAt = $eventRow['detected_at'] ?? null;
                    $payloadJson = (string) ($eventRow['payload_json'] ?? '{}');
                    $eventType = (string) ($eventRow['event_type'] ?? 'state_update');
                    $eventSource = (string) ($eventRow['event_source'] ?? '');
                    $playerName = (string) ($eventRow['player_name'] ?? 'Spieler');
                    $targetLabel = (string) ($eventRow['target_label'] ?? '');
                    $sectorResult = (string) ($eventRow['sector_result'] ?? '');

                    $eventInsertStmt->bind_param(
                        'iiiiississsiiss',
                        $saveId,
                        $participantId,
                        $playerUserId,
                        $recordedByUserId,
                        $eventNo,
                        $eventType,
                        $eventSource,
                        $playerIndex,
                        $playerName,
                        $targetLabel,
                        $sectorResult,
                        $scoreDelta,
                        $scoreAfter,
                        $detectedAt,
                        $payloadJson
                    );
                    $eventInsertStmt->execute();
                }

                $eventInsertStmt->close();
                $eventSelectStmt->close();
            }

            $mysqli_user->commit();
        } catch (Throwable $exception) {
            $mysqli_user->rollback();
            throw $exception;
        }

        portal_json_response([
            'success' => true,
            'message' => 'Speicherstand kopiert.',
            'save' => [
                'id' => $saveId,
                'saveName' => $saveName,
                'updatedAt' => portal_format_datetime((new DateTimeImmutable('now'))->format('Y-m-d H:i:s')),
                'participantSummary' => $meta['participantSummary'],
                'participantCount' => $meta['participantCount'],
                'eventCount' => $sourceEventCount,
                'isArchived' => false,
                'isOwner' => true,
                'state' => $copiedState,
            ],
        ]);
    }

    if ($action === 'update') {
        $saveId = isset($input['saveId']) && is_numeric($input['saveId']) ? (int) $input['saveId'] : 0;
        if ($saveId <= 0) {
            throw new InvalidArgumentException('Ungueltiger Speicherstand.');
        }

        $state = isset($input['state']) && is_array($input['state']) ? $input['state'] : [];
        $stateJson = portal_shanghai_state_json($state);
        $event = isset($input['event']) && is_array($input['event']) ? $input['event'] : null;

        $mysqli_user->begin_transaction();

        try {
            $sessionRow = portal_shanghai_fetch_session_for_user($mysqli_user, $config, $saveId, $userId, true);
            if ($sessionRow === null) {
                throw new RuntimeException('Speicherstand nicht gefunden.');
            }
            if (!empty($sessionRow['is_archived'])) {
                throw new InvalidArgumentException('Archivierte Speicherstaende koennen nicht geaendert werden.');
            }

            $ownerUserId = (int) ($sessionRow['owner_user_id'] ?? 0);
            $saveName = array_key_exists('saveName', $input)
                ? portal_shanghai_normalize_save_name($input['saveName'], $config['gameType'])
                : portal_shanghai_normalize_save_name((string) ($sessionRow['save_name'] ?? ''), $config['gameType']);
            $meta = portal_shanghai_state_meta($state, $ownerUserId);
            $participantLookup = portal_shanghai_sync_participants($mysqli_user, $config['participants'], $saveId, $meta['participants']);

            $eventCount = (int) ($sessionRow['event_count'] ?? 0);
            $lastEventAt = !empty($sessionRow['last_event_at']) ? (string) $sessionRow['last_event_at'] : null;

            if (is_array($event)) {
                $normalizedEvent = portal_shanghai_normalize_event($event, $participantLookup, $userId);
                $eventNo = $eventCount + 1;

                $eventStmt = $mysqli_user->prepare(
                    "INSERT INTO {$config['events']} (
                        session_id,
                        participant_id,
                        player_user_id,
                        recorded_by_user_id,
                        event_no,
                        event_type,
                        event_source,
                        player_index,
                        player_name,
                        target_label,
                        sector_result,
                        score_delta,
                        score_after,
                        detected_at,
                        payload_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                );
                if (!$eventStmt) {
                    throw new RuntimeException('Wurfdaten konnten nicht gespeichert werden.');
                }

                $participantId = $normalizedEvent['participantId'];
                $playerUserId = $normalizedEvent['playerUserId'];
                $recordedByUserId = $normalizedEvent['recordedByUserId'];
                $playerIndex = $normalizedEvent['playerIndex'];
                $eventStmt->bind_param(
                    'iiiiississsiiss',
                    $saveId,
                    $participantId,
                    $playerUserId,
                    $recordedByUserId,
                    $eventNo,
                    $normalizedEvent['eventType'],
                    $normalizedEvent['eventSource'],
                    $playerIndex,
                    $normalizedEvent['playerName'],
                    $normalizedEvent['targetLabel'],
                    $normalizedEvent['sectorResult'],
                    $normalizedEvent['scoreDelta'],
                    $normalizedEvent['scoreAfter'],
                    $normalizedEvent['detectedAt'],
                    $normalizedEvent['payloadJson']
                );
                $eventStmt->execute();
                $eventStmt->close();

                $eventCount = $eventNo;
                $lastEventAt = $normalizedEvent['detectedAt'] ?? (new DateTimeImmutable('now'))->format('Y-m-d H:i:s.u');
            }

            $updateStmt = $mysqli_user->prepare(
                "UPDATE {$config['sessions']}
                 SET save_name = ?,
                     participant_summary = ?,
                     participants_json = ?,
                     state_json = ?,
                     participant_count = ?,
                     event_count = ?,
                     last_event_at = COALESCE(?, last_event_at)
                 WHERE id = ? AND is_deleted = 0"
            );
            if (!$updateStmt) {
                throw new RuntimeException('Spielstand konnte nicht aktualisiert werden.');
            }

            $updateStmt->bind_param(
                'ssssiisi',
                $saveName,
                $meta['participantSummary'],
                $meta['participantsJson'],
                $stateJson,
                $meta['participantCount'],
                $eventCount,
                $lastEventAt,
                $saveId
            );
            $updateStmt->execute();
            $updateStmt->close();

            $mysqli_user->commit();
        } catch (Throwable $exception) {
            $mysqli_user->rollback();
            throw $exception;
        }

        portal_json_response([
            'success' => true,
            'message' => 'Spielstand gespeichert.',
            'save' => [
                'id' => $saveId,
                'saveName' => $saveName,
                'participantSummary' => $meta['participantSummary'],
                'participantCount' => $meta['participantCount'],
                'eventCount' => $eventCount,
                'isArchived' => false,
                'isOwner' => (int) ($ownerUserId ?? 0) === $userId,
            ],
        ]);
    }

    if ($action === 'rename') {
        $saveId = isset($input['saveId']) && is_numeric($input['saveId']) ? (int) $input['saveId'] : 0;
        if ($saveId <= 0) {
            throw new InvalidArgumentException('Ungueltiger Speicherstand.');
        }

        $sessionRow = portal_shanghai_fetch_session_for_user($mysqli_user, $config, $saveId, $userId);
        if ($sessionRow === null) {
            portal_json_response(['success' => false, 'message' => 'Spielstand nicht gefunden.'], 404);
        }

        if (!empty($sessionRow['is_archived'])) {
            throw new InvalidArgumentException('Archivierte Speicherstaende koennen nicht umbenannt werden.');
        }
        if ((int) ($sessionRow['owner_user_id'] ?? 0) !== $userId) {
            portal_json_response(['success' => false, 'message' => 'Nur der Besitzer kann diesen Speicherstand umbenennen.'], 403);
        }

        $saveName = portal_shanghai_normalize_save_name($input['saveName'] ?? '', $config['gameType']);

        $stmt = $mysqli_user->prepare(
            "UPDATE {$config['sessions']}
             SET save_name = ?
             WHERE id = ? AND is_deleted = 0"
        );
        if (!$stmt) {
            throw new RuntimeException('Speicherstand konnte nicht umbenannt werden.');
        }

        $stmt->bind_param('si', $saveName, $saveId);
        $stmt->execute();
        $stmt->close();

        portal_json_response([
            'success' => true,
            'message' => 'Speicherstandsname gespeichert.',
            'save' => [
                'id' => $saveId,
                'saveName' => $saveName,
                'updatedAt' => portal_format_datetime((new DateTimeImmutable('now'))->format('Y-m-d H:i:s')),
                'participantSummary' => (string) ($sessionRow['participant_summary'] ?? ''),
                'isArchived' => !empty($sessionRow['is_archived']),
                'isOwner' => true,
            ],
        ]);
    }

    if ($action === 'archive' || $action === 'reactivate') {
        $saveId = isset($input['saveId']) && is_numeric($input['saveId']) ? (int) $input['saveId'] : 0;
        if ($saveId <= 0) {
            throw new InvalidArgumentException('Ungueltiger Speicherstand.');
        }

        $sessionRow = portal_shanghai_fetch_session_for_user($mysqli_user, $config, $saveId, $userId);
        if ($sessionRow === null) {
            portal_json_response(['success' => false, 'message' => 'Spielstand nicht gefunden.'], 404);
        }
        if ((int) ($sessionRow['owner_user_id'] ?? 0) !== $userId) {
            portal_json_response(['success' => false, 'message' => 'Nur der Besitzer kann diesen Speicherstand archivieren.'], 403);
        }

        $shouldArchive = $action === 'archive';
        $stmt = $mysqli_user->prepare(
            "UPDATE {$config['sessions']}
             SET is_archived = ?,
                 archived_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP(3) ELSE NULL END
             WHERE id = ? AND owner_user_id = ? AND is_deleted = 0"
        );
        if (!$stmt) {
            throw new RuntimeException('Archivstatus konnte nicht gespeichert werden.');
        }

        $archiveFlag = $shouldArchive ? 1 : 0;
        $stmt->bind_param('iiii', $archiveFlag, $archiveFlag, $saveId, $userId);
        $stmt->execute();
        $stmt->close();

        portal_json_response([
            'success' => true,
            'message' => $shouldArchive ? 'Speicherstand archiviert.' : 'Speicherstand reaktiviert.',
            'save' => [
                'id' => $saveId,
                'saveName' => (string) ($sessionRow['save_name'] ?? portal_shanghai_default_save_name($config['gameType'])),
                'updatedAt' => portal_format_datetime((new DateTimeImmutable('now'))->format('Y-m-d H:i:s')),
                'participantSummary' => (string) ($sessionRow['participant_summary'] ?? ''),
                'isArchived' => $shouldArchive,
                'isOwner' => true,
            ],
        ]);
    }

    if ($action === 'delete') {
        $saveId = isset($input['saveId']) && is_numeric($input['saveId']) ? (int) $input['saveId'] : 0;
        if ($saveId <= 0) {
            throw new InvalidArgumentException('Ungueltiger Speicherstand.');
        }

        $stmt = $mysqli_user->prepare(
            "UPDATE {$config['sessions']}
             SET is_deleted = 1,
                 deleted_at = CURRENT_TIMESTAMP(3)
             WHERE id = ? AND owner_user_id = ? AND is_deleted = 0"
        );
        if (!$stmt) {
            throw new RuntimeException('Speicherstand konnte nicht geloescht werden.');
        }

        $stmt->bind_param('ii', $saveId, $userId);
        $stmt->execute();
        $affectedRows = $stmt->affected_rows;
        $stmt->close();

        if ($affectedRows < 1) {
            portal_json_response(['success' => false, 'message' => 'Speicherstand nicht gefunden oder keine Berechtigung.'], 404);
        }

        portal_json_response(['success' => true, 'message' => 'Speicherstand geloescht.']);
    }

    throw new InvalidArgumentException('Ungueltige Aktion.');
} catch (InvalidArgumentException $exception) {
    portal_json_response(['success' => false, 'message' => $exception->getMessage()], 400);
} catch (Throwable $exception) {
    error_log('Shanghai Storage Fehler: ' . $exception->getMessage());
    portal_json_response(['success' => false, 'message' => 'Spielstand konnte nicht verarbeitet werden.'], 500);
}
