// "Shanghai 21" v3.1 Scolia Dartspiel

class Player {
  constructor(name, index) {
    this.name = name;
    this.index = index;
    this.currentIndex = 0;
    this.totalScore = 0;
    this.sequence = Array.from({ length: 20 }, (_, i) => (i + 1).toString()).concat('Bull');
    this.table = this.createTable();
    this.activateBtn = this.createActivateBtn();
    this.deleteBtn = this.createDeleteBtn();
    this.confirmDeleteBtn = this.createConfirmDeleteBtn();
    const btnArea = document.createElement('div');
    btnArea.appendChild(this.activateBtn);
    btnArea.appendChild(this.deleteBtn);
    btnArea.appendChild(this.confirmDeleteBtn);
    this.tableArea = document.createElement('div');
    this.tableArea.classList.add('tableArea');
    this.tableArea.appendChild(this.table);
    this.container = document.createElement('div');
    this.container.appendChild(btnArea);
    this.container.appendChild(this.tableArea);
    this.updateActivateBtn();
    this.highlightRow(this.currentIndex);
  }

  createTable() {
    const table = document.createElement('table');
    table.id = `playerTable${this.index}`;
    const thead = document.createElement('thead');
    const nameRow = document.createElement('tr');
    const nameCell = document.createElement('th');
    nameCell.colSpan = 3;
    nameCell.textContent = this.name;
    nameCell.id = `playerNameCell${this.index}`;
    nameCell.classList.add('player-name');
    nameRow.appendChild(nameCell);
    thead.appendChild(nameRow);
    const headerRow = document.createElement('tr');
    ['Ziel', 'Punkte', 'Treffer'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    this.sequence.forEach(t => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${t}</td><td></td><td></td>`;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    const tfoot = document.createElement('tfoot');
    const totalRow = document.createElement('tr');
    totalRow.innerHTML = `<td>Total</td><td id="sumCell${this.index}">0</td><td></td>`;
    tfoot.appendChild(totalRow);
    table.appendChild(tfoot);
    this.tbody = tbody;
    this.sumCell = table.querySelector(`#sumCell${this.index}`);
    return table;
  }

  createActivateBtn() {
    const btn = document.createElement('button');
    btn.className = 'playerActivateBtn';
    btn.textContent = 'Aktivieren';
    btn.onclick = () => setActivePlayer(this.index);
    return btn;
  }

  createDeleteBtn() {
    const btn = document.createElement('button');
    btn.className = 'playerDeleteBtn';
    btn.textContent = 'Spieler löschen';
    btn.style.display = 'none';
    btn.disabled = true;
    btn.onclick = () => {
      this.deleteBtn.style.display = 'none';
      this.confirmDeleteBtn.style.display = 'block';
    };
    return btn;
  }

  createConfirmDeleteBtn() {
    const btn = document.createElement('button');
    btn.className = 'playerConfirmDeleteBtn';
    btn.textContent = 'Spieler wirklich löschen?';
    btn.style.display = 'none';
    btn.onclick = () => deletePlayer(this.index);
    return btn;
  }

  updateActivateBtn() {
    const isActive = activePlayerIndex === this.index;
    this.activateBtn.style.display = isActive ? 'none' : 'block';
    this.deleteBtn.style.display = isActive ? 'block' : 'none';
    this.confirmDeleteBtn.style.display = 'none';
    if (isActive) {
      this.tableArea.classList.remove('inactive');
    } else {
      this.tableArea.classList.add('inactive');
    }
  }

  highlightRow(i) {
    this.table.querySelectorAll('tr').forEach(r => r.classList.remove('current-row'));
    this.table.classList.toggle('highlight-complete', i >= this.sequence.length);
    if (i < this.sequence.length) {
      const rows = Array.from(this.tbody.children);
      if (rows[i]) rows[i].classList.add('current-row');
    }
  }

  updateTripleButton() {
    const btn = document.getElementById('btnTriple');
    if (!btn) return;
    const hideTriple = this.sequence[this.currentIndex] === 'Bull';
    btn.style.visibility = hideTriple ? 'hidden' : 'visible';
    btn.style.pointerEvents = hideTriple ? 'none' : 'auto';
  }

  processThrow(sec, type = null, eventMeta = null) {
    if (this.currentIndex >= this.sequence.length) return;
    const sector = sec.toString().toUpperCase();
    const targetLabel = this.sequence[this.currentIndex] || '';
    let mult = type === 'miss' ? 0
      : type === 'Double' ? 2
      : type === 'Triple' ? 3
      : type === 'Single' ? 1
      : sector.startsWith('D') ? 2
      : sector.startsWith('T') ? 3
      : sector === 'BULL' ? 2
      : 1;
    let base = sector === '25' ? 'Bull'
      : sector === 'BULL' ? 'Bull'
      : (sector.match(/(20|1[0-9]|[1-9])/) || [''])[0];
    let hit = mult === 0 ? '0'
      : base === 'Bull' ? (mult === 2 ? '50' : '25')
      : mult === 2 ? `D ${base}`
      : mult === 3 ? `T ${base}`
      : base;
    let pts = 0;
    if ((hit === '25' || hit === '50') && targetLabel === 'Bull'
      || hit.replace(/^D |^T /, '') === targetLabel) {
      pts = base === 'Bull' ? mult * 25 : mult * parseInt(base, 10);
    }
    this.totalScore += pts;
    const row = this.tbody.children[this.currentIndex];
    row.cells[1].textContent = pts;
    row.cells[2].textContent = hit;
    row.classList.toggle('hit', pts > 0);
    row.classList.remove('miss');
    this.sumCell.textContent = this.totalScore;
    this.currentIndex++;
    this.highlightRow(this.currentIndex);
    this.updateTripleButton();
    updateOverviewTable();
    updateUndoButtonVisibility();
    recordStateChange({
      eventType: eventMeta?.eventType || 'throw',
      source: eventMeta?.source || 'unknown',
      playerIndex: this.index,
      playerUserId: this.portalUserId ?? null,
      playerName: this.name,
      targetLabel,
      sectorResult: hit,
      scoreDelta: pts,
      scoreAfter: this.totalScore,
      detectedAt: eventMeta?.detectedAt || new Date().toISOString(),
      payload: eventMeta?.payload || { sector: sec, type },
    });
  }

  calculatePoints(hit, target) {
    if (hit === '0' || hit === '') return 0;
    const isBull = target === 'Bull';
    const normalizedHit = hit.trim().toUpperCase();
    const hitBase = normalizedHit.replace(/^D\s+|^T\s+/, '');
    const hitMult = normalizedHit.startsWith('D ') ? 2 : normalizedHit.startsWith('T ') ? 3 : 1;
    const isBullHit = hitBase === 'BULL' || hitBase === '25' || hitBase === '50';
    let pts = 0;
    if (isBull && isBullHit) {
      pts = hitBase === '50' ? 50 : hitMult * 25;
    } else if (!isBull && hitBase === target.toUpperCase()) {
      pts = hitMult * parseInt(hitBase, 10);
    }
    return pts;
  }

  undoLastThrow() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const row = this.tbody.children[this.currentIndex];
      row.cells[1].textContent = '';
      row.cells[2].textContent = '';
      row.classList.remove('hit', 'miss');
      this.totalScore = 0;
      for (let i = 0; i < this.currentIndex; i++) {
        const pts = this.calculatePoints(this.tbody.children[i].cells[2].textContent, this.sequence[i]);
        this.totalScore += pts;
      }
      this.sumCell.textContent = this.totalScore;
      this.highlightRow(this.currentIndex);
      this.updateTripleButton();
      updateOverviewTable();
      updateUndoButtonVisibility();
      recordStateChange({
        eventType: 'undo',
        source: 'ui',
        playerIndex: this.index,
        playerUserId: this.portalUserId ?? null,
        playerName: this.name,
        targetLabel: this.sequence[this.currentIndex] || '',
        sectorResult: '',
        scoreDelta: 0,
        scoreAfter: this.totalScore,
        detectedAt: new Date().toISOString(),
        payload: { currentIndex: this.currentIndex },
      });
    }
  }

