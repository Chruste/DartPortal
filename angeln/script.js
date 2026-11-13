// Angeln: 7 rounds of 3 darts. Darts 1-2 add scoring length; dart 3 must hit a bull to land the fish.
const players = {};
let activePlayerIndex = 0;
let nextPlayerId = 0;
let editingPlayerIndex = null;
let autoPlayerSwitch = false;
let archivedMode = false;
let storageEnabled = false;
let activeSaveId = null;
let activeSaveLabel = '';
let activeSaveIsOwner = false;
let savedGamesCache = [];
let savedGamesCurrentPage = 1;
let savedGamesTotalCount = 0;
let savedGamesFilters = { updatedAt: '', saveName: '', participants: '' };
let overviewTableBody = null;
let controlsFooterInitialized = false;
let isRestoringState = false;
let activeSaveGeneration = 0;
let eventNumber = 0;
let manualChangeSerial = 0;
let eventQueue = Promise.resolve();
const APP = window.SHANGHAI_APP || {};
const STORAGE_API = '/cloud-storage.php';
const ROUNDS = 7;
const DARTS_PER_ROUND = 3;

function normalizeHit(raw, type = null) {
  const value = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (type === 'miss' || value === '' || value === 'NONE' || value === 'MISS' || value === '0') {
    return { label: 'Miss', points: 0, bull: false };
  }
  if (value === 'BULL' || value === 'BULLSEYE' || value === 'DBULL') {
    return { label: 'Bullseye', points: 50, bull: true };
  }
  if (value === '25' || value === 'SBULL' || value === 'S25' || value === 'SINGLEBULL') {
    return { label: 'Single Bull', points: 25, bull: true };
  }
  const match = value.match(/^([SDT]?)(20|1[0-9]|[1-9])$/);
  if (!match) return null;
  const prefix = type === 'Double' ? 'D' : type === 'Triple' ? 'T' : type === 'Single' ? 'S' : match[1];
  if (prefix === 'S' || prefix === '') return { label: match[2], points: Number(match[2]), bull: false };
  const multiplier = prefix === 'D' ? 2 : 3;
  return { label: `${prefix} ${match[2]}`, points: Number(match[2]) * multiplier, bull: false };
}

class AngelnPlayer {
  constructor(name, index) {
    this.name = name;
    this.index = index;
    this.portalUserId = null;
    this.participantRole = 'guest';
    this.invitationStatus = 'accepted';
    this.invitedByUserId = null;
    this.currentIndex = 0;
    this.darts = Array.from({ length: ROUNDS * DARTS_PER_ROUND }, () => null);
    this.totalScore = 0;
    this.container = document.createElement('div');
    this.container.className = 'player-card';
    this.container.appendChild(this.makeActivationControls());
    this.container.appendChild(this.makeTable());
    this.updateActivation();
  }

  makeActivationControls() {
    const area = document.createElement('div');
    this.activateBtn = document.createElement('button');
    this.activateBtn.className = 'playerActivateBtn';
    this.activateBtn.textContent = 'Aktivieren';
    this.activateBtn.onclick = () => setActivePlayer(this.index);
    this.deleteBtn = document.createElement('button');
    this.deleteBtn.className = 'playerDeleteBtn';
    this.deleteBtn.textContent = 'Spieler löschen';
    this.deleteBtn.disabled = true;
    this.deleteBtn.onclick = () => {
      this.deleteBtn.style.display = 'none';
      this.confirmDeleteBtn.style.display = 'inline-block';
    };
    this.confirmDeleteBtn = document.createElement('button');
    this.confirmDeleteBtn.className = 'playerConfirmDeleteBtn';
    this.confirmDeleteBtn.textContent = 'Wirklich löschen?';
    this.confirmDeleteBtn.style.display = 'none';
    this.confirmDeleteBtn.onclick = () => deletePlayer(this.index);
    area.append(this.activateBtn, this.deleteBtn, this.confirmDeleteBtn);
    return area;
  }

