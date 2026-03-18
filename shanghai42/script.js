// "Shanghai 42" v3.1 Scolia Dartspiel

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
    if (i < this.sequence.length) {
      const rows = Array.from(this.tbody.children);
      if (rows[i]) rows[i].classList.add('current-row');
    }
  }

  updateTripleButton() {
    const btn = document.getElementById('btnTriple');
    if (!btn) return;
    btn.style.display = this.sequence[this.currentIndex] === 'Bull' ? 'none' : 'inline';
  }

  parseHit(sector, type = null) {
    const raw = sector.toString().toUpperCase();
    const mult = type === 'miss' ? 0
      : type === 'Double' ? 2
      : type === 'Triple' ? 3
      : type === 'Single' ? 1
      : raw.startsWith('D') ? 2
      : raw.startsWith('T') ? 3
      : raw === 'BULL' ? 2  // Double Bull
      : 1;
    const base = raw === '25' ? 'Bull'  // Single Bull
      : raw === 'BULL' ? 'Bull'  // Double Bull
      : (raw.match(/(20|1[0-9]|[1-9])/) || [''])[0];

    if (mult === 0) {
      return { hit: '0', value: 0, base: '', mult: 0 };
    }

    let hit = '';
    if (base === 'Bull') {
      hit = mult === 2 ? '50' : '25';
    } else {
      hit = mult === 2 ? `D ${base}`
        : mult === 3 ? `T ${base}`
        : base;
    }

    const value = base === 'Bull' ? (mult === 2 ? 50 : 25) : mult * parseInt(base, 10);
    return { hit, value, base, mult };
  }

  processThrow(sec, type = null) {
    const { hit, value } = this.parseHit(sec, type);
    const target = this.sequence[this.currentIndex];

    // Scoring rule: only doubles of the current target score give positive points.
    // Any other hit (including singles/triples of the target or any other number) gives -1.
    // Misses (bounce out / None) are 0 points.
    let pts = 0;
    if (value > 0) {
      const correctDouble = (target === 'Bull' && hit === '50') || (hit === `D ${target}`);
      pts = correctDouble ? value : -1;
    }

    this.totalScore += pts;
    const row = this.tbody.children[this.currentIndex];
    row.cells[1].textContent = pts;
    row.cells[2].textContent = hit;
    row.classList.toggle('hit', pts > 0);
    row.classList.toggle('miss', pts < 0);
    this.sumCell.textContent = this.totalScore;
    this.currentIndex++;
    this.highlightRow(this.currentIndex);
    this.updateTripleButton();
    updateOverviewTable();
    if (this.currentIndex > 0) {
      document.getElementById('undoButton').style.display = 'inline';
    }
  }

  calculatePoints(hit, target) {
    if (hit === '0' || hit === '') return 0;
    const isBull = target === 'Bull';
    const hitBase = hit.replace(/^D |^T /, '');
    const hitMult = hit.startsWith('D ') ? 2 : hit.startsWith('T ') ? 3 : 1;
    if ((isBull && hitBase === 'Bull' && hitMult === 2) || (!isBull && hitBase === target && hitMult === 2)) {
      return isBull ? 50 : 2 * parseInt(target, 10);
    }
    return -1;
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
      if (this.currentIndex === 0) {
        document.getElementById('undoButton').style.display = 'none';
      }
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
      else if (pts < 0) rows[i].classList.add('miss');
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
    if (this.currentIndex > 0) {
      document.getElementById('undoButton').style.display = 'inline';
    } else {
      document.getElementById('undoButton').style.display = 'none';
    }
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

function syncOverviewFooterHeight() {
  const appContainer = document.getElementById('appContainer');
  const wrapper = document.getElementById('playerOverviewWrapper');
  const controlsWrapper = document.getElementById('controlsFooterWrapper');
  if (!appContainer || !wrapper) return;

  const overviewHeight = Math.ceil(wrapper.getBoundingClientRect().height);
  const controlsHeight = controlsWrapper ? Math.ceil(controlsWrapper.getBoundingClientRect().height) : 0;
  const totalFooterHeight = overviewHeight + controlsHeight;
  
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
  
  syncOverviewFooterHeight();
  syncControlsFooterHeight();
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
  
  syncControlsFooterHeight();
  syncOverviewFooterHeight();
}

function syncControlsFooterHeight() {
  const appContainer = document.getElementById('appContainer');
  const wrapper = document.getElementById('controlsFooterWrapper');
  const overviewWrapper = document.getElementById('playerOverviewWrapper');
  if (!appContainer || !wrapper) return;

  const controlsHeight = Math.ceil(wrapper.getBoundingClientRect().height);
  const overviewHeight = overviewWrapper ? Math.ceil(overviewWrapper.getBoundingClientRect().height) : 0;
  const totalFooterHeight = controlsHeight + overviewHeight;
  
  appContainer.style.paddingBottom = `${totalFooterHeight + 16}px`;
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
    window.addEventListener('resize', syncOverviewFooterHeight);
    overviewResizeHandlerRegistered = true;
  }

  syncOverviewFooterHeight();
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

  syncOverviewFooterHeight();
}

function getPlayerIds() {
  return Object.keys(players).map(Number).sort((first, second) => first - second);
}