  enterEditMode() {
    document.getElementById('editButton').style.display = 'none';
    document.getElementById('saveButton').style.display = 'inline';
    editingPlayerIndex = this.index;
    this.deleteBtn.disabled = false;
    const nameCell = document.getElementById(`playerNameCell${this.index}`);
    nameCell.innerHTML = `<input id="playerNameInput${this.index}" type="text" value="${this.name}" class="hit-input">`;
    const rows = this.tbody.children;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].cells[2];
      const currentHit = cell.textContent;
      cell.innerHTML = `<input type="text" value="${currentHit}" class="hit-input">`;
    }
  }

  exitEditMode() {
    document.getElementById('editButton').style.display = 'inline';
    document.getElementById('saveButton').style.display = 'none';
    editingPlayerIndex = null;
    this.deleteBtn.disabled = true;
    this.confirmDeleteBtn.style.display = 'none';
    this.deleteBtn.style.display = 'block';
    const nameInput = document.getElementById(`playerNameInput${this.index}`);
    if (nameInput) {
      this.name = nameInput.value.trim() || 'Spieler';
      document.getElementById(`playerNameCell${this.index}`).textContent = this.name;
    }
    const rows = this.tbody.children;
    this.totalScore = 0;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].cells[2];
      const input = cell.querySelector('.hit-input');
      const newHit = input.value.trim();
      cell.textContent = newHit;
      const pts = this.calculatePoints(newHit, this.sequence[i]);
      if (newHit === '') {
        rows[i].cells[1].textContent = '';
      } else {
        rows[i].cells[1].textContent = pts;
      }
      this.totalScore += pts;
      rows[i].classList.remove('hit', 'miss');
      if (pts > 0) rows[i].classList.add('hit');
    }
    this.sumCell.textContent = this.totalScore;
    let newIndex = this.sequence.length;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].cells[2].textContent === '') {
        newIndex = i;
        break;
      }
    }
    this.currentIndex = newIndex;
    this.highlightRow(this.currentIndex);
    this.updateTripleButton();
    updateOverviewTable();
    updateUndoButtonVisibility();
    recordStateChange({
      eventType: 'edit_save',
      source: 'edit',
      playerIndex: this.index,
      playerUserId: this.portalUserId ?? null,
      playerName: this.name,
      targetLabel: this.sequence[Math.min(this.currentIndex, this.sequence.length - 1)] || '',
      sectorResult: '',
      scoreDelta: 0,
      scoreAfter: this.totalScore,
      detectedAt: new Date().toISOString(),
      payload: {
        rows: Array.from(rows).map((row, rowIndex) => ({
          target: this.sequence[rowIndex],
          points: row.cells[1].textContent,
          hit: row.cells[2].textContent,
        })),
      },
    });
  }
}

// Globale Variablen
let players = {};
let activePlayerIndex = 0;
let editingPlayerIndex = null;
let nextPlayerId = 0;
let autoPlayerSwitch = false;
const tablesContainer = document.getElementById('tablesContainer');
let overviewTableBody = null;
let overviewResizeHandlerRegistered = false;
let overviewFooterCollapsed = localStorage.getItem('overviewFooterCollapsed') === 'true';
let controlsFooterCollapsed = localStorage.getItem('controlsFooterCollapsed') === 'true';
let controlsFooterInitialized = false;
let storageEnabled = false;
let activeSaveId = null;
let activeSaveLabel = '';
let savedGamesCache = [];
let savedGamesCurrentPage = 1;
let savedGamesTotalCount = 0;
let savedGamesFilterTimer = null;
let savedGamesTooltipEl = null;
const SAVED_GAMES_PAGE_SIZE = 10;
let savedGamesFilters = {
  updatedAt: '',
  saveName: '',
  participants: '',
};
let storageSaveChain = Promise.resolve();
let isRestoringState = false;
const shanghaiAppConfig = window.SHANGHAI_APP || {};
const isAuthenticatedUser = Boolean(shanghaiAppConfig.isAuthenticated);
const storageApiUrl = '/shanghai-storage.php';

function formatLocalDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function updateUndoButtonVisibility() {
  const undoBtn = document.getElementById('undoButton');
  if (!undoBtn) return;

  const activePlayer = getActivePlayer();
  const canUndo = Boolean(activePlayer && activePlayer.currentIndex > 0 && editingPlayerIndex === null);
  undoBtn.style.visibility = canUndo ? 'visible' : 'hidden';
  undoBtn.style.pointerEvents = canUndo ? 'auto' : 'none';
}

function getStorageStatusElement() {
  return document.getElementById('saveStateInfo');
}

function setStorageInfo(message = '', isError = false) {
  const statusEl = getStorageStatusElement();
  if (!statusEl) return;

  const fallbackMessage = storageEnabled && activeSaveId
    ? `Automatisches Speichern aktiv${activeSaveLabel ? `: ${activeSaveLabel}` : '.'}`
    : 'Speichern ist aktuell deaktiviert.';

  statusEl.textContent = message || fallbackMessage;
  statusEl.classList.toggle('error', Boolean(isError));
}

function setSaveControlsBusy(isBusy) {
  ['newGameBtn', 'toggleStorageBtn', 'loadGamesBtn'].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.disabled = Boolean(isBusy);
  });
}

function updateStorageToggleButton() {
  const toggleBtn = document.getElementById('toggleStorageBtn');
  if (!toggleBtn) return;

  toggleBtn.textContent = storageEnabled && activeSaveId ? 'Speicherstand löschen' : 'Speichern aktivieren';
}

function updateFooterLayout() {
  syncOverviewFooterHeight();
}

function syncOverviewFooterHeight() {
  const appContainer = document.getElementById('appContainer');
  const wrapper = document.getElementById('playerOverviewWrapper');
  const controlsWrapper = document.getElementById('controlsFooterWrapper');
  if (!appContainer || !wrapper) return;

  const overviewHeight = Math.ceil(wrapper.getBoundingClientRect().height);
  const controlsHeight = controlsWrapper ? Math.ceil(controlsWrapper.getBoundingClientRect().height) : 0;
  const totalFooterHeight = overviewHeight + controlsHeight;

  if (controlsWrapper) {
    controlsWrapper.style.bottom = `${overviewHeight}px`;
  }
  
  appContainer.style.paddingBottom = `${totalFooterHeight + 16}px`;
}