  makeTable() {
    const table = document.createElement('table');
    table.id = `playerTable${this.index}`;
    const colgroup = document.createElement('colgroup');
    [55, 70, 70, 70, 165, 70].forEach(width => {
      const column = document.createElement('col');
      column.style.width = `${width}px`;
      colgroup.appendChild(column);
    });
    table.appendChild(colgroup);
    const thead = document.createElement('thead');
    const nameRow = document.createElement('tr');
    const nameCell = document.createElement('th');
    nameCell.colSpan = 6;
    nameCell.id = `playerNameCell${this.index}`;
    nameCell.className = 'player-name';
    nameCell.textContent = this.name;
    nameRow.appendChild(nameCell);
    thead.appendChild(nameRow);
    const headings = document.createElement('tr');
    ['Runde', 'Dart 1', 'Dart 2', 'Dart 3', 'Köder', 'Punkte'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headings.appendChild(th);
    });
    thead.appendChild(headings);
    table.appendChild(thead);
    this.tbody = document.createElement('tbody');
    for (let round = 0; round < ROUNDS; round += 1) {
      const row = document.createElement('tr');
      row.dataset.round = String(round);
      row.innerHTML = `<td>${round + 1}</td><td></td><td></td><td></td><td></td><td></td>`;
      this.tbody.appendChild(row);
    }
    table.appendChild(this.tbody);
    const tfoot = document.createElement('tfoot');
    const total = document.createElement('tr');
    total.innerHTML = '<td colspan="5">Gesamt</td><td class="total-cell">0</td>';
    tfoot.appendChild(total);
    table.appendChild(tfoot);
    this.totalCell = total.lastElementChild;
    this.totalRow = total;
    this.table = table;
    this.render();
    const area = document.createElement('div');
    area.className = 'tableArea';
    area.appendChild(table);
    this.tableArea = area;
    return area;
  }

  updateActivation() {
    const active = this.index === activePlayerIndex;
    this.activateBtn.style.display = active ? 'none' : 'inline-block';
    this.activateBtn.disabled = archivedMode;
    this.deleteBtn.style.display = active ? 'inline-block' : 'none';
    this.deleteBtn.disabled = archivedMode || editingPlayerIndex === null;
    this.confirmDeleteBtn.disabled = archivedMode;
    this.tableArea?.classList.toggle('inactive', !active);
    this.render();
    this.highlight();
  }

  highlight() {
    this.tbody.querySelectorAll('tr').forEach((row, i) => row.classList.toggle('current-row', i === Math.floor(this.currentIndex / 3) && this.currentIndex < 21));
    this.table.classList.toggle('highlight-complete', this.currentIndex >= 21);
    this.totalRow.classList.toggle('completed-total-row', this.currentIndex >= 21);
  }

  fishRegion(round) {
    const darts = this.darts.slice(round * 3, round * 3 + 2).filter(dart => dart && dart.label !== 'Miss');
    if (!darts.length) return '';

    const surface = new Set([9, 12, 5, 20, 1, 18, 4]);
    const ground = new Set([16, 7, 19, 3, 17, 2, 15]);
    const regions = darts.map(dart => {
      if (dart.bull) return 'Mittelwasser';
      const match = dart.label.match(/^[SDT]?\s*(\d+)$/i);
      if (!match) return 'Mittelwasser';
      const field = Number(match[1]);
      if (surface.has(field)) return 'Oberfläche';
      if (ground.has(field)) return 'Grund';
      return 'Mittelwasser';
    });

    return regions.every(region => region === regions[0]) ? regions[0] : 'Mittelwasser';
  }

  roundResult(round) {
    const start = round * 3;
    const first = this.darts[start];
    const second = this.darts[start + 1];
    const third = this.darts[start + 2];
    if (!first && !second && !third) return { base: 0, caught: null, status: '', points: '' };
    const base = (first?.points || 0) + (second?.points || 0);
    if (!third) return { base, caught: null, status: 'am Haken', points: base };
    if (!third.bull) return { base, caught: false, status: 'verloren', points: base };
    return { base, length: base + third.points, caught: true, status: 'gefangen', points: base + third.points };
  }

  recompute() {
    let total = 0;
    for (let round = 0; round < ROUNDS; round += 1) {
      const result = this.roundResult(round);
      if (result.caught === true) total += result.length;
    }
    this.totalScore = total;
    const firstEmpty = this.darts.findIndex(dart => dart === null);
    this.currentIndex = firstEmpty === -1 ? this.darts.length : firstEmpty;
    this.render();
    updateOverviewTable();
    updateUndoButtonVisibility();
    updateAutoPlayerSwitchBtn();
  }

  render() {
    if (!this.tbody) return;
    if (this.index === activePlayerIndex) {
      const thirdDart = this.currentIndex % 3 === 2;
      const triple = document.getElementById('btnTriple');
      if (triple) { triple.disabled = thirdDart || archivedMode; triple.title = thirdDart ? 'Beim dritten Dart muss ein Bull getroffen werden.' : 'Triple'; }
      const single = document.getElementById('btnSingle');
      const double = document.getElementById('btnDouble');
      if (single) single.textContent = 'Single';
      if (double) double.textContent = 'Double';
      if (triple) triple.style.display = thirdDart ? 'none' : '';
    }
    for (let round = 0; round < ROUNDS; round += 1) {
      const start = round * 3;
      const result = this.roundResult(round);
      const row = this.tbody.children[round];
      [1, 2, 3].forEach((cellIndex, dartIndex) => {
        const dart = this.darts[start + dartIndex];
        row.cells[cellIndex].textContent = dart ? (dart.bull ? String(dart.points) : dart.label) : '';
      });
      row.cells[4].textContent = this.fishRegion(round);
      row.cells[4].classList.add('bait-region-cell');
      row.cells[5].textContent = result.points === '' ? '' : String(result.points);
      row.classList.toggle('hit', result.caught === true);
      row.classList.toggle('failed-catch', result.caught === false);
    }
    this.totalCell.textContent = String(this.totalScore);
    this.highlight();
  }

  processThrow(raw, type = null, eventMeta = null) {
    if (archivedMode || this.currentIndex >= 21 || editingPlayerIndex !== null) return;
    const parsed = normalizeHit(raw, type);
    if (!parsed) {
      alert('Ungültiger Wurf. Beispiele: S20, D16, T20, Bull, 25 oder Miss.');
      return;
    }
    const index = this.currentIndex;
    const previousTotal = this.totalScore;
    const eventNo = ++eventNumber;
    manualChangeSerial += 1;
    this.darts[index] = parsed;
    this.recompute();
    recordStateChange({
      eventNo,
      eventType: eventMeta?.eventType || 'throw',
      source: eventMeta?.source || 'unknown',
      playerIndex: this.index,
      playerUserId: this.portalUserId,
      playerName: this.name,
      targetLabel: `Runde ${Math.floor(index / 3) + 1}, Dart ${index % 3 + 1}`,
      sectorResult: parsed.label,
      scoreDelta: this.totalScore - previousTotal,
      scoreAfter: this.totalScore,
      detectedAt: eventMeta?.detectedAt || new Date().toISOString(),
      payload: eventMeta?.payload || { raw, type, dartIndex: index },
    });
    if (autoPlayerSwitch && index % 3 === 2 && eventMeta?.source !== 'scolia_ws') switchToNextPlayer();
  }

  undoLastThrow() {
    if (archivedMode || this.currentIndex <= 0 || editingPlayerIndex !== null) return;
    this.darts[this.currentIndex - 1] = null;
    manualChangeSerial += 1;
    this.recompute();
    recordStateChange({ eventType: 'undo', source: 'ui', playerIndex: this.index, playerName: this.name, scoreAfter: this.totalScore, payload: { currentIndex: this.currentIndex } });
  }

  enterEditMode() {
    if (archivedMode) return;
    editingPlayerIndex = this.index;
    manualChangeSerial += 1;
    document.getElementById('editButton').style.display = 'none';
    document.getElementById('saveButton').style.display = 'inline-block';
    this.deleteBtn.disabled = false;
    const nameCell = document.getElementById(`playerNameCell${this.index}`);
    nameCell.replaceChildren();
    const nameInput = document.createElement('input');
    nameInput.className = 'hit-input';
    nameInput.value = this.name;
    nameInput.dataset.nameEditor = '1';
    nameCell.appendChild(nameInput);
    for (let round = 0; round < ROUNDS; round += 1) {
      for (let col = 1; col <= 3; col += 1) {
        const cell = this.tbody.children[round].cells[col];
        const dart = this.darts[round * 3 + col - 1];
        const input = document.createElement('input');
        input.className = 'hit-input';
        input.value = dart?.label || '';
        input.dataset.dartIndex = String(round * 3 + col - 1);
        cell.replaceChildren(input);
      }
    }
  }

  exitEditMode() {
    if (editingPlayerIndex !== this.index) return;
    const nameInput = this.table.querySelector('[data-name-editor]');
    if (nameInput) this.name = nameInput.value.trim() || `Spieler ${this.index + 1}`;
    const nextDarts = Array.from({ length: 21 }, () => null);
    let gapSeen = false;
    const inputs = Array.from(this.table.querySelectorAll('[data-dart-index]'));
    for (const input of inputs) {
      const raw = input.value.trim();
      const index = Number(input.dataset.dartIndex);
      if (!raw) { gapSeen = true; continue; }
      if (gapSeen) { alert('Würfe müssen in Reihenfolge ohne Lücken eingetragen werden.'); return; }
      const parsed = normalizeHit(raw);
      if (!parsed) { alert(`Ungültiger Wurf: ${raw}`); input.focus(); return; }
      nextDarts[index] = parsed;
    }
    this.darts = nextDarts;
    manualChangeSerial += 1;
    editingPlayerIndex = null;
    document.getElementById(`playerNameCell${this.index}`).textContent = this.name;
    document.getElementById('editButton').style.display = 'inline-block';
    document.getElementById('saveButton').style.display = 'none';
    this.recompute();
    updateAllActivateBtns();
    recordStateChange({ eventType: 'edit_save', source: 'edit', playerIndex: this.index, playerName: this.name, scoreAfter: this.totalScore, payload: { darts: this.darts } });
  }
}

