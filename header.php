<?php
// header.php
require_once __DIR__ . '/session_bootstrap.php';

$isAuthenticated = isset($_SESSION['user_id']);
$displayName = $_SESSION['username'] ?? 'Login';
$navAuthLabel = $isAuthenticated ? 'Ausloggen' : 'Anmeldung';
$assetVersion = portal_asset_version();
?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $pageTitle ?? 'Portal'; ?></title>
  <link rel="icon" type="image/x-icon" href="/img/favicon.ico">
  <link rel="shortcut icon" href="/img/favicon.ico">
  <link rel="apple-touch-icon" href="/img/favicon.ico">
  <link rel="stylesheet" href="<?= htmlspecialchars(portal_asset_url('/portal.css'), ENT_QUOTES, 'UTF-8'); ?>">
  <link rel="manifest" href="<?= htmlspecialchars(portal_asset_url('/manifest.json'), ENT_QUOTES, 'UTF-8'); ?>">
  <script>window.PORTAL_ASSET_VERSION = <?= json_encode($assetVersion, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;</script>
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
        <li><a href="/profil/profil.php" data-title="Profil und Freunde">Profil und Freunde</a></li>
        <li>
          <?php if ($isAuthenticated): ?>
            <form method="post" action="/logout.php" class="sidebar-nav-form">
              <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
              <button type="submit" class="sidebar-nav-button" data-title="<?= $navAuthLabel; ?>"><?= $navAuthLabel; ?></button>
            </form>
          <?php else: ?>
            <a href="/login.php" data-title="<?= $navAuthLabel; ?>"><?= $navAuthLabel; ?></a>
          <?php endif; ?>
        </li>
      </ul>
    </nav>
  </div>
  <!-- Main Content -->
  <div id="main">
    <header class="topbar">
      <button id="mobileMenuButton" class="mobile-menu-button" aria-label="Menü">☰</button>
      <h1 id="pageTitle"><?= $pageTitle ?? 'Home'; ?></h1>
      <div class="topbar-refresh-wrap">
        <button id="topbarZoomOutButton" class="topbar-refresh-button" type="button" title="Ansicht verkleinern" aria-label="Ansicht verkleinern">➖</button>
        <button id="topbarZoomInButton" class="topbar-refresh-button" type="button" title="Ansicht vergroessern" aria-label="Ansicht vergroessern">➕</button>
        <button id="topbarRefreshButton" class="topbar-refresh-button" type="button" title="Seite aktualisieren" aria-label="Seite aktualisieren">🔄</button>
      </div>
      <div class="topbar-actions">
        <?php if ($isAuthenticated): ?>
          <a href="/profil/profil.php" id="userInfo" class="username">
            <?= htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8'); ?>
          </a>
          <form method="post" action="/logout.php" class="logout-form">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
            <button type="submit" class="logout-link" aria-label="Abmelden">Logout</button>
          </form>
        <?php else: ?>
          <a href="/login.php" id="userInfo" class="username">Login</a>
        <?php endif; ?>
      </div>
    </header>
    <section class="content">