function toggleOverviewFooter() {
  overviewFooterCollapsed = !overviewFooterCollapsed;
  localStorage.setItem('overviewFooterCollapsed', overviewFooterCollapsed);
  const wrapper = document.getElementById('playerOverviewWrapper');
  const table = document.getElementById('playerOverviewTable');
  const title = document.getElementById('playerOverviewTitle');
  const toggleBtn = document.getElementById('overviewToggleBtn');
  
  if (overviewFooterCollapsed) {
    if (table) table.style.display = 'none';
    if (wrapper) wrapper.classList.add('collapsed');
    if (toggleBtn) toggleBtn.textContent = '▲';
  } else {
    if (table) table.style.display = 'table';
    if (wrapper) wrapper.classList.remove('collapsed');
    if (toggleBtn) toggleBtn.textContent = '▼';
  }
  
  updateFooterLayout();
}

function toggleControlsFooter() {
  controlsFooterCollapsed = !controlsFooterCollapsed;
  localStorage.setItem('controlsFooterCollapsed', controlsFooterCollapsed);
  const wrapper = document.getElementById('controlsFooterWrapper');
  const content = document.getElementById('controlsFooterContent');
  const toggleBtn = document.getElementById('controlsToggleBtn');
  
  if (controlsFooterCollapsed) {
    if (content) content.style.display = 'none';
    if (wrapper) wrapper.classList.add('collapsed');
    if (toggleBtn) toggleBtn.textContent = '▲';
  } else {
    if (content) content.style.display = 'block';
    if (wrapper) wrapper.classList.remove('collapsed');
    if (toggleBtn) toggleBtn.textContent = '▼';
  }
  
  updateFooterLayout();
}

function syncControlsFooterHeight() {
  syncOverviewFooterHeight();
}

function ensureOverviewTable() {
  if (overviewTableBody) return;

  const appContainer = document.getElementById('appContainer');
  if (!appContainer || !tablesContainer) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'playerOverviewWrapper';

  const title = document.createElement('h3');
  title.id = 'playerOverviewTitle';
  title.textContent = 'Spielerliste';

  const table = document.createElement('table');
  table.id = 'playerOverviewTable';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Name', 'Punkte'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  overviewTableBody = document.createElement('tbody');

  table.appendChild(thead);
  table.appendChild(overviewTableBody);
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'overviewToggleBtn';
  toggleBtn.className = 'overviewToggleBtn';
  toggleBtn.textContent = overviewFooterCollapsed ? '▲' : '▼';
  toggleBtn.onclick = toggleOverviewFooter;
  toggleBtn.title = 'Spielerliste ein-/ausklappen';
  
  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(title);
  wrapper.appendChild(table);

  if (overviewFooterCollapsed) {
    table.style.display = 'none';
    wrapper.classList.add('collapsed');
  }

  tablesContainer.insertAdjacentElement('afterend', wrapper);

  if (!overviewResizeHandlerRegistered) {
    window.addEventListener('resize', updateFooterLayout);
    overviewResizeHandlerRegistered = true;
  }

  updateFooterLayout();
}

function updateOverviewTable() {
  ensureOverviewTable();
  if (!overviewTableBody) return;

  const totalsByName = new Map();

  getPlayerIds().forEach(id => {
    const player = players[id];
    if (!player) return;
    const key = player.name.trim() || 'Spieler';
    const currentTotal = totalsByName.get(key) || 0;
    totalsByName.set(key, currentTotal + player.totalScore);
  });

  overviewTableBody.innerHTML = '';
  totalsByName.forEach((points, name) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const pointsCell = document.createElement('td');

    nameCell.textContent = name;
    pointsCell.textContent = points;

    row.appendChild(nameCell);
    row.appendChild(pointsCell);
    overviewTableBody.appendChild(row);
  });

  updateFooterLayout();
}

function getPlayerIds() {
  return Object.keys(players).map(Number).sort((first, second) => first - second);
}

function getOpenPlayerIds() {
  return getPlayerIds().filter(id => {
    const player = players[id];
    return player && player.currentIndex < player.sequence.length;
  });
}

function getActivePlayer() {
  return players[activePlayerIndex] || null;
}

function buildPlayerState(player) {
  return {
    index: player.index,
    name: player.name,
    portalUserId: Number.isFinite(Number(player.portalUserId)) ? Number(player.portalUserId) : null,
    participantRole: player.participantRole
      || (Number(player.portalUserId) === Number(shanghaiAppConfig.userId) ? 'owner' : (player.portalUserId ? 'friend' : 'guest')),
    invitationStatus: player.invitationStatus || 'accepted',
    invitedByUserId: Number.isFinite(Number(player.invitedByUserId)) ? Number(player.invitedByUserId) : null,
    currentIndex: player.currentIndex,
    totalScore: player.totalScore,
    rows: Array.from(player.tbody.children).map((row, rowIndex) => ({
      target: player.sequence[rowIndex],
      points: row.cells[1].textContent,
      hit: row.cells[2].textContent,
    })),
  };
}

function collectGameState() {
  return {
    gameType: shanghaiAppConfig.gameType || '',
    activePlayerIndex,
    nextPlayerId,
    autoPlayerSwitch,
    players: getPlayerIds().map(id => buildPlayerState(players[id])),
  };
}

function resetLocalGameState() {
  Object.values(players).forEach(player => player?.container?.remove());
  players = {};
  activePlayerIndex = 0;
  editingPlayerIndex = null;
  nextPlayerId = 0;
  autoPlayerSwitch = false;

  const editBtn = document.getElementById('editButton');
  const saveBtn = document.getElementById('saveButton');
  if (editBtn) editBtn.style.display = 'inline';
  if (saveBtn) saveBtn.style.display = 'none';
  if (overviewTableBody) overviewTableBody.innerHTML = '';
}

function applyLoadedPlayerState(savedPlayer, fallbackIndex) {
  const parsedIndex = Number.parseInt(String(savedPlayer?.index ?? fallbackIndex), 10);
  const playerIndex = Number.isFinite(parsedIndex) ? parsedIndex : fallbackIndex;
  const playerName = (savedPlayer?.name || '').toString().trim() || `Spieler ${playerIndex + 1}`;
  const player = new Player(playerName, playerIndex);
  const restoredPortalUserId = Number.parseInt(String(savedPlayer?.portalUserId ?? savedPlayer?.userId ?? ''), 10);
  const restoredInvitedByUserId = Number.parseInt(String(savedPlayer?.invitedByUserId ?? ''), 10);
  player.portalUserId = Number.isFinite(restoredPortalUserId) ? restoredPortalUserId : null;
  player.participantRole = (savedPlayer?.participantRole || '').toString().trim()
    || (Number(player.portalUserId) === Number(shanghaiAppConfig.userId) ? 'owner' : (player.portalUserId ? 'friend' : 'guest'));
  player.invitationStatus = (savedPlayer?.invitationStatus || 'accepted').toString().trim() || 'accepted';
  player.invitedByUserId = Number.isFinite(restoredInvitedByUserId) ? restoredInvitedByUserId : null;
  players[playerIndex] = player;
  tablesContainer.appendChild(player.container);

  const rows = Array.isArray(savedPlayer?.rows) ? savedPlayer.rows : [];
  let totalScore = 0;

  Array.from(player.tbody.children).forEach((tableRow, rowIndex) => {
    const savedRow = rows[rowIndex] || {};
    const hit = (savedRow.hit ?? '').toString().trim();
    tableRow.cells[2].textContent = hit;

    if (hit === '') {
      tableRow.cells[1].textContent = '';
      tableRow.classList.remove('hit', 'miss');
      return;
    }

    const parsedPoints = Number.parseInt(String(savedRow.points ?? ''), 10);
    const points = Number.isFinite(parsedPoints)
      ? parsedPoints
      : player.calculatePoints(hit, player.sequence[rowIndex]);

    tableRow.cells[1].textContent = String(points);
    tableRow.classList.toggle('hit', points > 0);
    tableRow.classList.toggle('miss', points < 0);
    totalScore += points;
  });

  player.totalScore = Number.isFinite(Number(savedPlayer?.totalScore))
    ? Number(savedPlayer.totalScore)
    : totalScore;
  if (player.totalScore !== totalScore) {
    player.totalScore = totalScore;
  }
  player.sumCell.textContent = String(player.totalScore);

  const requestedIndex = Number.parseInt(String(savedPlayer?.currentIndex ?? ''), 10);
  if (Number.isFinite(requestedIndex)) {
    player.currentIndex = Math.min(Math.max(requestedIndex, 0), player.sequence.length);
  } else {
    const firstEmptyIndex = Array.from(player.tbody.children).findIndex(tableRow => tableRow.cells[2].textContent.trim() === '');
    player.currentIndex = firstEmptyIndex === -1 ? player.sequence.length : firstEmptyIndex;
  }

  player.highlightRow(player.currentIndex);
  player.updateTripleButton();
}

