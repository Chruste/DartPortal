<?php
session_start();
require __DIR__ . '/db.php';

$sql = "SELECT Name FROM user WHERE hatScolia=1";
if ($res = $mysqli->query($sql)) {
    if ($row = $res->fetch_assoc()) {
        $_SESSION['username'] = $row['Name'];
        echo json_encode(['success'=>true,'user'=>$row]);
    } else {
        echo json_encode(['success'=>false,'message'=>'Ungültige Daten']);
    }
    $res->close();
} else {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'DB-Query fehlgeschlagen']);
}