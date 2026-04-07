<?php
require __DIR__ . '/../session_bootstrap.php';
$pageTitle = 'Shanghai 42';
$username  = $_SESSION['username'] ?? null;
$isAuthenticated = isset($_SESSION['user_id']);
$extraHead = '<link rel="stylesheet" href="/shanghai42/styles.css">';
include __DIR__ . '/../header.php';
?>
  <!-- Haupt-App -->
  <div id="appContainer">
    <header>
      <img src="img/headline.png" alt="Shanghai 42">
    </header>
    <?php if ($isAuthenticated): ?>
      <div id="status">Board-Status: –</div>
    <?php endif; ?>
    
    <!-- Manuelle Eingabe -->
    <div id="manualInput">
      <input id="manualSector" placeholder="Sektor" />
      <button id="manualSubmit">Eingeben</button>
    </div>
    <div id="manualButtons">
      <button id="btnMiss">Miss</button>
      <button id="btnSingle">Single</button>
      <button id="btnDouble">Double</button>
      <button id="btnTriple">Triple</button>
    </div>
    
    <!-- Edit-Controls -->
    <div id="controlButtons">
      <div class="left-buttons">
        <button id="autoPlayerBtn" title="Automatischen Spielerwechsel aktivieren" disabled>Manueller Wechsel</button>
        <button id="manualPlayerBtn" title="Manuellen Spielerwechsel aktivieren" style="display:none;">Automat. Wechsel</button>
        <button id="addPlayerButton">Spieler kopieren</button>
      </div>
      <div class="center-buttons">
        <button id="editButton">Bearbeiten</button>
        <button id="saveButton" style="display:none;">Speichern</button>
      </div>
      <div class="right-buttons">
        <button id="undoButton" style="visibility:hidden; pointer-events:none;">Rückgängig</button>
      </div>
    </div>
    
    <div id="tablesContainer"></div>
  </div>

  <!-- Login-Handler -->
  <script src="script.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      fetch('/scolia-config.php')
        .then(r => r.json())
        .then(data => {
          window.SCOLIA_CONFIG = { serialNumber: data.serialNumber || '', accessToken: data.accessToken || '' };
          initApp();
        })
        .catch(() => { window.SCOLIA_CONFIG = { serialNumber: '', accessToken: '' }; initApp(); });
    });
  </script>

<?php include __DIR__ . '/../footer.php'; ?>
