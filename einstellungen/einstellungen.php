<?php
require __DIR__ . '/../session_bootstrap.php';
$pageTitle = 'Einstellungen';
include '../header.php';
?>

<div class="container">
  <h2>Einstellungen</h2>
  <form id="settings-form">
    <label for="scoliaSerial">Scolia Seriennummer:</label>
    <br>
    <input type="text" id="scoliaSerial" autocomplete="off">
    <br>
    <br>
    <label for="scoliaToken">Scolia Access Token:</label>
    <br>
    <input type="text" id="scoliaToken" autocomplete="off">
    <br>
    <br>
    <p id="scolia-status"></p>
    <button type="submit">Speichern</button>
  </form>
</div>

<script src="einstellungen.js"></script>

<?php include '../footer.php'; ?>