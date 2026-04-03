<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => true, 'serialNumber' => '', 'accessToken' => '']);
    exit;
}

try {
    require __DIR__ . '/db.php';
} catch (Throwable $e) {
    echo json_encode(['success' => true, 'serialNumber' => '', 'accessToken' => '']);
    exit;
}

$userId = (int) $_SESSION['user_id'];

$stmt = $mysqli->prepare(
    'SELECT serial_number, api_token FROM scolia_config WHERE user_id = ? LIMIT 1'
);
if (!$stmt) {
    echo json_encode(['success' => true, 'serialNumber' => '', 'accessToken' => '']);
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
