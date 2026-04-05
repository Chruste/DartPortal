<?php
require __DIR__ . '/session_bootstrap.php';
$pageTitle = 'Home';
$username  = $_SESSION['username'] ?? null;
include __DIR__ . '/header.php';
?>
<h2>Willkommen<?= $username ? ', ' . htmlspecialchars($username, ENT_QUOTES, 'UTF-8') : '' ?>!</h2>

<div class="tile-grid">
  <a href="/shanghai21/index.php" class="tile">
    <img src="/shanghai21/img/icon-192.png" alt="Shanghai 21">
    <span class="tile-title">Shanghai 21</span>
  </a>
  <a href="/shanghai42/index.php" class="tile">
    <img src="/shanghai42/img/icon-192.png" alt="Shanghai 42">
    <span class="tile-title">Shanghai 42</span>
  </a>
  <a href="/dartball/index.php" class="tile">
    <img src="/dartball/img/icon-192.png" alt="Dartball">
    <span class="tile-title">Dartball</span>
  </a>
  <a href="/turnierplaner/turnierplaner.php" class="tile">
    <span class="tile-icon">🏆</span>
    <span class="tile-title">Turnierplaner</span>
  </a>
  <a href="/profil/profil.php" class="tile">
    <span class="tile-icon">👤</span>
    <span class="tile-title">Profil &amp; Freunde</span>
  </a>
</div>

<?php include __DIR__ . '/footer.php'; ?>