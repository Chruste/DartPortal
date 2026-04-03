<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';
require __DIR__ . '/db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => true, 'serialNumber' => '', 'accessToken' => '']);
    exit;
}

$userId = (int) $_SESSION['user_id'];

$stmt = $mysqli->prepare(
    'SELECT serial_number, api_token FROM scolia_config WHERE user_id = ? LIMIT 1'
);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB-Fehler.']);
    exit;
}

$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();
$row = $result ? $result->fetch_assoc() : null;
$stmt->close();

if (!is_array($row)) {
    echo json_encode(['success' => true, 'serialNumber' => '', 'accessToken' => '']);
    exit;
}

echo json_encode([
    'success'      => true,
    'serialNumber' => $row['serial_number'],
    'accessToken'  => $row['api_token'],
]);
