<?php
declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';
header('Content-Type: application/json');
http_response_code(410);
echo json_encode([
    'success' => false,
    'message' => 'Dieser Endpunkt ist veraltet und wurde deaktiviert.',
]);
