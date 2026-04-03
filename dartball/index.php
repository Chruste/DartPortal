<?php
require __DIR__ . '/../session_bootstrap.php';
$pageTitle = 'Dartball';
$username  = $_SESSION['username'] ?? null;
$extraHead = '<link rel="stylesheet" href="/dartball/styles.css">';
include __DIR__ . '/../header.php';
?>
  <!-- Haupt-App -->
  <div id="appContainer">
    <header>
      <img src="img/headline.png" alt="Dartball">
    </header>
    <div id="status">Board-Status: –</div>
    <div id="manualInput">
      <input id="manualSector" placeholder="z.B. D20 oder Bull eingeben">
      <button id="manualSubmit">Manuellen Wurf hinzufügen</button>
    </div>
    <div id="manualButtons">
      <button id="btnMiss">Fehlwurf</button>
      <button id="btnSingle">Single</button>
      <button id="btnDouble">Double</button>
      <button id="btnTriple">Triple</button>
    </div>
    <table id="resultsTable">
      <thead>
        <tr><th>Ziel</th><th>Punkte</th><th>Treffer</th></tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr class="current-row"><td>Total</td><td id="sumCell">0</td><td></td></tr>
      </tfoot>
    </table>
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
        .catch(() => { initApp(); });
    });
  </script>

<?php include __DIR__ . '/../footer.php'; ?>