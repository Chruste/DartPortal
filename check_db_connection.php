<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

$host = $data['host'] ?? '';
$db   = $data['db']   ?? '';
$user = $data['user'] ?? '';
$pass = $data['pass'] ?? '';

$conn = @new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'DB-Verbindung fehlgeschlagen.']);
} else {
    echo json_encode(['success' => true, 'message' => 'DB-Verbindung erfolgreich.']);
    $conn->close();
}
