<?php
require __DIR__ . '/../session_bootstrap.php';
$pageTitle = 'Profil und Freunde';
$extraHead = '<link rel="stylesheet" href="' . htmlspecialchars(portal_asset_url('/profil/profil.css'), ENT_QUOTES, 'UTF-8') . '">';

if (!isset($_SESSION['user_id'])) {
    header('Location: /login.php');
    exit;
}

include '../header.php';
?>

<div class="profile-friends-page" data-csrf-token="<?= htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
  <section class="profile-card">
    <h2>Profil</h2>
    <form id="profile-form" class="profile-form">
      <div class="form-grid">
        <label class="form-field" for="displayName">
          <span>Anzeigename</span>
          <input type="text" id="displayName" name="displayName" autocomplete="off" maxlength="60" required>
        </label>
        <label class="form-field" for="scoliaSerial">
          <span>Scolia Seriennummer</span>
          <input type="text" id="scoliaSerial" name="scoliaSerial" autocomplete="off" maxlength="191">
        </label>
        <label class="form-field form-field-wide" for="scoliaToken">
          <span>Scolia Access Token</span>
          <input type="text" id="scoliaToken" name="scoliaToken" autocomplete="off" maxlength="191">
        </label>
      </div>
      <div class="profile-actions">
        <p id="profile-status" class="section-status" aria-live="polite"></p>
        <button type="submit" class="primary-button">Speichern</button>
      </div>
    </form>
  </section>

  <section class="profile-card">
    <div class="section-header">
      <h2>Freunde</h2>
      <p>Verwalte aktive Freundschaften und verschicke neue Einladungen.</p>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Letzter Login</th>
            <th>Entfernen</th>
          </tr>
        </thead>
        <tbody id="friends-table-body">
          <tr class="empty-row">
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <form id="friend-search-form" class="search-form">
      <input type="text" id="friend-search-input" name="friendSearch" placeholder="Name oder ID eingeben" autocomplete="off">
      <button type="submit" class="primary-button">Suchen</button>
    </form>
    <p id="friend-search-status" class="section-status" aria-live="polite"></p>

    <section id="search-results-section" class="subsection is-hidden">
      <h3>Suchergebnisse</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Letzter Login</th>
              <th>Hinzufügen</th>
            </tr>
          </thead>
          <tbody id="search-results-body">
            <tr class="empty-row">
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="invitations-section" class="subsection is-hidden">
      <h3>Offene Einladungen</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Letzter Login</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="invitations-table-body">
            <tr class="empty-row">
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="game-invitations-section" class="subsection is-hidden">
      <div class="section-header compact-header">
        <h3>Spiel Einladungen</h3>
        <p>Angenommene Einladungen fuegen dich direkt als Spieler zum betreffenden Spiel hinzu.</p>
      </div>
      <p id="game-invitations-status" class="section-status" aria-live="polite"></p>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Spiel</th>
              <th>Speicherstand</th>
              <th>Von</th>
              <th>Aktualisiert</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody id="game-invitations-body">
            <tr class="empty-row">
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="sent-game-invitations-section" class="subsection is-hidden">
      <div class="section-header compact-header">
        <h3>Gesendete Spiel Einladungen</h3>
        <p>Hier siehst du laufende und abgelehnte Spiel-Einladungen.</p>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Spiel</th>
              <th>Speicherstand</th>
              <th>An</th>
              <th>Status</th>
              <th>Aktualisiert</th>
            </tr>
          </thead>
          <tbody id="sent-game-invitations-body">
            <tr class="empty-row">
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</div>

<script src="<?= htmlspecialchars(portal_asset_url('/profil/profil.js'), ENT_QUOTES, 'UTF-8'); ?>"></script>

<?php include '../footer.php'; ?>