<?php
// db.php
header('Content-Type: application/json');
$input = json_decode(file_get_contents('php://input'), true);
$host  = 'chruste.lima-db.de';
$db    = 'db_447002_2';
$user  = $input['dbUser'] ?? '';
$pw    = $input['dbPass'] ?? '';

$mysqli = new mysqli($host, $user, $pw, $db);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'DB-Connection failed']);
    exit;
}
$mysqli->set_charset('utf8mb4');