function getPlayerIds() { return Object.keys(players).map(Number).sort((a, b) => a - b); }
function getActivePlayer() { return players[activePlayerIndex] || null; }
function getOpenPlayerIds() { return getPlayerIds().filter(id => players[id].currentIndex < 21); }
function updateAllActivateBtns() { getPlayerIds().forEach(id => players[id].updateActivation()); }

function buildPlayerState(player) {
  return {
    index: player.index, name: player.name, portalUserId: player.portalUserId,
    participantRole: player.participantRole || 'guest', invitationStatus: player.invitationStatus || 'accepted',
    invitedByUserId: player.invitedByUserId, currentIndex: player.currentIndex, totalScore: player.totalScore,
    darts: player.darts.map(dart => dart ? { label: dart.label, points: dart.points, bull: dart.bull } : null),
    rows: Array.from({ length: ROUNDS }, (_, round) => ({ round: round + 1, ...player.roundResult(round) })),
  };
}

function collectGameState() {
  return { gameType: 'angeln', activePlayerIndex, nextPlayerId, autoPlayerSwitch, eventNumber, players: getPlayerIds().map(id => buildPlayerState(players[id])) };
}

function clearPlayers() {
  activeSaveGeneration += 1;
  Object.values(players).forEach(player => player.container.remove());
  for (const key of Object.keys(players)) delete players[key];
  activePlayerIndex = 0; nextPlayerId = 0; editingPlayerIndex = null; autoPlayerSwitch = false;
}

function applyLoadedPlayerState(saved, fallbackIndex) {
  const index = Number.isInteger(Number(saved.index)) ? Number(saved.index) : fallbackIndex;
  const player = new AngelnPlayer((saved.name || `Spieler ${index + 1}`).trim(), index);
  player.portalUserId = Number.isFinite(Number(saved.portalUserId)) ? Number(saved.portalUserId) : null;
  player.participantRole = saved.participantRole || (player.portalUserId ? 'friend' : 'guest');
  player.invitationStatus = saved.invitationStatus || 'accepted';
  player.invitedByUserId = Number.isFinite(Number(saved.invitedByUserId)) ? Number(saved.invitedByUserId) : null;
  const restored = Array.isArray(saved.darts) ? saved.darts : [];
  player.darts = Array.from({ length: 21 }, (_, i) => {
    const dart = restored[i];
    if (!dart || typeof dart !== 'object') return null;
    const parsed = normalizeHit(dart.label);
    return parsed || null;
  });
  players[index] = player;
  player.recompute();
  document.getElementById('tablesContainer').appendChild(player.container);
  return player;
}

function loadGameState(state = {}) {
  isRestoringState = true;
  clearPlayers();
  const savedPlayers = Array.isArray(state.players) ? state.players : [];
  if (!savedPlayers.length) addPlayer();
  else savedPlayers.forEach((saved, i) => applyLoadedPlayerState(saved, i));
  const ids = getPlayerIds();
  activePlayerIndex = ids.includes(Number(state.activePlayerIndex)) ? Number(state.activePlayerIndex) : (ids[0] ?? 0);
  nextPlayerId = Math.max(Number(state.nextPlayerId) || 0, ...ids.map(id => id + 1), 0);
  autoPlayerSwitch = Boolean(state.autoPlayerSwitch);
  eventNumber = Number(state.eventNumber) || 0;
  isRestoringState = false;
  updateAllActivateBtns(); updateOverviewTable(); updateAutoPlayerSwitchBtn(); updateUndoButtonVisibility(); updateGameInteractionState();
}

