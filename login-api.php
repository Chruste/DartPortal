<?php
declare(strict_types=1);

header('Content-Type: application/json');
http_response_code(410);
echo json_encode([
    'success' => false,
    'message' => 'Dieser Endpunkt wurde ersetzt. Bitte /google-login.php verwenden.',
]);