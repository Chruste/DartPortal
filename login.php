<?php
require __DIR__ . '/session_bootstrap.php';
$pageTitle = 'Anmeldung';
$username  = $_SESSION['username'] ?? null;

if (isset($_SESSION['user_id'])) {
  header('Location: /index.php');
  exit;
}

$error = $_GET['error'] ?? '';
$info = $_GET['info'] ?? '';
include __DIR__ . '/header.php';
?>
<form id="loginForm">
  <h2>Anmeldung mit Google</h2>
  <p class="login-note">Melde dich mit deinem Google-Konto an. Beim ersten Login wird dein Benutzer automatisch erstellt.</p>

  <?php if ($info === 'abgemeldet'): ?>
    <p class="login-message success">Du wurdest erfolgreich abgemeldet.</p>
  <?php endif; ?>

  <?php if ($error !== ''): ?>
    <p class="login-message error">Anmeldung fehlgeschlagen (<?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?>).</p>
  <?php endif; ?>

  <button type="button" id="btnGoogleLogin" class="oauth-button">Mit Google anmelden</button>
</form>
<script src="/script-login.js"></script>
<?php include __DIR__ . '/footer.php'; ?>