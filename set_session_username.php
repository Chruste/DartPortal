<?php
session_start();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$mysqlUser = $data['mysqlUser'] ?? null;

if($mysqlUser){
    $_SESSION['mysqlUser'] = $mysqlUser;
    echo json_encode(['success' => true, 'message' => 'Username gesetzt.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Kein Username erhalten.']);
}