function getActivePlayer() {
  return players[activePlayerIndex] || null;
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
  
  if (!overviewResizeHandlerRegistered) {
    window.addEventListener('resize', () => {
      syncControlsFooterHeight();
      syncOverviewFooterHeight();
    });
    overviewResizeHandlerRegistered = true;
  }
  
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
      if (val && player) player.processThrow(val);
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
      if (player) player.processThrow('None', 'miss');
    };
  }
  if (btnSingle) {
    btnSingle.onclick = () => {
      const player = getActivePlayer();
      if (player) player.processThrow(player.sequence[player.currentIndex], 'Single');
    };
  }
  if (btnDouble) {
    btnDouble.onclick = () => {
      const player = getActivePlayer();
      if (player) player.processThrow(player.sequence[player.currentIndex], 'Double');
    };
  }
  if (btnTriple) {
    btnTriple.onclick = () => {
      const player = getActivePlayer();
      if (player) player.processThrow(player.sequence[player.currentIndex], 'Triple');
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
    };
  }
  if (manualBtn) {
    manualBtn.onclick = () => {
      autoPlayerSwitch = false;
      updateAutoPlayerSwitchBtn();
    };
  }
}

// 1) Init-Funktion nach Login (v3.1)
function initApp() {
  // Anmeldedaten aus config (bzw. localStorage) übernehmen
  const { serialNumber, accessToken } = window.SCOLIA_CONFIG;

  // 2) WebSocket-Verbindung initialisieren
  const statusEl = document.getElementById('status');
  let ws = new WebSocket(
    `wss://game.scoliadarts.com/api/v1/social?serialNumber=${serialNumber}&accessToken=${accessToken}`
  );
  ws.onopen = () => statusEl.textContent = 'Board-Status: Ready';
  ws.onclose = () => statusEl.textContent = 'Board-Status: Offline';
  ws.onerror = () => statusEl.textContent = 'Board-Status: Fehler';
  ws.onmessage = ({ data }) => handleMessage(JSON.parse(data));

  // Erstelle Controls Footer
  ensureControlsFooter();
  addPlayer();
  updateOverviewTable();
}

function addPlayer() {
  const playerIndex = nextPlayerId++;
  const player = new Player(`Spieler ${playerIndex + 1}`, playerIndex);
  players[playerIndex] = player;
  tablesContainer.appendChild(player.container);
  if (getPlayerIds().length === 1) {
    activePlayerIndex = playerIndex;
  }
  updateAllActivateBtns();
  updateAutoPlayerSwitchBtn();
  updateOverviewTable();
}

function deletePlayer(index) {
  const player = players[index];
  if (!player) return;

  if (editingPlayerIndex === player.index) {
    editingPlayerIndex = null;
  }

  player.container.remove();
  delete players[player.index];

  document.getElementById('editButton').style.display = 'inline';
  document.getElementById('saveButton').style.display = 'none';

  const remainingIds = getPlayerIds();
  if (remainingIds.length === 0) {
    addPlayer();
    return;
  }

  activePlayerIndex = remainingIds[0];
  updateAllActivateBtns();
  updateAutoPlayerSwitchBtn();
  updateOverviewTable();
  const activePlayer = getActivePlayer();
  if (activePlayer) activePlayer.updateTripleButton();
  const undoBtn = document.getElementById('undoButton');
  undoBtn.style.display = activePlayer && activePlayer.currentIndex > 0 ? 'inline' : 'none';
}

function setActivePlayer(index) {
  if (!players[index]) return;
  if (editingPlayerIndex !== null && editingPlayerIndex !== index && players[editingPlayerIndex]) {
    players[editingPlayerIndex].exitEditMode();
  }
  activePlayerIndex = index;
  updateAllActivateBtns();
  // Update Triple Button für aktiven Spieler
  const activePlayer = getActivePlayer();
  if (activePlayer) {
    activePlayer.updateTripleButton();
  }
  // Update Undo Button basierend auf neuem aktiven Spieler
  const undoBtn = document.getElementById('undoButton');
  undoBtn.style.display = activePlayer && activePlayer.currentIndex > 0 ? 'inline' : 'none';
}

function updateAllActivateBtns() {
  getPlayerIds().forEach(id => players[id].updateActivateBtn());
}

function switchToNextPlayer() {
  const ids = getPlayerIds();
  if (ids.length <= 1) return;
  const currentPos = ids.indexOf(activePlayerIndex);
  const nextPos = (currentPos + 1) % ids.length;
  setActivePlayer(ids[nextPos]);
}

function updateAutoPlayerSwitchBtn() {
  const count = getPlayerIds().length;
  const autoBtn = document.getElementById('autoPlayerBtn');
  const manualBtn = document.getElementById('manualPlayerBtn');
  if (count <= 1) {
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
    const sector = (msg.payload.sector || '').toString().toLowerCase();
    const bounceout = Boolean(msg.payload.bounceout);
    const miss = bounceout || sector === 'none';
    console.debug('THROW_DETECTED', { sector, bounceout, miss, payload: msg.payload });
    const player = getActivePlayer();
    if (player) {
      player.processThrow(miss ? 'None' : msg.payload.sector, miss ? 'miss' : null);
    }
  }
  if (msg.type === 'TAKEOUT_FINISHED' && autoPlayerSwitch) {
    switchToNextPlayer();
  }
}
