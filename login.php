<?php
session_start();
$pageTitle = 'DB-Login';
$username  = $_SESSION['username'] ?? null;
include __DIR__ . '/header.php';
?>
<form id="loginForm">
  <input id="dbUser" placeholder="DB User"><br>
  <input id="dbPass" type="password" placeholder="DB Passwort"><br>
  <button type="button" id="btnLogin">Login</button>
</form>
<pre id="output"></pre>
<script src="/script-login.js"></script>
<?php include __DIR__ . '/footer.php'; ?>