function loadGameState(state = {}) {
  isRestoringState = true;

  try {
    resetLocalGameState();

    const savedPlayers = Array.isArray(state.players) ? state.players : [];
    if (savedPlayers.length === 0) {
      addPlayer();
      autoPlayerSwitch = false;
    } else {
      savedPlayers.forEach((savedPlayer, fallbackIndex) => applyLoadedPlayerState(savedPlayer, fallbackIndex));

      const availableIds = getPlayerIds();
      const requestedActivePlayer = Number.parseInt(String(state.activePlayerIndex ?? ''), 10);
      activePlayerIndex = availableIds.includes(requestedActivePlayer)
        ? requestedActivePlayer
        : (availableIds[0] ?? 0);

      const requestedNextPlayerId = Number.parseInt(String(state.nextPlayerId ?? ''), 10);
      const minNextPlayerId = availableIds.reduce((maxValue, id) => Math.max(maxValue, id + 1), 0);
      nextPlayerId = Number.isFinite(requestedNextPlayerId)
        ? Math.max(requestedNextPlayerId, minNextPlayerId)
        : minNextPlayerId;

      autoPlayerSwitch = Boolean(state.autoPlayerSwitch);
    }
  } finally {
    isRestoringState = false;
  }

  updateAllActivateBtns();
  updateAutoPlayerSwitchBtn();
  updateOverviewTable();

  const activePlayer = getActivePlayer();
  if (activePlayer) {
    activePlayer.updateTripleButton();
  }

  updateUndoButtonVisibility();
  updateFooterLayout();
}

function hasGameProgress() {
  const playerIds = getPlayerIds();
  if (playerIds.length > 1) return true;

  return playerIds.some(id => {
    const player = players[id];
    if (!player) return false;

    const defaultName = `Spieler ${player.index + 1}`;
    const hasRowContent = Array.from(player.tbody.children).some(row => {
      return row.cells[1].textContent !== '' || row.cells[2].textContent !== '';
    });

    return player.currentIndex > 0
      || player.totalScore !== 0
      || hasRowContent
      || ((player.name || '').trim() !== '' && player.name !== defaultName);
  });
}

function confirmDiscardResults() {
  return !hasGameProgress() || window.confirm('Ungespeicherte Ergebnisse gehen verloren!');
}

function createManualEventMeta(source, payload = {}) {
  return {
    eventType: 'throw_detected',
    source,
    detectedAt: new Date().toISOString(),
    payload: {
      ...payload,
      manual: true,
    },
  };
}

function getDefaultSaveName() {
  return shanghaiAppConfig.gameType === 'shanghai42' ? 'Shanghai 42' : 'Shanghai 21';
}

function getSavedGamesPanel() {
  return document.getElementById('savedGamesPanel');
}

function isSavedGamesPanelOpen() {
  const panel = getSavedGamesPanel();
  return Boolean(panel && !panel.hidden);
}

async function refreshSavedGamesAfterMutation() {
  savedGamesCurrentPage = 1;
  if (isSavedGamesPanelOpen()) {
    await refreshSavedGamesList(1);
  }
}

function ensureSavedGamesTooltip() {
  if (savedGamesTooltipEl && document.body.contains(savedGamesTooltipEl)) {
    return savedGamesTooltipEl;
  }

  const tooltip = document.createElement('div');
  tooltip.id = 'savedGamesTooltip';
  tooltip.className = 'saved-games-tooltip';
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  savedGamesTooltipEl = tooltip;
  return tooltip;
}

function resolveSavedGamesTooltipText(textOrFactory) {
  const rawValue = typeof textOrFactory === 'function' ? textOrFactory() : textOrFactory;
  return (rawValue ?? '').toString().trim();
}

function positionSavedGamesTooltip(event) {
  const tooltip = ensureSavedGamesTooltip();
  if (tooltip.hidden) return;

  const offset = 14;
  tooltip.style.left = `${event.clientX + offset}px`;
  tooltip.style.top = `${event.clientY + offset}px`;

  const rect = tooltip.getBoundingClientRect();
  let nextLeft = event.clientX + offset;
  let nextTop = event.clientY + offset;

  if (rect.right > window.innerWidth - 10) {
    nextLeft = Math.max(10, event.clientX - rect.width - offset);
  }
  if (rect.bottom > window.innerHeight - 10) {
    nextTop = Math.max(10, event.clientY - rect.height - offset);
  }

  tooltip.style.left = `${nextLeft}px`;
  tooltip.style.top = `${nextTop}px`;
}

function showSavedGamesTooltip(textOrFactory, event) {
  const text = resolveSavedGamesTooltipText(textOrFactory);
  if (!text) return;

  const tooltip = ensureSavedGamesTooltip();
  tooltip.textContent = text;
  tooltip.hidden = false;
  positionSavedGamesTooltip(event);
}

function hideSavedGamesTooltip() {
  if (!savedGamesTooltipEl) return;
  savedGamesTooltipEl.hidden = true;
}

function bindSavedGamesTooltip(target, textOrFactory) {
  if (!target) return;

  target.addEventListener('mouseenter', event => {
    showSavedGamesTooltip(textOrFactory, event);
  });
  target.addEventListener('mousemove', positionSavedGamesTooltip);
  target.addEventListener('mouseleave', hideSavedGamesTooltip);
  target.addEventListener('blur', hideSavedGamesTooltip);
}

