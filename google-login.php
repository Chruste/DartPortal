<?php

declare(strict_types=1);

require __DIR__ . '/session_bootstrap.php';

require __DIR__ . '/oauth_config.php';

$config = oauth_google_config();
oauth_require_config($config);

$state = bin2hex(random_bytes(32));
$_SESSION['oauth_state'] = $state;

$params = [
    'client_id' => $config['client_id'],
    'redirect_uri' => oauth_redirect_uri($config),
    'response_type' => 'code',
    'scope' => 'openid email profile',
    'state' => $state,
    'prompt' => 'select_account',
    'access_type' => 'online',
];

$authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
header('Location: ' . $authUrl);
exit;
