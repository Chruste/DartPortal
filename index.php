<?php
session_start();
$pageTitle = 'Home';
include __DIR__ . '/header.php';
?>
<h2>Willkommen!</h2>

<div class="tile-container">
  <a class="tile" href="/shanghai21/index.php">
    <span>Shanghai 21</span>
  </a>
  <a class="tile" href="/turnierplaner/turnierplaner.php">
    <span>Turnierplaner</span>
  </a>
  <a class="tile" href="/einstellungen/einstellungen.php">
    <span>Einstellungen</span>
  </a>
</div>

<?php include __DIR__ . '/footer.php'; ?>