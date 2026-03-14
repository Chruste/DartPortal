<?php
session_start();
$pageTitle = 'Shanghai 21';
$username  = $_SESSION['username'] ?? null;
include __DIR__ . '/../header.php';
?>

<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>"Shanghai 21" v2.0 Scolia Dartspiel</title>
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
    <button id="addPlayerButton">Spieler hinzufügen</button>
    <div id="tablesContainer"></div>
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