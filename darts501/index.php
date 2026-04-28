<?php
require __DIR__ . '/../session_bootstrap.php';
$pageTitle = 'Klassisches 501 Darts';
$username  = $_SESSION['username'] ?? null;
$isAuthenticated = isset($_SESSION['user_id']);
$extraHead = '<link rel="stylesheet" href="' . htmlspecialchars(portal_asset_url('/darts501/styles.css'), ENT_QUOTES, 'UTF-8') . '">';
include __DIR__ . '/../header.php';
?>
  <!-- Haupt-App -->
  <div id="appContainer">
    <header>
      <img src="img/headline.png" alt="Klassisches 501 Darts">
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

    <!-- Spielbereich -->
    <div id="gameArea">
      <div id="playersContainer"></div>
    </div>

    <!-- Eingabebereich -->
    <div id="inputArea">
      <div id="throwInput">
        <input id="throwSector" type="text" placeholder="Sektor (z.B. 20, D20, T20)" />
        <button id="submitThrowBtn">Wurf eingeben</button>
      </div>
      <div id="quickButtons">
        <button id="btnMiss">Miss</button>
        <button id="btnSingle">Single</button>
        <button id="btnDouble">Double</button>
        <button id="btnTriple">Triple</button>
      </div>
    </div>

    <!-- Steuerung -->
    <div id="controlButtons">
      <button id="nextPlayerBtn">Nächster Spieler</button>
      <button id="undoBtn">Rückgängig</button>
    </div>

  </div>

  <script src="<?php echo htmlspecialchars(portal_asset_url('/darts501/script.js'), ENT_QUOTES, 'UTF-8'); ?>"></script>
<?php include __DIR__ . '/../footer.php'; ?>