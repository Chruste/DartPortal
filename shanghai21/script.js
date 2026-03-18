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

  processThrow(sec, type = null) {
    const sector = sec.toString().toUpperCase();
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
    if ((hit === '25' || hit === '50') && this.sequence[this.currentIndex] === 'Bull'
      || hit.replace(/^D |^T /, '') === this.sequence[this.currentIndex]) {
      pts = base === 'Bull' ? mult * 25 : mult * parseInt(base, 10);
    }
    this.totalScore += pts;
    const row = this.tbody.children[this.currentIndex];
    row.cells[1].textContent = pts;
    row.cells[2].textContent = hit;
    if (pts > 0) row.classList.add('hit');
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
    let pts = 0;
    if (isBull && hitBase === 'Bull') {
      pts = hitMult * 25;
    } else if (!isBull && hitBase === target) {
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
  wrapper.appendChild(title);
  wrapper.appendChild(table);

  tablesContainer.insertAdjacentElement('afterend', wrapper);
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
}

function getPlayerIds() {
  return Object.keys(players).map(Number).sort((first, second) => first - second);
}

function getActivePlayer() {
  return players[activePlayerIndex] || null;
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

  // Ersten Spieler hinzufügen
  addPlayer();
  updateOverviewTable();

  // 3) Event-Listener
  document.getElementById('addPlayerButton').onclick = addPlayer;
  document.getElementById('editButton').onclick = () => {
    const player = getActivePlayer();
    if (player) player.enterEditMode();
  };
  document.getElementById('saveButton').onclick = () => {
    const player = getActivePlayer();
    if (player) player.exitEditMode();
  };
  document.getElementById('undoButton').onclick = () => {
    const player = getActivePlayer();
    if (player) player.undoLastThrow();
  };
  document.getElementById('autoPlayerBtn').onclick = () => {
    autoPlayerSwitch = true;
    updateAutoPlayerSwitchBtn();
  };
  document.getElementById('manualPlayerBtn').onclick = () => {
    autoPlayerSwitch = false;
    updateAutoPlayerSwitchBtn();
  };

  // Manueller Input
  document.getElementById('manualSubmit').onclick = () => {
    const val = document.getElementById('manualSector').value.trim();
    const player = getActivePlayer();
    if (val && player) player.processThrow(val);
  };
  document.getElementById('manualSector').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('manualSubmit').click();
  });
  document.getElementById('btnMiss').onclick = () => {
    const player = getActivePlayer();
    if (player) player.processThrow('None', 'miss');
  };
  document.getElementById('btnSingle').onclick = () => {
    const player = getActivePlayer();
    if (player) player.processThrow(player.sequence[player.currentIndex], 'Single');
  };
  document.getElementById('btnDouble').onclick = () => {
    const player = getActivePlayer();
    if (player) player.processThrow(player.sequence[player.currentIndex], 'Double');
  };
  document.getElementById('btnTriple').onclick = () => {
    const player = getActivePlayer();
    if (player) player.processThrow(player.sequence[player.currentIndex], 'Triple');
  };
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