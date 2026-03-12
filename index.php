<?php
session_start();
$pageTitle = 'Home';
$username  = $_SESSION['username'] ?? null;
include __DIR__ . '/header.php';
?>
<h2>Willkommen!</h2>
<p>Wähle ein Spiel aus der Sidebar.</p>
<?php include __DIR__ . '/footer.php'; ?>