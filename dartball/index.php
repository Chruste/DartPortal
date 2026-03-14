<?php
session_start();
$pageTitle = 'Dartball';
$username  = $_SESSION['username'] ?? null;
include __DIR__ . '/../header.php';
?>

<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>"Shanghai 21" v3.1 Scolia Dartspiel</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Login-Maske -->
  <div id="loginContainer">
    <h2>Anmelden</h2>
    <input id="loginSerial" placeholder="Serial Number" />
    <input id="loginToken" placeholder="Access Token" />
    <button id="loginButton">Login</button>
  </div>

  <!-- Haupt-App (versteckt bis Login) -->
  <div id="appContainer" style="display:none;">
    <header>
      <img src="img/headline.png" alt="Shanghai 21">
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
  <!-- Auto-Login bei vorhandenen Credentials -->
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const saved = localStorage.getItem('scoliaConfig');
      if (saved) {
        try {
          window.SCOLIA_CONFIG = JSON.parse(saved);
          document.getElementById('loginContainer').style.display = 'none';
          document.getElementById('appContainer').style.display = 'block';
          initApp();
        } catch (e) {
          localStorage.removeItem('scoliaConfig');
        }
      }
    });
  </script>
  <script>
    document.getElementById('loginButton').addEventListener('click', () => {
      const s = document.getElementById('loginSerial').value.trim();
      const t = document.getElementById('loginToken').value.trim();
      if (!s || !t) return alert('Bitte Serial Number und Access Token eingeben');
      window.SCOLIA_CONFIG = { serialNumber: s, accessToken: t };
      localStorage.setItem('scoliaConfig', JSON.stringify(window.SCOLIA_CONFIG));
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('appContainer').style.display = 'block';
      initApp();
    });
  </script>
</body>
</html>

<?php include __DIR__ . '/../footer.php'; ?>