function hasGameProgress() {
  return getPlayerIds().some(id => players[id].currentIndex > 0 || players[id].name !== `Spieler ${id + 1}`) || getPlayerIds().length > 1;
}
function confirmDiscardResults() { return !hasGameProgress() || window.confirm('Ungespeicherte Ergebnisse gehen verloren. Fortfahren?'); }
function createManualEventMeta(source, payload = {}) { return { eventType: 'throw_detected', source, detectedAt: new Date().toISOString(), payload: { ...payload, manual: true } }; }
function getDefaultSaveName() { return 'Angeln'; }
function formatLocalDateTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date); }
function setStorageInfo(message = '', isError = false) { const el = document.getElementById('saveStateInfo'); if (!el) return; el.textContent = message || (storageEnabled ? `Cloud-Spiel aktiv: ${activeSaveLabel}` : 'Lokales Spiel aktiv. Noch nicht in der Cloud gespeichert.'); el.classList.toggle('error', isError); }
function setInviteInfo(message = '', isError = false) { const el = document.getElementById('inviteStateInfo'); if (el) { el.textContent = message || 'Aktiviere einen Cloud-Spielstand, um Freunde einzuladen.'; el.classList.toggle('error', isError); } }
function setBusy(busy) { document.querySelectorAll('#newGameBtn,#toggleStorageBtn,#loadGamesBtn,#toggleInvitePanelBtn,#refreshInviteCandidatesBtn').forEach(btn => { if (btn) btn.disabled = busy; }); }
function updateStorageToggleButton() { const btn = document.getElementById('toggleStorageBtn'); if (!btn) return; btn.textContent = storageEnabled && activeSaveId ? 'Cloud Spiel' : 'Lokales Spiel'; btn.title = storageEnabled && activeSaveId ? 'Wechselt zum lokalen Spiel. Der aktuelle Spielstand bleibt in der Cloud bestehen.' : 'Neuen Cloud Spielstand mit den aktuellen Ergebnissen anlegen.'; btn.setAttribute('aria-label', btn.title); btn.classList.toggle('storage-cloud-mode', storageEnabled && Boolean(activeSaveId)); btn.classList.toggle('storage-local-mode', !(storageEnabled && activeSaveId)); }
function setArchiveMode(archived) { archivedMode = Boolean(archived && activeSaveId); updateAllActivateBtns(); updateGameInteractionState(); updateUndoButtonVisibility(); }
function updateGameInteractionState() { const locked = Boolean(archivedMode); ['manualSector','manualSubmit','btnMiss','btnSingle','btnDouble','btnTriple','addPlayerButton','editButton','saveButton','autoPlayerBtn','manualPlayerBtn'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = locked; }); }
function updateUndoButtonVisibility() { const btn = document.getElementById('undoButton'); if (!btn) return; const active = getActivePlayer(); const can = Boolean(!archivedMode && editingPlayerIndex === null && active?.currentIndex > 0); btn.style.visibility = can ? 'visible' : 'hidden'; btn.style.pointerEvents = can ? 'auto' : 'none'; btn.disabled = !can; }

function ensureOverviewTable() {
  if (overviewTableBody) return;
  const wrapper = document.createElement('div'); wrapper.id = 'playerOverviewWrapper';
  const collapsed = localStorage.getItem('angelnOverviewCollapsed') === 'true'; wrapper.classList.toggle('collapsed', collapsed);
  const title = document.createElement('h3'); title.id = 'playerOverviewTitle'; title.textContent = 'Spielerliste';
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'overviewToggleBtn'; toggle.textContent = collapsed ? '▲' : '▼'; toggle.title = 'Spielerliste ein-/ausklappen';
  toggle.onclick = () => { wrapper.classList.toggle('collapsed'); const isCollapsed = wrapper.classList.contains('collapsed'); localStorage.setItem('angelnOverviewCollapsed', String(isCollapsed)); toggle.textContent = isCollapsed ? '▲' : '▼'; updateFooterLayout(); };
  const table = document.createElement('table'); table.id = 'playerOverviewTable'; table.innerHTML = '<thead><tr><th>Name</th><th>Punkte</th></tr></thead>';
  overviewTableBody = document.createElement('tbody'); table.appendChild(overviewTableBody); wrapper.append(toggle, title, table);
  document.getElementById('tablesContainer').insertAdjacentElement('afterend', wrapper);
  window.addEventListener('resize', updateFooterLayout);
}
function updateOverviewTable() {
  ensureOverviewTable(); overviewTableBody.replaceChildren();
  const totals = new Map();
  getPlayerIds().forEach(id => { const p = players[id]; totals.set(p.name.trim() || 'Spieler', (totals.get(p.name.trim() || 'Spieler') || 0) + p.totalScore); });
  totals.forEach((points, name) => { const row = document.createElement('tr'); const nameCell = document.createElement('td'); const totalCell = document.createElement('td'); nameCell.textContent = name; totalCell.textContent = String(points); row.append(nameCell, totalCell); overviewTableBody.appendChild(row); });
  updateFooterLayout();
}
function updateFooterLayout() {
  const overview = document.getElementById('playerOverviewWrapper'); const controls = document.getElementById('controlsFooterWrapper');
  const overviewHeight = overview ? overview.getBoundingClientRect().height : 0;
  if (controls) controls.style.bottom = `${overviewHeight}px`;
  const controlsHeight = controls ? controls.getBoundingClientRect().height : 0;
  document.getElementById('appContainer').style.paddingBottom = `${overviewHeight + controlsHeight + 20}px`;
}
function ensureControlsFooter() {
  if (controlsFooterInitialized) return;
  const app = document.getElementById('appContainer'); const manual = document.getElementById('manualInput'); const buttons = document.getElementById('manualButtons'); const controls = document.getElementById('controlButtons');
  const wrapper = document.createElement('div'); wrapper.id = 'controlsFooterWrapper';
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'controlsToggleBtn'; toggle.textContent = localStorage.getItem('angelnControlsCollapsed') === 'true' ? '▲' : '▼';
  const content = document.createElement('div'); content.id = 'controlsFooterContent';
  wrapper.classList.toggle('collapsed', localStorage.getItem('angelnControlsCollapsed') === 'true');
  toggle.onclick = () => { wrapper.classList.toggle('collapsed'); const collapsed = wrapper.classList.contains('collapsed'); localStorage.setItem('angelnControlsCollapsed', String(collapsed)); toggle.textContent = collapsed ? '▲' : '▼'; updateFooterLayout(); };
  content.append(manual, buttons, controls); wrapper.append(toggle, content); app.appendChild(wrapper); controlsFooterInitialized = true; updateFooterLayout();
}

