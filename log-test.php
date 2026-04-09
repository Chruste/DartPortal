<?php

declare(strict_types=1);

define('PORTAL_LOG_ROTATION_MAX_BYTES', 2048);

require __DIR__ . '/session_bootstrap.php';
require __DIR__ . '/portal_social_lib.php';

$userId = portal_require_authenticated_user();

$count = isset($_GET['count']) && is_numeric($_GET['count']) ? (int) $_GET['count'] : 24;
$count = max(1, min($count, 200));

$testId = bin2hex(random_bytes(4));
$logFile = portal_log_file_path();
$rotatedFile = $logFile . '.1';

for ($index = 1; $index <= $count; $index++) {
    portal_log_error('Browser-Log-Test', null, [
        'testId' => $testId,
        'userId' => $userId,
        'entry' => $index,
        'payload' => str_repeat('X', 180),
    ]);
}

clearstatcache(true, $logFile);
clearstatcache(true, $rotatedFile);

portal_json_response([
    'success' => true,
    'message' => 'Log-Test ausgefuehrt.',
    'testId' => $testId,
    'rotationLimitBytes' => PORTAL_LOG_ROTATION_MAX_BYTES,
    'entriesWritten' => $count,
    'logFile' => 'private_config/dartportal_error.log',
    'logExists' => is_file($logFile),
    'logSize' => is_file($logFile) ? filesize($logFile) : 0,
    'rotatedExists' => is_file($rotatedFile),
    'rotatedFile' => 'private_config/dartportal_error.log.1',
    'rotatedSize' => is_file($rotatedFile) ? filesize($rotatedFile) : 0,
]);