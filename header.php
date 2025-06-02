<?php
// header.php
?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $pageTitle ?? 'Portal'; ?></title>
  <link rel="stylesheet" href="/portal.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <!-- Sidebar -->
  <div id="sidebar" class="sidebar">
    <button id="toggleSidebar" aria-label="Sidebar umschalten">☰</button>
    <nav>
      <ul>
        <li><a href="/index.php" data-title="Home">Home</a></li>
        <li><a href="/shanghai21/index.php" data-title="Shanghai 21">Shanghai 21</a></li>
        <li><a href="/turnierplaner/turnierplaner.php" data-title="Turnierplaner">Turnierplaner</a></li>
        <li><a href="/einstellungen/einstellungen.php" data-title="Einstellungen">Einstellungen</a></li>
      </ul>
    </nav>
  </div>
  <!-- Main Content -->
  <div id="main">
    <header class="topbar">
      <button id="mobileMenuButton" class="mobile-menu-button" aria-label="Menü">☰</button>
      <h1 id="pageTitle"><?= $pageTitle ?? 'Home'; ?></h1>
      <a href="../einstellungen/einstellungen.php"  id="userInfo" class="mysqlUser">
        <?php echo $_SESSION['mysqlUser'] ?? 'Login'; ?> <!-- dein mysqlUser aus Session oder anderem Speicher -->
      </a>
    </header>
    <section class="content">