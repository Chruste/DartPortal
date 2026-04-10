<?php
require __DIR__ . '/../session_bootstrap.php';
$pageTitle = 'Shanghai 42';
$username  = $_SESSION['username'] ?? null;
$isAuthenticated = isset($_SESSION['user_id']);
$extraHead = '<link rel="stylesheet" href="' . htmlspecialchars(portal_asset_url('/shanghai42/styles.css'), ENT_QUOTES, 'UTF-8') . '">';
include __DIR__ . '/../header.php';
?>
  <!-- Haupt-App -->
  <div id="appContainer">
    <header>
      <img src="img/headline.png" alt="Shanghai 42">
    </header>
    <?php if ($isAuthenticated): ?>
      <div id="status">Board-Status: –</div>
      <div id="saveControls" class="save-controls">
        <button id="newGameBtn" type="button">Neues Spiel</button>
        <button id="toggleStorageBtn" type="button">Speichern aktivieren</button>
        <button id="loadGamesBtn" type="button">Speicherstände...</button>
        <div id="saveStateInfo" class="save-state-info">Speichern ist aktuell deaktiviert.</div>
      </div>
      <section id="inviteControls" class="invite-controls">
        <div class="invite-controls__header">
          <button id="toggleInvitePanelBtn" type="button">Freunde einladen</button>
          <button id="refreshInviteCandidatesBtn" type="button">Aktualisieren</button>
        </div>
        <div id="inviteStateInfo" class="invite-state-info">Aktiviere zuerst einen Cloud-Spielstand, um Freunde einzuladen.</div>
        <section id="invitePanel" class="invite-panel" hidden>
          <div class="invite-panel__content table-wrapper">
            <table class="invite-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Letzter Login</th>
                  <th>Status</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody id="inviteFriendsBody">
                <tr>
                  <td colspan="5">Noch keine Freunde geladen.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
      <section id="savedGamesPanel" class="saved-games-panel" hidden>
        <div class="saved-games-panel__content">
          <table id="savedGamesTable" class="saved-games-table">
            <thead>
              <tr>
                <th>Speicherstand</th>
                <th>Letzte Änderung</th>
                <th>Teilnehmende</th>
                <th>Aktionen</th>
              </tr>
              <tr class="saved-games-filter-row">
                <th><input id="savedGamesFilterSaveName" type="text" placeholder="Speicherstand filtern" aria-label="Filter für Speicherstand" /></th>
                <th><input id="savedGamesFilterUpdatedAt" type="text" placeholder="Letzte Änderung filtern" aria-label="Filter für letzte Änderung" /></th>
                <th><input id="savedGamesFilterParticipants" type="text" placeholder="Teilnehmende filtern" aria-label="Filter für Teilnehmende" /></th>
                <th><button id="clearSavedGamesFiltersBtn" type="button">Filter löschen</button></th>
              </tr>
            </thead>
            <tbody id="savedGamesBody">
              <tr>
                <td colspan="4">Keine Speicherstände vorhanden.</td>
              </tr>
            </tbody>
          </table>
          <div class="saved-games-pagination">
            <span id="savedGamesCountInfo" class="saved-games-count-info">0 Speicherstände</span>
            <div class="saved-games-pagination-buttons">
              <button id="savedGamesPrevBtn" type="button">Zurück</button>
              <button id="savedGamesNextBtn" type="button">Weiter</button>
            </div>
          </div>
        </div>
      </section>
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
  <script>
    window.SHANGHAI_APP = {
      gameType: 'shanghai42',
      isAuthenticated: <?= $isAuthenticated ? 'true' : 'false'; ?>,
      userId: <?= isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 'null'; ?>,
      username: <?= json_encode((string) ($username ?? ''), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
      displayName: <?= json_encode((string) ($username ?? ''), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
      csrfToken: <?= json_encode((string) ($_SESSION['csrf_token'] ?? ''), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>
    };
  </script>
  <script src="<?= htmlspecialchars(portal_asset_url('/shanghai42/script.js'), ENT_QUOTES, 'UTF-8'); ?>"></script>
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
