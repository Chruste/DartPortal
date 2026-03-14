// "Shanghai 21" v2.0 Scolia Dartspiel

class Player {
  constructor(name, index) {
    this.name = name;
    this.index = index;
    this.currentIndex = 0;
    this.totalScore = 0;
    this.sequence = Array.from({ length: 20 }, (_, i) => (i + 1).toString()).concat('Bull');
    this.table = this.createTable();
    this.activateBtn = this.createActivateBtn();
    this.container = document.createElement('div');
    this.container.appendChild(this.activateBtn);
    this.container.appendChild(this.table);
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

  updateActivateBtn() {
    this.activateBtn.disabled = activePlayerIndex === this.index;
  }

  highlightRow(i) {
    this.table.querySelectorAll('tr').forEach(r => r.classList.remove('current-row'));
    const rows = Array.from(this.tbody.children).concat(this.table.querySelector('tfoot tr'));
    if (rows[i]) rows[i].classList.add('current-row');
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
      if (this.currentIndex === 0) {
        document.getElementById('undoButton').style.display = 'none';
      }
    }
  }

  enterEditMode() {
    document.getElementById('editButton').style.display = 'none';
    document.getElementById('saveButton').style.display = 'inline';
    editingPlayerIndex = this.index;
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
    if (this.currentIndex > 0) {
      document.getElementById('undoButton').style.display = 'inline';
    } else {
      document.getElementById('undoButton').style.display = 'none';
    }
  }
}

// Globale Variablen
let players = [];
let activePlayerIndex = 0;
let editingPlayerIndex = null;
const tablesContainer = document.getElementById('tablesContainer');

// 1) Init-Funktion nach Login (v2.0)
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

  // 3) Event-Listener
  document.getElementById('addPlayerButton').onclick = addPlayer;
  document.getElementById('editButton').onclick = () => players[activePlayerIndex].enterEditMode();
  document.getElementById('saveButton').onclick = () => players[activePlayerIndex].exitEditMode();
  document.getElementById('undoButton').onclick = () => players[activePlayerIndex].undoLastThrow();

  // Manueller Input
  document.getElementById('manualSubmit').onclick = () => {
    const val = document.getElementById('manualSector').value.trim();
    if (val) players[activePlayerIndex].processThrow(val);
  };
  document.getElementById('manualSector').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('manualSubmit').click();
  });
  document.getElementById('btnMiss').onclick = () => players[activePlayerIndex].processThrow('None', 'miss');
  document.getElementById('btnSingle').onclick = () => players[activePlayerIndex].processThrow(players[activePlayerIndex].sequence[players[activePlayerIndex].currentIndex], 'Single');
  document.getElementById('btnDouble').onclick = () => players[activePlayerIndex].processThrow(players[activePlayerIndex].sequence[players[activePlayerIndex].currentIndex], 'Double');
  document.getElementById('btnTriple').onclick = () => players[activePlayerIndex].processThrow(players[activePlayerIndex].sequence[players[activePlayerIndex].currentIndex], 'Triple');
}

function addPlayer() {
  const playerIndex = players.length;
  const player = new Player(`Spieler ${playerIndex + 1}`, playerIndex);
  players.push(player);
  tablesContainer.appendChild(player.container);
  updateAllActivateBtns();
}

function setActivePlayer(index) {
  if (editingPlayerIndex !== null && editingPlayerIndex !== index) {
    players[editingPlayerIndex].exitEditMode();
  }
  activePlayerIndex = index;
  updateAllActivateBtns();
  // Update Triple Button für aktiven Spieler
  players[activePlayerIndex].updateTripleButton();
}

function updateAllActivateBtns() {
  players.forEach(p => p.updateActivateBtn());
}

function handleMessage(msg) {
  console.debug('WS message:', msg);
  if (msg.type === 'THROW_DETECTED') {
    const sector = (msg.payload.sector || '').toString().toLowerCase();
    const bounceout = Boolean(msg.payload.bounceout);
    const miss = bounceout || sector === 'none';
    console.debug('THROW_DETECTED', { sector, bounceout, miss, payload: msg.payload });
    players[activePlayerIndex].processThrow(miss ? 'None' : msg.payload.sector, miss ? 'miss' : null);
  }
}