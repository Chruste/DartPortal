<?php include '../header.php'; ?>

<div class="container">
  <h2>Einstellungen</h2>
  <form id="settings-form">
    <label for="scoliaSerial">Scolia Seriennummer:</label>
    <br>
    <input type="text" id="scoliaSerial" required>
    <br>
    <br>
    <label for="scoliaToken">Scolia Access Token:</label>
    <br>
    <input type="text" id="scoliaToken" required>
    <br>
    <br>
    <label for="mysqlHost">MySQL Host:</label>
    <br>
    <input type="text" id="mysqlHost" required>
    <br>
    <br>
    <label for="mysqlDb">MySQL Datenbank:</label>
    <br>
    <input type="text" id="mysqlDb" required>
    <br>
    <br>
    <label for="mysqlUser">MySQL Benutzername:</label>
    <br>
    <input type="text" id="mysqlUser" required>
    <br>
    <br>
    <label for="mysqlPass">MySQL Passwort:</label>
    <br>
    <input type="password" id="mysqlPass" required>
    <br>
    <br>
    <button type="submit">Speichern</button>
  </form>
</div>

<script src="einstellungen.js"></script>

<?php include '../footer.php'; ?>