function upsertSaveCacheEntry(save) {
  if (!save || !save.id) return;

  const entry = {
    id: Number(save.id),
    saveName: (save.saveName || getDefaultSaveName()).toString(),
    updatedAt: save.updatedAt || formatLocalDateTime(new Date()),
    participantSummary: (save.participantSummary || '').toString(),
  };

  const existingIndex = savedGamesCache.findIndex(item => Number(item.id) === entry.id);
  if (existingIndex !== -1) {
    savedGamesCache.splice(existingIndex, 1, { ...savedGamesCache[existingIndex], ...entry });
  } else {
    savedGamesCache.unshift(entry);
    savedGamesTotalCount += 1;
    if (savedGamesCache.length > SAVED_GAMES_PAGE_SIZE) {
      savedGamesCache = savedGamesCache.slice(0, SAVED_GAMES_PAGE_SIZE);
    }
  }

  renderSavedGames();
}

function removeSaveCacheEntry(saveId) {
  const beforeCount = savedGamesCache.length;
  savedGamesCache = savedGamesCache.filter(item => Number(item.id) !== Number(saveId));
  if (savedGamesCache.length !== beforeCount) {
    savedGamesTotalCount = Math.max(0, savedGamesTotalCount - 1);
  }
  renderSavedGames();
}

function syncSavedGamesFilterInputs() {
  const updatedAtInput = document.getElementById('savedGamesFilterUpdatedAt');
  const saveNameInput = document.getElementById('savedGamesFilterSaveName');
  const participantsInput = document.getElementById('savedGamesFilterParticipants');

  if (updatedAtInput) updatedAtInput.value = savedGamesFilters.updatedAt;
  if (saveNameInput) saveNameInput.value = savedGamesFilters.saveName;
  if (participantsInput) participantsInput.value = savedGamesFilters.participants;
}

function updateSavedGamesPagination() {
  const countInfo = document.getElementById('savedGamesCountInfo');
  const prevBtn = document.getElementById('savedGamesPrevBtn');
  const nextBtn = document.getElementById('savedGamesNextBtn');
  const totalPages = Math.max(1, Math.ceil(Math.max(savedGamesTotalCount, 1) / SAVED_GAMES_PAGE_SIZE));

  if (countInfo) {
    if (savedGamesTotalCount === 0) {
      countInfo.textContent = '0 Speicherstände';
    } else {
      const start = ((savedGamesCurrentPage - 1) * SAVED_GAMES_PAGE_SIZE) + 1;
      const end = Math.min(savedGamesTotalCount, start + Math.max(savedGamesCache.length - 1, 0));
      countInfo.textContent = `${start}-${end} von ${savedGamesTotalCount} Speicherständen`;
    }
  }

  if (prevBtn) prevBtn.disabled = savedGamesCurrentPage <= 1;
  if (nextBtn) nextBtn.disabled = savedGamesCurrentPage >= totalPages || savedGamesTotalCount === 0;
}

function renderSavedGames() {
  const tableBody = document.getElementById('savedGamesBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  if (!savedGamesCache.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Keine Speicherstände vorhanden.';
    row.appendChild(cell);
    tableBody.appendChild(row);
    updateSavedGamesPagination();
    return;
  }

  savedGamesCache.forEach(save => {
    const row = document.createElement('tr');
    row.classList.toggle('active-save-row', Number(save.id) === Number(activeSaveId));

    const updatedAtCell = document.createElement('td');
    updatedAtCell.textContent = save.updatedAt || '';
    bindSavedGamesTooltip(updatedAtCell, () => save.updatedAt || '');

    const saveNameCell = document.createElement('td');
    const saveNameInput = document.createElement('input');
    saveNameInput.type = 'text';
    saveNameInput.className = 'saved-games-name-input';
    saveNameInput.maxLength = 160;
    saveNameInput.value = save.saveName || getDefaultSaveName();
    saveNameInput.title = 'Speicherstandsname ändern';
    saveNameInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveNameInput.blur();
      }
    });
    saveNameInput.addEventListener('change', () => {
      const nextName = saveNameInput.value.trim() || getDefaultSaveName();
      if (nextName === (save.saveName || getDefaultSaveName())) {
        saveNameInput.value = nextName;
        return;
      }
      void renameSavedGame(save.id, nextName);
    });
    bindSavedGamesTooltip(saveNameInput, () => saveNameInput.value || getDefaultSaveName());
    saveNameCell.appendChild(saveNameInput);

    const summaryCell = document.createElement('td');
    summaryCell.textContent = save.participantSummary || '';
    bindSavedGamesTooltip(summaryCell, () => save.participantSummary || '');

    const actionCell = document.createElement('td');
    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'saved-games-load-btn';
    loadBtn.textContent = 'Laden';
    loadBtn.onclick = () => {
      void loadSavedGame(save.id);
    };
    actionCell.appendChild(loadBtn);

    row.appendChild(updatedAtCell);
    row.appendChild(saveNameCell);
    row.appendChild(summaryCell);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });

  updateSavedGamesPagination();
}

async function fetchStorageJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Spielstand konnte nicht verarbeitet werden.');
  }

  return data;
}

async function refreshSavedGamesList(page = savedGamesCurrentPage) {
  if (!isAuthenticatedUser) return;

  const requestedPage = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams({
    action: 'list',
    gameType: shanghaiAppConfig.gameType || '',
    page: String(requestedPage),
    pageSize: String(SAVED_GAMES_PAGE_SIZE),
    filterUpdatedAt: savedGamesFilters.updatedAt || '',
    filterSaveName: savedGamesFilters.saveName || '',
    filterParticipants: savedGamesFilters.participants || '',
  });

  const data = await fetchStorageJson(`${storageApiUrl}?${params.toString()}`);
  savedGamesCache = Array.isArray(data.saves) ? data.saves : [];
  savedGamesTotalCount = Number(data.totalCount) || 0;
  savedGamesCurrentPage = Number(data.page) || requestedPage;

  const totalPages = Math.max(1, Math.ceil(Math.max(savedGamesTotalCount, 1) / SAVED_GAMES_PAGE_SIZE));
  if (savedGamesCurrentPage > totalPages) {
    savedGamesCurrentPage = totalPages;
    return refreshSavedGamesList(savedGamesCurrentPage);
  }

  renderSavedGames();
}

async function renameSavedGame(saveId, saveName) {
  const numericSaveId = Number(saveId);
  if (!numericSaveId) return;

  const normalizedName = (saveName || '').trim() || getDefaultSaveName();
  const existingEntry = savedGamesCache.find(item => Number(item.id) === numericSaveId);
  if (existingEntry && normalizedName === (existingEntry.saveName || getDefaultSaveName())) {
    return;
  }

  try {
    const data = await fetchStorageJson(storageApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'rename',
        csrfToken: shanghaiAppConfig.csrfToken || '',
        gameType: shanghaiAppConfig.gameType || '',
        saveId: numericSaveId,
        saveName: normalizedName,
      }),
    });

    if (Number(activeSaveId) === numericSaveId) {
      activeSaveLabel = data.save?.saveName || normalizedName;
    }

    upsertSaveCacheEntry({
      id: numericSaveId,
      saveName: data.save?.saveName || normalizedName,
      updatedAt: data.save?.updatedAt || formatLocalDateTime(new Date()),
      participantSummary: data.save?.participantSummary || existingEntry?.participantSummary || '',
    });
    await refreshSavedGamesAfterMutation();
    setStorageInfo(data.message || 'Speicherstandsname gespeichert.');
  } catch (error) {
    setStorageInfo(error.message || 'Speicherstandsname konnte nicht gespeichert werden.', true);
    renderSavedGames();
  }
}