async function fetchStorageJson(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', ...options }); const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) { const error = new Error(data.message || 'Speicherstand konnte nicht verarbeitet werden.'); error.status = response.status; throw error; }
  return data;
}
function getActiveSaveStorageKey() { return `angeln:last-save:${APP.userId || 'guest'}`; }
function syncPersistedActiveSave() { if (APP.isAuthenticated && storageEnabled && activeSaveId) localStorage.setItem(getActiveSaveStorageKey(), JSON.stringify({ saveId: activeSaveId })); else localStorage.removeItem(getActiveSaveStorageKey()); }
function getPersistedActiveSaveId() { try { const parsed = JSON.parse(localStorage.getItem(getActiveSaveStorageKey()) || '{}'); return Number(parsed.saveId) || null; } catch { return null; } }
function upsertSave(save) { if (!save?.id) return; const entry = { id: Number(save.id), saveName: save.saveName || 'Angeln', updatedAt: save.updatedAt || '', participantSummary: save.participantSummary || '', isArchived: Boolean(save.isArchived), isOwner: save.isOwner !== false }; const i = savedGamesCache.findIndex(item => item.id === entry.id); if (i >= 0) savedGamesCache[i] = { ...savedGamesCache[i], ...entry }; else if (!entry.isInvitation) savedGamesCache.unshift(entry); renderSavedGames(); }
function removeSave(saveId) { savedGamesCache = savedGamesCache.filter(save => save.id !== Number(saveId)); renderSavedGames(); }
function openSavedPanel(open) { const panel = document.getElementById('savedGamesPanel'); panel.hidden = !open; panel.classList.toggle('is-open', open); const btn = document.getElementById('loadGamesBtn'); btn.textContent = open ? '... einklappen' : 'Speicherstände...'; if (open) void refreshSavedGamesList(1).catch(error => setStorageInfo(error.message, true)); }
function renderSavedGames() {
  const body = document.getElementById('savedGamesBody'); if (!body) return; body.replaceChildren();
  if (!savedGamesCache.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 4; cell.textContent = 'Keine Speicherstände vorhanden.'; return; }
  const invitations = savedGamesCache.filter(save => save.isInvitation);
  invitations.forEach(save => {
    const row = body.insertRow(); row.className = 'saved-games-row';
    const title = row.insertCell(); title.dataset.label = 'Einladung'; title.textContent = save.saveName || 'Angeln';
    const date = row.insertCell(); date.dataset.label = 'Letzte Änderung'; date.textContent = save.updatedAt || '';
    const participants = row.insertCell(); participants.dataset.label = 'Teilnehmende'; participants.textContent = save.participantSummary || '';
    const actions = row.insertCell(); actions.dataset.label = 'Aktionen'; const group = document.createElement('div'); group.className = 'saved-games-action-group';
    ['accept_invitation', 'reject_invitation'].forEach(actionName => { const button = document.createElement('button'); button.type = 'button'; button.dataset.action = actionName; button.dataset.saveId = String(save.id); button.textContent = actionName === 'accept_invitation' ? 'Annehmen' : 'Ablehnen'; group.appendChild(button); });
    actions.appendChild(group);
  });
  savedGamesCache.filter(save => !save.isInvitation).forEach(save => {
    const row = body.insertRow(); row.className = 'saved-games-row';
    const nameCell = row.insertCell(); nameCell.dataset.label = 'Speicherstand'; const name = document.createElement('input'); name.className = 'saved-games-name-input'; name.value = save.saveName; name.disabled = save.isArchived || !save.isOwner; name.addEventListener('change', () => void renameSavedGame(save.id, name.value.trim())); nameCell.appendChild(name);
    const dateCell = row.insertCell(); dateCell.dataset.label = 'Letzte Änderung'; dateCell.textContent = save.updatedAt;
    const participantsCell = row.insertCell(); participantsCell.dataset.label = 'Teilnehmende'; participantsCell.textContent = save.participantSummary;
    const actions = row.insertCell(); actions.dataset.label = 'Aktionen'; const group = document.createElement('div'); group.className = 'saved-games-action-group';
    const load = document.createElement('button'); load.type = 'button'; load.textContent = '📂'; load.title = 'Laden'; load.onclick = () => void loadSavedGame(save.id); group.appendChild(load);
    const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = '📄'; copy.title = 'Kopie laden'; copy.onclick = () => void copySavedGame(save.id); group.appendChild(copy);
    const archive = document.createElement('button'); archive.type = 'button'; archive.textContent = save.isArchived ? '♻️' : '🗄️'; archive.disabled = !save.isOwner; archive.title = 'Archivieren/reaktivieren'; archive.onclick = () => void toggleSaveArchive(save.id, !save.isArchived); group.appendChild(archive);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '🗑️'; remove.disabled = !save.isOwner; remove.title = 'Löschen'; remove.onclick = () => void deleteSavedGame(save.id); group.appendChild(remove);
    actions.appendChild(group);
  });
  const pages = Math.max(1, Math.ceil(savedGamesTotalCount / 10)); document.getElementById('savedGamesCountInfo').textContent = `${savedGamesTotalCount} Speicherstände`;
  document.getElementById('savedGamesPrevBtn').disabled = savedGamesCurrentPage <= 1; document.getElementById('savedGamesNextBtn').disabled = savedGamesCurrentPage >= pages;
}
async function respondToGameInvitation(saveId, action) {
  try {
    const result = await fetchStorageJson(STORAGE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, csrfToken: APP.csrfToken, gameType: 'angeln', saveId }) });
    if (action === 'accept_invitation') {
      await loadSavedGame(saveId, { skipDiscardConfirm: true });
    } else {
      setStorageInfo(result.message || 'Einladung abgelehnt.');
      await refreshSavedGamesList(1);
    }
  } catch (error) { setStorageInfo(error.message || 'Einladung konnte nicht verarbeitet werden.', true); }
}
async function refreshSavedGamesList(page = 1) {
  if (!APP.isAuthenticated) return;
  savedGamesCurrentPage = page;
  const params = new URLSearchParams({ action: 'list', gameType: 'angeln', page: String(page), pageSize: '10', filterUpdatedAt: savedGamesFilters.updatedAt, filterSaveName: savedGamesFilters.saveName, filterParticipants: savedGamesFilters.participants });
  const data = await fetchStorageJson(`${STORAGE_API}?${params}`);
  const invitationParams = new URLSearchParams({ action: 'invitations', gameType: 'angeln' });
  const invitationData = await fetchStorageJson(`${STORAGE_API}?${invitationParams}`);
  savedGamesCache = [...(data.saves || []), ...(invitationData.invitations || []).map(invitation => ({ ...invitation, isInvitation: true }))];
  savedGamesTotalCount = (Number(data.totalCount) || 0) + (invitationData.invitations || []).length;
  renderSavedGames();
}
function refreshAfterSave() { if (!document.getElementById('savedGamesPanel').hidden) return refreshSavedGamesList(savedGamesCurrentPage); return Promise.resolve(); }
async function enableStorage() {
  if (!APP.isAuthenticated) return;
  setBusy(true);
  try { const data = await fetchStorageJson(STORAGE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', csrfToken: APP.csrfToken, gameType: 'angeln', saveName: 'Angeln', state: collectGameState() }) }); storageEnabled = true; activeSaveId = Number(data.save?.id) || null; activeSaveLabel = data.save?.saveName || 'Angeln'; activeSaveIsOwner = true; syncPersistedActiveSave(); setArchiveMode(false); updateStorageToggleButton(); upsertSave(data.save); await refreshAfterSave(); setStorageInfo(data.message || 'Speichern aktiviert.'); }
  catch (error) { setStorageInfo(error.message || 'Speichern konnte nicht aktiviert werden.', true); } finally { setBusy(false); }
}
function disableStorage() { storageEnabled = false; activeSaveId = null; activeSaveLabel = ''; activeSaveIsOwner = false; syncPersistedActiveSave(); setArchiveMode(false); updateStorageToggleButton(); setStorageInfo('Speichern deaktiviert. Änderungen bleiben lokal.'); }
async function toggleStorage() { if (storageEnabled && activeSaveId) disableStorage(); else await enableStorage(); }
async function loadSavedGame(saveId, options = {}) {
  if (!options.skipDiscardConfirm && !(storageEnabled && activeSaveId) && !confirmDiscardResults()) return false;
  const generation = activeSaveGeneration;
  const requestSerial = manualChangeSerial;
  setBusy(true);
  try { const data = await fetchStorageJson(`${STORAGE_API}?action=load&gameType=angeln&saveId=${encodeURIComponent(saveId)}`); if (!options.skipDiscardConfirm && requestSerial !== manualChangeSerial && !confirmDiscardResults()) return false; storageEnabled = true; activeSaveId = Number(data.save?.id) || Number(saveId); activeSaveLabel = data.save?.saveName || 'Angeln'; activeSaveIsOwner = data.save?.isOwner !== false; syncPersistedActiveSave(); loadGameState(data.save?.state || {}); setArchiveMode(Boolean(data.save?.isArchived)); updateStorageToggleButton(); upsertSave(data.save); setStorageInfo(data.save?.isArchived ? 'Archivierter Spielstand geladen (schreibgeschützt).' : `Spielstand geladen: ${activeSaveLabel}`); return true; }
  catch (error) { setStorageInfo(error.message || 'Speicherstand konnte nicht geladen werden.', true); return false; } finally { setBusy(false); }
}
async function copySavedGame(saveId) {
  if (!confirmDiscardResults() && !(storageEnabled && activeSaveId)) return;
  setBusy(true);
  try { const data = await fetchStorageJson(STORAGE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'copy', csrfToken: APP.csrfToken, gameType: 'angeln', saveId }) }); storageEnabled = true; activeSaveId = Number(data.save?.id); activeSaveLabel = data.save?.saveName || 'Angeln'; activeSaveIsOwner = true; syncPersistedActiveSave(); loadGameState(data.save?.state || {}); setArchiveMode(false); updateStorageToggleButton(); upsertSave(data.save); await refreshAfterSave(); setStorageInfo(`Kopie geladen: ${activeSaveLabel}`); }
  catch (error) { setStorageInfo(error.message, true); } finally { setBusy(false); }
}
async function renameSavedGame(saveId, saveName) { try { const data = await fetchStorageJson(STORAGE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rename', csrfToken: APP.csrfToken, gameType: 'angeln', saveId, saveName }) }); upsertSave(data.save); setStorageInfo(data.message); } catch (error) { setStorageInfo(error.message, true); renderSavedGames(); } }
async function toggleSaveArchive(saveId, archive) { try { const data = await fetchStorageJson(STORAGE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: archive ? 'archive' : 'reactivate', csrfToken: APP.csrfToken, gameType: 'angeln', saveId }) }); if (Number(activeSaveId) === Number(saveId)) setArchiveMode(Boolean(data.save?.isArchived)); upsertSave(data.save); setStorageInfo(data.message); } catch (error) { setStorageInfo(error.message, true); } }
async function deleteSavedGame(saveId) { if (!window.confirm('Diesen Speicherstand wirklich löschen?')) return; try { await fetchStorageJson(STORAGE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', csrfToken: APP.csrfToken, gameType: 'angeln', saveId }) }); if (Number(activeSaveId) === Number(saveId)) disableStorage(); removeSave(saveId); await refreshAfterSave(); setStorageInfo('Speicherstand gelöscht.'); } catch (error) { setStorageInfo(error.message, true); } }
function recordStateChange(event = {}) {
  if (isRestoringState || !APP.isAuthenticated || !storageEnabled || !activeSaveId || archivedMode) return;
  const saveId = Number(activeSaveId); const state = collectGameState(); const eventSnapshot = { eventType: event.eventType || 'state_update', source: event.source || 'ui', playerIndex: Number.isFinite(Number(event.playerIndex)) ? Number(event.playerIndex) : null, playerUserId: Number.isFinite(Number(event.playerUserId)) ? Number(event.playerUserId) : null, playerName: event.playerName || '', targetLabel: event.targetLabel || '', sectorResult: event.sectorResult || '', scoreDelta: Number(event.scoreDelta) || 0, scoreAfter: Number(event.scoreAfter) || 0, detectedAt: event.detectedAt || new Date().toISOString(), payload: event.payload || {} };
  const generation = activeSaveGeneration;
  const thisEventNo = event.eventNo || ++eventNumber;
  const request = { saveId, state, event: eventSnapshot, generation };
  eventQueue = eventQueue.catch(() => undefined).then(async () => {
    if (!storageEnabled || Number(activeSaveId) !== request.saveId || request.generation !== activeSaveGeneration) return;
    const data = await fetchStorageJson(STORAGE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', csrfToken: APP.csrfToken, gameType: 'angeln', saveId: request.saveId, state: request.state, event: request.event }) });
    eventNumber = Math.max(eventNumber, thisEventNo);
    activeSaveLabel = data.save?.saveName || activeSaveLabel; upsertSave(data.save); await refreshAfterSave(); setStorageInfo();
  }).catch(error => setStorageInfo(error.message || 'Automatisches Speichern fehlgeschlagen.', true));
}
function startNewGame() {
  if (!(storageEnabled && activeSaveId) && !confirmDiscardResults()) return;
  manualChangeSerial += 1;
  storageEnabled = false; activeSaveId = null; activeSaveLabel = ''; activeSaveIsOwner = false; syncPersistedActiveSave(); setArchiveMode(false); savedGamesCache = savedGamesCache.filter(save => save.isInvitation); loadGameState({ players: [] }); updateStorageToggleButton(); setStorageInfo('Neues Spiel gestartet.');
}
function updateAutoPlayerSwitchBtn() {
  const auto = document.getElementById('autoPlayerBtn'); const manual = document.getElementById('manualPlayerBtn'); if (!auto || !manual) return;
  const canSwitch = getPlayerIds().length > 1 && getOpenPlayerIds().length > 0 && !archivedMode;
  auto.style.display = autoPlayerSwitch ? 'none' : 'inline-block'; manual.style.display = autoPlayerSwitch ? 'inline-block' : 'none'; auto.disabled = !canSwitch; manual.disabled = !canSwitch;
}
function switchToNextPlayer() {
  const open = getOpenPlayerIds();
  if (!open.length) return;
  if (open.length === 1) {
    if (open[0] !== activePlayerIndex) setActivePlayer(open[0]);
    return;
  }
  const position = open.indexOf(activePlayerIndex);
  setActivePlayer(open[(position + 1 + open.length) % open.length]);
}
function setActivePlayer(index) { if (archivedMode || !players[index]) return; if (editingPlayerIndex !== null && players[editingPlayerIndex]) players[editingPlayerIndex].exitEditMode(); activePlayerIndex = index; manualChangeSerial += 1; updateAllActivateBtns(); updateUndoButtonVisibility(); recordStateChange({ eventType: 'player_activate', source: 'ui', playerIndex: index, playerName: players[index].name, scoreAfter: players[index].totalScore, payload: { playerIndex: index } }); }
function addPlayer() {
  if (archivedMode) return;
  const id = nextPlayerId++; const active = getActivePlayer(); const userId = Number(APP.userId);
  const name = active ? active.name : ((APP.displayName || APP.username || '').trim() || `Spieler ${id + 1}`);
  manualChangeSerial += 1;
  const player = new AngelnPlayer(name, id); player.portalUserId = active ? active.portalUserId : (Number.isFinite(userId) && userId > 0 ? userId : null); player.participantRole = active?.participantRole || (player.portalUserId ? 'owner' : 'guest'); player.invitationStatus = active?.invitationStatus || 'accepted'; player.invitedByUserId = active?.invitedByUserId ?? null;
  players[id] = player; document.getElementById('tablesContainer').appendChild(player.container); if (getPlayerIds().length === 1) activePlayerIndex = id;
  updateAllActivateBtns(); updateOverviewTable(); updateAutoPlayerSwitchBtn();
  if (!isRestoringState) recordStateChange({ eventType: 'player_add', source: 'ui', playerIndex: id, playerName: player.name, payload: { playerIndex: id, playerName: player.name } });
}
function deletePlayer(index) {
  if (archivedMode || !players[index]) return; const player = players[index]; player.container.remove(); delete players[index];
  if (editingPlayerIndex === index) editingPlayerIndex = null;
  manualChangeSerial += 1;
  const ids = getPlayerIds(); if (!ids.length) { nextPlayerId = Math.max(nextPlayerId, index + 1); addPlayer(); } else activePlayerIndex = ids[0];
  document.getElementById('editButton').style.display = 'inline-block'; document.getElementById('saveButton').style.display = 'none'; updateAllActivateBtns(); updateOverviewTable(); updateUndoButtonVisibility(); updateAutoPlayerSwitchBtn(); recordStateChange({ eventType: 'player_delete', source: 'ui', playerIndex: index, playerName: player.name, payload: { playerIndex: index, playerName: player.name } });
}
function makeThrow(type) {
  const player = getActivePlayer(); if (!player) return;
  const currentRoundDart = player.currentIndex % 3;
  const sector = currentRoundDart === 2 ? 'Bull' : '20';
  if (currentRoundDart === 2) {
    if (type === 'Triple') return;
    const bullSector = type === 'Single' ? '25' : 'Bull';
    player.processThrow(bullSector, null, createManualEventMeta('manual_button', { sector: bullSector, type }));
    return;
  }
  player.processThrow('20', type, createManualEventMeta('manual_button', { sector: '20', type }));
}

async function refreshInviteCandidates() {
  if (!storageEnabled || !activeSaveId) { setInviteInfo(); return; }
  const params = new URLSearchParams({ action: 'invite_candidates', gameType: 'angeln', saveId: String(activeSaveId) });
  try { const data = await fetchStorageJson(`${STORAGE_API}?${params}`); const body = document.getElementById('inviteFriendsBody'); body.replaceChildren();
    if (!(data.friends || []).length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 5; cell.textContent = 'Keine bestätigten Freunde verfügbar.'; }
    (data.friends || []).forEach(friend => { const row = body.insertRow(); [friend.id, friend.name, friend.lastLogin, friend.statusLabel].forEach(value => { const cell = row.insertCell(); cell.textContent = value || ''; }); const action = row.insertCell(); if (friend.actionEnabled) { const button = document.createElement('button'); button.type = 'button'; button.textContent = friend.actionLabel || 'Einladen'; button.onclick = () => void sendGameInvite(friend.id); action.appendChild(button); } else action.textContent = friend.actionLabel || 'Nicht verfügbar'; }); setInviteInfo();
  } catch (error) { setInviteInfo(error.message, true); }
}
async function sendGameInvite(targetUserId) { try { const data = await fetchStorageJson(STORAGE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'invite_friend', csrfToken: APP.csrfToken, gameType: 'angeln', saveId: activeSaveId, targetUserId }) }); setInviteInfo(data.message); await refreshInviteCandidates(); } catch (error) { setInviteInfo(error.message, true); } }

function bindControls() {
  document.getElementById('manualSubmit').onclick = () => { const input = document.getElementById('manualSector'); const value = input.value.trim(); const player = getActivePlayer(); if (value && player) { player.processThrow(value, null, createManualEventMeta('manual_input', { sector: value })); input.value = ''; input.focus(); } };
  document.getElementById('manualSector').addEventListener('keydown', event => { if (event.key === 'Enter') document.getElementById('manualSubmit').click(); });
  document.getElementById('btnMiss').onclick = () => getActivePlayer()?.processThrow('Miss', 'miss', createManualEventMeta('manual_button', { type: 'miss' }));
  document.getElementById('btnSingle').onclick = () => makeThrow('Single');
  document.getElementById('btnDouble').onclick = () => makeThrow('Double');
  document.getElementById('btnTriple').onclick = () => makeThrow('Triple');
  document.getElementById('addPlayerButton').onclick = addPlayer;
  document.getElementById('editButton').onclick = () => getActivePlayer()?.enterEditMode();
  document.getElementById('saveButton').onclick = () => getActivePlayer()?.exitEditMode();
  document.getElementById('undoButton').onclick = () => getActivePlayer()?.undoLastThrow();
  document.getElementById('autoPlayerBtn').onclick = () => { autoPlayerSwitch = true; updateAutoPlayerSwitchBtn(); recordStateChange({ eventType: 'auto_switch_enabled', payload: { autoPlayerSwitch: true } }); };
  document.getElementById('manualPlayerBtn').onclick = () => { autoPlayerSwitch = false; updateAutoPlayerSwitchBtn(); recordStateChange({ eventType: 'auto_switch_disabled', payload: { autoPlayerSwitch: false } }); };
}
function bindStorageControls() {
  document.getElementById('newGameBtn')?.addEventListener('click', startNewGame);
  document.getElementById('toggleStorageBtn')?.addEventListener('click', () => void toggleStorage());
  document.getElementById('loadGamesBtn')?.addEventListener('click', () => openSavedPanel(document.getElementById('savedGamesPanel').hidden));
  document.getElementById('toggleInvitePanelBtn')?.addEventListener('click', () => { const panel = document.getElementById('invitePanel'); panel.hidden = !panel.hidden; if (!panel.hidden) void refreshInviteCandidates(); });
  document.getElementById('refreshInviteCandidatesBtn')?.addEventListener('click', () => void refreshInviteCandidates());
  [['savedGamesFilterSaveName','saveName'],['savedGamesFilterUpdatedAt','updatedAt'],['savedGamesFilterParticipants','participants']].forEach(([id,key]) => document.getElementById(id)?.addEventListener('input', () => { savedGamesFilters[key] = document.getElementById(id).value.trim(); void refreshSavedGamesList(1).catch(error => setStorageInfo(error.message, true)); }));
  document.getElementById('clearSavedGamesFiltersBtn')?.addEventListener('click', () => { savedGamesFilters = { updatedAt:'', saveName:'', participants:'' }; ['savedGamesFilterSaveName','savedGamesFilterUpdatedAt','savedGamesFilterParticipants'].forEach(id => document.getElementById(id).value = ''); void refreshSavedGamesList(1); });
  document.getElementById('savedGamesPrevBtn')?.addEventListener('click', () => { if (savedGamesCurrentPage > 1) void refreshSavedGamesList(savedGamesCurrentPage - 1); });
  document.getElementById('savedGamesNextBtn')?.addEventListener('click', () => { if (savedGamesCurrentPage < Math.ceil(savedGamesTotalCount / 10)) void refreshSavedGamesList(savedGamesCurrentPage + 1); });
  document.getElementById('savedGamesBody')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-action="accept_invitation"],button[data-action="reject_invitation"]');
    if (!button) return;
    void respondToGameInvitation(Number(button.dataset.saveId), button.dataset.action);
  });
}
function handleMessage(msg) {
  if (archivedMode) return;
  if (msg?.type === 'TAKEOUT_FINISHED' && autoPlayerSwitch) {
    switchToNextPlayer();
    return;
  }
  if (msg?.type !== 'THROW_DETECTED') return;
  const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
  const miss = payload.bounceout || !payload.sector || String(payload.sector).toLowerCase() === 'none';
  getActivePlayer()?.processThrow(miss ? 'Miss' : payload.sector, miss ? 'miss' : null, { eventType: 'throw_detected', source: 'scolia_ws', detectedAt: payload.detectionTime || new Date().toISOString(), payload });
}
function initApp() {
  if (window.__angelnInitialized) return; window.__angelnInitialized = true;
  ensureControlsFooter(); bindControls(); bindStorageControls();
  const config = window.SCOLIA_CONFIG || {};
  if (config.serialNumber && config.accessToken && document.getElementById('status')) {
    try { const ws = new WebSocket(`wss://game.scoliadarts.com/api/v1/social?serialNumber=${encodeURIComponent(config.serialNumber)}&accessToken=${encodeURIComponent(config.accessToken)}`); ws.onopen = () => document.getElementById('status').textContent = 'Board-Status: Ready'; ws.onclose = () => document.getElementById('status').textContent = 'Board-Status: Offline'; ws.onerror = () => document.getElementById('status').textContent = 'Board-Status: Fehler'; ws.onmessage = ({ data }) => { try { handleMessage(JSON.parse(data)); } catch (error) { console.error('Ungültige Scolia-Nachricht', error); } }; } catch { document.getElementById('status').textContent = 'Board-Status: Fehler'; }
  } else if (document.getElementById('status')) document.getElementById('status').textContent = 'Board-Status: Nicht verbunden';
  addPlayer(); updateOverviewTable(); updateAutoPlayerSwitchBtn(); updateUndoButtonVisibility(); updateStorageToggleButton(); setStorageInfo();
  if (APP.isAuthenticated) { void refreshSavedGamesList(1).catch(error => setStorageInfo(error.message, true)); const saveId = getPersistedActiveSaveId(); if (saveId) void loadSavedGame(saveId, { skipDiscardConfirm: true }); }
}
window.initApp = initApp;
