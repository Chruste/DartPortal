<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';
require __DIR__ . '/db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Nicht eingeloggt.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Nur POST erlaubt.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$serial = isset($input['serialNumber']) && is_string($input['serialNumber'])
    ? trim($input['serialNumber']) : '';
$token  = isset($input['accessToken']) && is_string($input['accessToken'])
    ? trim($input['accessToken']) : '';

if ($serial === '' || $token === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Seriennummer und Token dürfen nicht leer sein.']);
    exit;
}

$userId = (int) $_SESSION['user_id'];

$stmt = $mysqli->prepare(
    'INSERT INTO scolia_config (user_id, serial_number, api_token)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE serial_number = VALUES(serial_number), api_token = VALUES(api_token)'
);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB-Fehler.']);
    exit;
}

$stmt->bind_param('iss', $userId, $serial, $token);
$stmt->execute();
$stmt->close();

echo json_encode(['success' => true, 'message' => 'Scolia-Konfiguration gespeichert.']);
