<?php
// header.php
require_once __DIR__ . '/session_bootstrap.php';

$isAuthenticated = isset($_SESSION['user_id']);
$displayName = $_SESSION['username'] ?? 'Login';
?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $pageTitle ?? 'Portal'; ?></title>
  <link rel="stylesheet" href="/portal.css">
  <link rel="manifest" href="/manifest.json">
  <?= $extraHead ?? '' ?>
</head>
<body>
  <!-- Sidebar -->
  <div id="sidebar" class="sidebar">
    <button id="toggleSidebar" aria-label="Sidebar umschalten">☰</button>
    <nav>
      <ul>
        <li><a href="/index.php" data-title="Home">Home</a></li>
        <li><a href="/shanghai21/index.php" data-title="Shanghai 21">Shanghai 21</a></li>
        <li><a href="/shanghai42/index.php" data-title="Shanghai 42">Shanghai 42</a></li>
        <li><a href="/dartball/index.php" data-title="Dartball">Dartball</a></li>
        <li><a href="/turnierplaner/turnierplaner.php" data-title="Turnierplaner">Turnierplaner</a></li>
        <li><a href="/einstellungen/einstellungen.php" data-title="Einstellungen">Einstellungen</a></li>
        <li><a href="/login.php" data-title="Anmeldung">Anmeldung</a></li>
      </ul>
    </nav>
  </div>
  <!-- Main Content -->
  <div id="main">
    <header class="topbar">
      <button id="mobileMenuButton" class="mobile-menu-button" aria-label="Menü">☰</button>
      <h1 id="pageTitle"><?= $pageTitle ?? 'Home'; ?></h1>
      <div class="topbar-actions">
        <?php if ($isAuthenticated): ?>
          <a href="/einstellungen/einstellungen.php" id="userInfo" class="username">
            <?= htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8'); ?>
          </a>
          <a href="/logout.php" class="logout-link">Logout</a>
        <?php else: ?>
          <a href="/login.php" id="userInfo" class="username">Login</a>
        <?php endif; ?>
      </div>
    </header>
    <section class="content">