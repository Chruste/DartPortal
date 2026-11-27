<?php
require __DIR__ . '/../session_bootstrap.php';
$pageTitle = 'Dartball';
$username = $_SESSION['username'] ?? null;
$isAuthenticated = isset($_SESSION['user_id']);
$extraHead = '<link rel="stylesheet" href="' . htmlspecialchars(portal_asset_url('/dartball/styles.css'), ENT_QUOTES, 'UTF-8') . '">';
include __DIR__ . '/../header.php';
?>
<div id="dartballApp" class="dartball-app">
  <header class="dartball-heading"><img src="img/headline.png" alt="Dartball"></header>
  <div id="status" class="dartball-board-status">Board-Status: Verbinde…</div>
  <?php if ($isAuthenticated): ?>
  <section class="dartball-storage" aria-label="Spielstände">
    <button id="newGameBtn" type="button">Neues Spiel</button>
    <button id="toggleStorageBtn" type="button">Speichern aktivieren</button>
    <button id="loadGamesBtn" type="button">Speicherstände</button>
    <span id="saveStateInfo">Lokales Spiel aktiv.</span>
  </section>
  <section id="savedGamesPanel" class="dartball-saved" hidden>
    <div><input id="saveNameInput" type="text" maxlength="160" placeholder="Speicherstandname"><button id="renameSaveBtn" type="button">Umbenennen</button></div>
    <ul id="savedGamesList"></ul>
  </section>
  <?php endif; ?>
  <section class="scoreboard" aria-label="Spielstand">
    <div id="orangeScorePanel" class="team-score team-orange"><span>TEAM ORANGE</span><strong id="orangeScore">0</strong><small id="orangeGoalLabel">Rechtes Tor · Doppel 6</small></div>
    <div class="match-clock"><span id="halfLabel">Halbzeit 1</span><strong id="clock">04:30</strong><span id="matchStatus">Anstoß: Mittelkreis</span>
      <div class="clock-controls">
        <button id="timeoutBtn" type="button" disabled>Timeout</button>
        <div class="time-adjust-controls" aria-label="Zeitkorrektur">
          <button type="button" data-time-adjust="-30">−30 s</button>
          <button type="button" data-time-adjust="-5">−5 s</button>
          <button type="button" data-time-adjust="5">+5 s</button>
          <button type="button" data-time-adjust="30">+30 s</button>
        </div>
        <label class="custom-time-adjust">Zeitkorrektur (Sek.) <input id="customTimeAdjust" type="number" step="1" value="0"><button id="applyTimeAdjustBtn" type="button">Anwenden</button></label>
      </div>
    </div>
    <div id="blueScorePanel" class="team-score team-blue"><span>TEAM BLAU</span><strong id="blueScore">0</strong><small id="blueGoalLabel">Linkes Tor · Doppel 11</small></div>
  </section>
  <section class="dartball-play">
    <aside class="target-panel">
      <div class="round-info"><span id="activeTeamLabel">Team Orange am Zug</span><span id="dartCounter">Dart 1 / 3</span></div>
      <div class="target-caption">AKTUELLES ZIEL</div>
      <div id="target" class="target">Bull</div>
      <div id="targetHint" class="target-hint">Ball aufnehmen: Single Bull oder Bull</div>
      <div id="actionStatus" class="action-status" aria-live="polite">Spiel bereit. Treffer am Mittelkreis starten die Uhr.</div>
      <div class="throw-controls">
        <label for="throwInput">Wurf eingeben</label>
        <div><input id="throwInput" type="text" autocomplete="off" placeholder="z. B. T20, D6, Bull, 25, Miss"><button id="throwBtn" type="button">Eintragen</button></div>
        <div class="quick-hits">
          <button type="button" data-hit="Bull">Bull</button><button type="button" data-hit="25">Single Bull</button><button type="button" data-hit="Miss">Fehlwurf</button>
        </div>
        <button id="undoBtn" class="undo-button" type="button">Letzten Dart zurücknehmen</button>
      </div>
      <div class="match-controls"><button id="startNextHalfBtn" type="button" hidden>Halbzeit starten</button><button id="resetBtn" type="button">Spiel zurücksetzen</button></div>
    </aside>
    <section class="ticker-panel" aria-label="Spielverlauf">
      <div id="possessionBanner" class="possession-banner">Ball liegt am Mittelkreis</div>
      <ol id="eventTicker" class="event-ticker" aria-live="polite"><li class="ticker-empty">Der Spielverlauf erscheint hier.</li></ol>
    </section>
  </section>
  <section class="rules-note"><strong>Wurf:</strong> S20, D6, T19, 25 (Single Bull), Bull oder Miss. Für Ballübernahme zählt das Zahlenfeld unabhängig von Single/Double/Triple. Tore zählen ausschließlich auf Doppel 6 bzw. Doppel 11.</section>
</div>
<script>
  window.DARTBALL_APP = {
    isAuthenticated: <?= $isAuthenticated ? 'true' : 'false'; ?>,
    userId: <?= isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 'null'; ?>,
    username: <?= json_encode((string) ($username ?? ''), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
    csrfToken: <?= json_encode((string) ($_SESSION['csrf_token'] ?? ''), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>
  };
</script>
<script src="<?= htmlspecialchars(portal_asset_url('/dartball/script.js'), ENT_QUOTES, 'UTF-8'); ?>"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    fetch('/scolia-config.php', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => { window.SCOLIA_CONFIG = { serialNumber: data.serialNumber || '', accessToken: data.accessToken || '' }; initDartballScolia(); })
      .catch(() => { window.SCOLIA_CONFIG = { serialNumber: '', accessToken: '' }; initDartballScolia(); });
  });
</script>
<?php include __DIR__ . '/../footer.php'; ?>
