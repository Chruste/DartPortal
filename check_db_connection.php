<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

$mysqlHost = $data['mysqlHost'] ?? '';
$mysqlDb   = $data['mysqlDb']   ?? '';
$mysqlUser = $data['mysqlUser'] ?? '';
$mysqlPass = $data['mysqlPass'] ?? '';

$conn = @new mysqli($mysqlHost, $mysqlUser, $mysqlPass, $mysqlDb);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'DB-Verbindung fehlgeschlagen.']);
} else {
    echo json_encode(['success' => true, 'message' => 'DB-Verbindung erfolgreich.']);
    $conn->close();
}