function toggleSavedGamesPanel() {
  const panel = getSavedGamesPanel();
  if (!panel) return;

  const shouldOpen = panel.hidden;
  panel.hidden = !shouldOpen;

  if (shouldOpen) {
    syncSavedGamesFilterInputs();
    void refreshSavedGamesList(savedGamesCurrentPage).catch(error => {
      setStorageInfo(error.message || 'Speicherstände konnten nicht geladen werden.', true);
    });
  }
}

function bindSavedGamesControls() {
  const panel = getSavedGamesPanel();
  if (!panel || panel.dataset.bound === 'true') return;

  panel.dataset.bound = 'true';

  const scheduleRefresh = () => {
    savedGamesFilters = {
      updatedAt: (document.getElementById('savedGamesFilterUpdatedAt')?.value || '').trim(),
      saveName: (document.getElementById('savedGamesFilterSaveName')?.value || '').trim(),
      participants: (document.getElementById('savedGamesFilterParticipants')?.value || '').trim(),
    };

    window.clearTimeout(savedGamesFilterTimer);
    savedGamesFilterTimer = window.setTimeout(() => {
      void refreshSavedGamesList(1).catch(error => {
        setStorageInfo(error.message || 'Speicherstände konnten nicht geladen werden.', true);
      });
    }, 200);
  };

  ['savedGamesFilterUpdatedAt', 'savedGamesFilterSaveName', 'savedGamesFilterParticipants'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', scheduleRefresh);
    }
  });

  const clearBtn = document.getElementById('clearSavedGamesFiltersBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      savedGamesFilters = { updatedAt: '', saveName: '', participants: '' };
      syncSavedGamesFilterInputs();
      void refreshSavedGamesList(1).catch(error => {
        setStorageInfo(error.message || 'Speicherstände konnten nicht geladen werden.', true);
      });
    });
  }

  const prevBtn = document.getElementById('savedGamesPrevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (savedGamesCurrentPage > 1) {
        void refreshSavedGamesList(savedGamesCurrentPage - 1).catch(error => {
          setStorageInfo(error.message || 'Speicherstände konnten nicht geladen werden.', true);
        });
      }
    });
  }

  const nextBtn = document.getElementById('savedGamesNextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(Math.max(savedGamesTotalCount, 1) / SAVED_GAMES_PAGE_SIZE));
      if (savedGamesCurrentPage < totalPages) {
        void refreshSavedGamesList(savedGamesCurrentPage + 1).catch(error => {
          setStorageInfo(error.message || 'Speicherstände konnten nicht geladen werden.', true);
        });
      }
    });
  }
}

async function enableStorage() {
  if (!isAuthenticatedUser) return;

  setSaveControlsBusy(true);

  try {
    const data = await fetchStorageJson(storageApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        csrfToken: shanghaiAppConfig.csrfToken || '',
        gameType: shanghaiAppConfig.gameType || '',
        saveName: getDefaultSaveName(),
        state: collectGameState(),
      }),
    });

    storageEnabled = true;
    activeSaveId = Number(data.save?.id || 0) || null;
    activeSaveLabel = data.save?.saveName || getDefaultSaveName();
    updateStorageToggleButton();
    upsertSaveCacheEntry(data.save);
    await refreshSavedGamesAfterMutation();
    setStorageInfo(data.message || 'Speichern aktiviert.');
  } catch (error) {
    setStorageInfo(error.message || 'Speichern konnte nicht aktiviert werden.', true);
  } finally {
    setSaveControlsBusy(false);
  }
}

async function deleteActiveSave() {
  if (!activeSaveId) {
    storageEnabled = false;
    activeSaveLabel = '';
    updateStorageToggleButton();
    setStorageInfo();
    return;
  }

  if (!window.confirm('Diesen Speicherstand wirklich löschen?')) {
    return;
  }

  const saveIdToDelete = activeSaveId;
  setSaveControlsBusy(true);

  try {
    await fetchStorageJson(storageApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        csrfToken: shanghaiAppConfig.csrfToken || '',
        gameType: shanghaiAppConfig.gameType || '',
        saveId: saveIdToDelete,
      }),
    });

    storageEnabled = false;
    activeSaveId = null;
    activeSaveLabel = '';
    updateStorageToggleButton();
    removeSaveCacheEntry(saveIdToDelete);
    await refreshSavedGamesAfterMutation();
    setStorageInfo('Speicherstand gelöscht.');
  } catch (error) {
    setStorageInfo(error.message || 'Speicherstand konnte nicht gelöscht werden.', true);
  } finally {
    setSaveControlsBusy(false);
  }
}

async function toggleStorage() {
  if (storageEnabled && activeSaveId) {
    await deleteActiveSave();
    return;
  }

  await enableStorage();
}

async function loadSavedGame(saveId) {
  const numericSaveId = Number(saveId);
  if (!numericSaveId) return;

  const hasSavedCurrentGame = Boolean(storageEnabled && activeSaveId);
  if (!hasSavedCurrentGame && !confirmDiscardResults()) {
    return;
  }

  setSaveControlsBusy(true);

  try {
    const data = await fetchStorageJson(
      `${storageApiUrl}?action=load&gameType=${encodeURIComponent(shanghaiAppConfig.gameType || '')}&saveId=${encodeURIComponent(numericSaveId)}`
    );

    loadGameState(data.save?.state || {});
    storageEnabled = true;
    activeSaveId = Number(data.save?.id || numericSaveId) || numericSaveId;
    activeSaveLabel = data.save?.saveName || getDefaultSaveName();
    updateStorageToggleButton();
    upsertSaveCacheEntry(data.save);
    renderSavedGames();
    setStorageInfo(`Speicherstand geladen: ${activeSaveLabel || `#${activeSaveId}`}.`);
  } catch (error) {
    setStorageInfo(error.message || 'Speicherstand konnte nicht geladen werden.', true);
  } finally {
    setSaveControlsBusy(false);
  }
}

function recordStateChange(event = {}) {
  if (isRestoringState || !isAuthenticatedUser || !storageEnabled || !activeSaveId) {
    return;
  }

  const saveId = Number(activeSaveId);
  if (!saveId) return;

  const stateSnapshot = collectGameState();
  const eventSnapshot = {
    eventType: event.eventType || 'state_update',
    source: event.source || 'ui',
    playerIndex: Number.isFinite(Number(event.playerIndex)) ? Number(event.playerIndex) : null,
    playerUserId: Number.isFinite(Number(event.playerUserId)) ? Number(event.playerUserId) : null,
    playerName: event.playerName || '',
    targetLabel: event.targetLabel || '',
    sectorResult: event.sectorResult || '',
    scoreDelta: Number.isFinite(Number(event.scoreDelta)) ? Number(event.scoreDelta) : 0,
    scoreAfter: Number.isFinite(Number(event.scoreAfter)) ? Number(event.scoreAfter) : 0,
    detectedAt: event.detectedAt || new Date().toISOString(),
    payload: event.payload && typeof event.payload === 'object' ? event.payload : {},
  };

  storageSaveChain = storageSaveChain
    .catch(() => undefined)
    .then(async () => {
      if (!storageEnabled || Number(activeSaveId) !== saveId) {
        return;
      }

      const data = await fetchStorageJson(storageApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          csrfToken: shanghaiAppConfig.csrfToken || '',
          gameType: shanghaiAppConfig.gameType || '',
          saveId,
          state: stateSnapshot,
          event: eventSnapshot,
        }),
      });

      activeSaveLabel = data.save?.saveName || activeSaveLabel;
      upsertSaveCacheEntry({
        id: saveId,
        saveName: activeSaveLabel,
        updatedAt: formatLocalDateTime(new Date()),
        participantSummary: data.save?.participantSummary || '',
      });
      await refreshSavedGamesAfterMutation();
      setStorageInfo();
    })
    .catch(error => {
      setStorageInfo(error.message || 'Automatisches Speichern fehlgeschlagen.', true);
    });
}

function startNewGame() {
  const hadActiveSave = Boolean(storageEnabled && activeSaveId);

  if (!hadActiveSave && !confirmDiscardResults()) {
    return;
  }

  if (hadActiveSave) {
    storageEnabled = false;
    activeSaveId = null;
    activeSaveLabel = '';
    updateStorageToggleButton();
    renderSavedGames();
  }

  loadGameState({ players: [] });
  setStorageInfo(hadActiveSave ? 'Speicherstand geschlossen. Neues Spiel gestartet.' : 'Neues Spiel gestartet.');
  recordStateChange({
    eventType: 'new_game',
    source: 'ui',
    detectedAt: new Date().toISOString(),
    payload: { action: 'new_game' },
  });
}

function initStorageControls() {
  if (!isAuthenticatedUser) return;

  const newGameBtn = document.getElementById('newGameBtn');
  const toggleStorageBtn = document.getElementById('toggleStorageBtn');
  const loadGamesBtn = document.getElementById('loadGamesBtn');

  if (newGameBtn) {
    newGameBtn.onclick = startNewGame;
  }
  if (toggleStorageBtn) {
    toggleStorageBtn.onclick = () => {
      void toggleStorage();
    };
  }
  if (loadGamesBtn) {
    loadGamesBtn.onclick = toggleSavedGamesPanel;
  }

  bindSavedGamesControls();
  updateStorageToggleButton();
  updateSavedGamesPagination();
  setStorageInfo();
}

function ensureControlsFooter() {
  if (controlsFooterInitialized) return;

  const appContainer = document.getElementById('appContainer');
  const manualInputDiv = document.getElementById('manualInput');
  const manualButtonsDiv = document.getElementById('manualButtons');
  const controlButtonsDiv = document.getElementById('controlButtons');
  
  if (!appContainer || !manualInputDiv || !manualButtonsDiv || !controlButtonsDiv) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'controlsFooterWrapper';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'controlsToggleBtn';
  toggleBtn.className = 'controlsToggleBtn';
  toggleBtn.textContent = controlsFooterCollapsed ? '▲' : '▼';
  toggleBtn.onclick = toggleControlsFooter;
  toggleBtn.title = 'Bedienelemente ein-/ausklappen';
  
  const contentDiv = document.createElement('div');
  contentDiv.id = 'controlsFooterContent';

  contentDiv.appendChild(manualInputDiv);
  contentDiv.appendChild(manualButtonsDiv);
  contentDiv.appendChild(controlButtonsDiv);
  
  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(contentDiv);
  
  if (controlsFooterCollapsed) {
    contentDiv.style.display = 'none';
    wrapper.classList.add('collapsed');
  }
  
  appContainer.appendChild(wrapper);
  
  setupControlsFooterButtons(contentDiv);
  
  syncControlsFooterHeight();
  controlsFooterInitialized = true;
}

function setupControlsFooterButtons(container) {
  const manualSubmitBtn = container.querySelector('#manualSubmit');
  const manualSectorInput = container.querySelector('#manualSector');

  if (manualSubmitBtn) {
    manualSubmitBtn.onclick = () => {
      const val = manualSectorInput ? manualSectorInput.value.trim() : '';
      const player = getActivePlayer();
      if (val && player) {
        player.processThrow(val, null, createManualEventMeta('manual_input', {
          sector: val,
          rawInput: val,
        }));
        if (manualSectorInput) manualSectorInput.value = '';
      }
    };
  }
  if (manualSectorInput && manualSubmitBtn) {
    manualSectorInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') manualSubmitBtn.click();
    });
  }

  const btnMiss = container.querySelector('#btnMiss');
  const btnSingle = container.querySelector('#btnSingle');
  const btnDouble = container.querySelector('#btnDouble');
  const btnTriple = container.querySelector('#btnTriple');
  
  if (btnMiss) {
    btnMiss.onclick = () => {
      const player = getActivePlayer();
      if (player) {
        player.processThrow('None', 'miss', createManualEventMeta('manual_button', {
          sector: 'None',
          type: 'miss',
        }));
      }
    };
  }
  if (btnSingle) {
    btnSingle.onclick = () => {
      const player = getActivePlayer();
      if (player) {
        player.processThrow(player.sequence[player.currentIndex], 'Single', createManualEventMeta('manual_button', {
          sector: player.sequence[player.currentIndex],
          type: 'Single',
        }));
      }
    };
  }
  if (btnDouble) {
    btnDouble.onclick = () => {
      const player = getActivePlayer();
      if (player) {
        player.processThrow(player.sequence[player.currentIndex], 'Double', createManualEventMeta('manual_button', {
          sector: player.sequence[player.currentIndex],
          type: 'Double',
        }));
      }
    };
  }
  if (btnTriple) {
    btnTriple.onclick = () => {
      const player = getActivePlayer();
      if (player) {
        player.processThrow(player.sequence[player.currentIndex], 'Triple', createManualEventMeta('manual_button', {
          sector: player.sequence[player.currentIndex],
          type: 'Triple',
        }));
      }
    };
  }
  
  const addPlayerBtn = container.querySelector('#addPlayerButton');
  const editBtn = container.querySelector('#editButton');
  const saveBtn = container.querySelector('#saveButton');
  const undoBtn = container.querySelector('#undoButton');
  const autoBtn = container.querySelector('#autoPlayerBtn');
  const manualBtn = container.querySelector('#manualPlayerBtn');
  
  if (addPlayerBtn) addPlayerBtn.onclick = addPlayer;
  if (editBtn) {
    editBtn.onclick = () => {
      const player = getActivePlayer();
      if (player) player.enterEditMode();
    };
  }
  if (saveBtn) {
    saveBtn.onclick = () => {
      const player = getActivePlayer();
      if (player) player.exitEditMode();
    };
  }
  if (undoBtn) {
    undoBtn.onclick = () => {
      const player = getActivePlayer();
      if (player) player.undoLastThrow();
    };
  }
  if (autoBtn) {
    autoBtn.onclick = () => {
      autoPlayerSwitch = true;
      updateAutoPlayerSwitchBtn();
      recordStateChange({
        eventType: 'auto_switch_enabled',
        source: 'ui',
        detectedAt: new Date().toISOString(),
        payload: { autoPlayerSwitch: true },
      });
    };
  }
  if (manualBtn) {
    manualBtn.onclick = () => {
      autoPlayerSwitch = false;
      updateAutoPlayerSwitchBtn();
      recordStateChange({
        eventType: 'auto_switch_disabled',
        source: 'ui',
        detectedAt: new Date().toISOString(),
        payload: { autoPlayerSwitch: false },
      });
    };
  }
}

// 1) Init-Funktion nach Login (v3.1)
function initApp() {
  // Anmeldedaten aus config (bzw. localStorage) übernehmen
  const { serialNumber, accessToken } = window.SCOLIA_CONFIG;

  // 2) WebSocket-Verbindung initialisieren
  const statusEl = document.getElementById('status');
  if (statusEl && serialNumber && accessToken) {
    let ws = new WebSocket(
      `wss://game.scoliadarts.com/api/v1/social?serialNumber=${serialNumber}&accessToken=${accessToken}`
    );
    ws.onopen = () => statusEl.textContent = 'Board-Status: Ready';
    ws.onclose = () => statusEl.textContent = 'Board-Status: Offline';
    ws.onerror = () => statusEl.textContent = 'Board-Status: Fehler';
    ws.onmessage = ({ data }) => handleMessage(JSON.parse(data));
  }

  // Erstelle Controls Footer
  ensureControlsFooter();
  addPlayer();
  updateOverviewTable();
  updateUndoButtonVisibility();
  initStorageControls();
}

function addPlayer() {
  const playerIndex = nextPlayerId++;
  const activePlayer = getActivePlayer();
  const currentUserId = Number.parseInt(String(shanghaiAppConfig.userId ?? ''), 10);
  const currentDisplayName = (shanghaiAppConfig.displayName || shanghaiAppConfig.username || '').toString().trim();
  const playerName = activePlayer
    ? activePlayer.name
    : (currentDisplayName || `Spieler ${playerIndex + 1}`);
  const player = new Player(playerName, playerIndex);
  player.portalUserId = activePlayer
    ? (Number.isFinite(Number(activePlayer.portalUserId)) ? Number(activePlayer.portalUserId) : null)
    : (Number.isFinite(currentUserId) ? currentUserId : null);
  player.participantRole = activePlayer?.participantRole
    || (player.portalUserId === currentUserId ? 'owner' : (player.portalUserId ? 'friend' : 'guest'));
  player.invitationStatus = activePlayer?.invitationStatus || 'accepted';
  player.invitedByUserId = activePlayer
    ? (Number.isFinite(Number(activePlayer.invitedByUserId)) ? Number(activePlayer.invitedByUserId) : null)
    : null;
  players[playerIndex] = player;
  tablesContainer.appendChild(player.container);
  if (getPlayerIds().length === 1) {
    activePlayerIndex = playerIndex;
  }
  updateAllActivateBtns();
  updateAutoPlayerSwitchBtn();
  updateOverviewTable();
  updateUndoButtonVisibility();
  recordStateChange({
    eventType: 'player_add',
    source: 'ui',
    playerIndex,
    playerName: player.name,
    scoreAfter: player.totalScore,
    detectedAt: new Date().toISOString(),
    payload: { playerIndex, playerName: player.name },
  });
}

function deletePlayer(index) {
  const player = players[index];
  if (!player) return;

  const removedPlayerName = player.name;

  if (editingPlayerIndex === player.index) {
    editingPlayerIndex = null;
  }

  player.container.remove();
  delete players[player.index];

  document.getElementById('editButton').style.display = 'inline';
  document.getElementById('saveButton').style.display = 'none';

  const remainingIds = getPlayerIds();
  if (remainingIds.length === 0) {
    recordStateChange({
      eventType: 'player_delete',
      source: 'ui',
      playerIndex: index,
      playerName: removedPlayerName,
      detectedAt: new Date().toISOString(),
      payload: { playerIndex: index, playerName: removedPlayerName },
    });
    addPlayer();
    updateUndoButtonVisibility();
    return;
  }

  activePlayerIndex = remainingIds[0];
  updateAllActivateBtns();
  updateAutoPlayerSwitchBtn();
  updateOverviewTable();
  const activePlayer = getActivePlayer();
  if (activePlayer) activePlayer.updateTripleButton();
  updateUndoButtonVisibility();
  recordStateChange({
    eventType: 'player_delete',
    source: 'ui',
    playerIndex: index,
    playerName: removedPlayerName,
    detectedAt: new Date().toISOString(),
    payload: { playerIndex: index, playerName: removedPlayerName },
  });
}

function setActivePlayer(index) {
  if (!players[index]) return;
  if (editingPlayerIndex !== null && editingPlayerIndex !== index && players[editingPlayerIndex]) {
    players[editingPlayerIndex].exitEditMode();
  }
  activePlayerIndex = index;
  updateAllActivateBtns();
  const activePlayer = getActivePlayer();
  if (activePlayer) {
    activePlayer.updateTripleButton();
  }
  updateUndoButtonVisibility();
  recordStateChange({
    eventType: 'player_activate',
    source: 'ui',
    playerIndex: index,
    playerName: activePlayer?.name || '',
    scoreAfter: activePlayer?.totalScore || 0,
    detectedAt: new Date().toISOString(),
    payload: { playerIndex: index },
  });
}

function updateAllActivateBtns() {
  getPlayerIds().forEach(id => players[id].updateActivateBtn());
}

function switchToNextPlayer() {
  const openIds = getOpenPlayerIds();

  if (openIds.length === 0) {
    autoPlayerSwitch = false;
    updateAutoPlayerSwitchBtn();
    return;
  }

  if (openIds.length === 1) {
    if (openIds[0] !== activePlayerIndex) {
      setActivePlayer(openIds[0]);
    }
    return;
  }

  const currentPos = openIds.indexOf(activePlayerIndex);
  const startPos = currentPos === -1 ? 0 : (currentPos + 1) % openIds.length;
  setActivePlayer(openIds[startPos]);
}

function updateAutoPlayerSwitchBtn() {
  const count = getPlayerIds().length;
  const openCount = getOpenPlayerIds().length;
  const autoBtn = document.getElementById('autoPlayerBtn');
  const manualBtn = document.getElementById('manualPlayerBtn');
  if (openCount === 0 || count <= 1) {
    autoPlayerSwitch = false;
    autoBtn.style.display = 'inline';
    autoBtn.disabled = true;
    manualBtn.style.display = 'none';
  } else if (autoPlayerSwitch) {
    autoBtn.style.display = 'none';
    manualBtn.style.display = 'inline';
  } else {
    autoBtn.style.display = 'inline';
    autoBtn.disabled = false;
    manualBtn.style.display = 'none';
  }
}

function handleMessage(msg) {
  console.debug('WS message:', msg);
  if (msg.type === 'THROW_DETECTED') {
    const payload = msg && typeof msg.payload === 'object' && msg.payload ? msg.payload : {};
    const sector = (payload.sector || '').toString().toLowerCase();
    const bounceout = Boolean(payload.bounceout);
    const miss = bounceout || sector === 'none';
    console.debug('THROW_DETECTED', { sector, bounceout, miss, payload });
    const player = getActivePlayer();
    if (player) {
      player.processThrow(miss ? 'None' : payload.sector, miss ? 'miss' : null, {
        eventType: 'throw_detected',
        source: 'scolia_ws',
        detectedAt: payload.detectionTime || new Date().toISOString(),
        payload: { ...payload },
      });
    }
  }
  if (msg.type === 'TAKEOUT_FINISHED' && autoPlayerSwitch) {
    switchToNextPlayer();
  }
}