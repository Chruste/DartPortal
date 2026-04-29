// "Klassisches 501 Darts" v1.0

const storageApiUrl = '/cloud-storage.php';
const gameType = 'darts501';

// PDC Checkout Table (ausgewählte Einträge)
const pdcCheckouts = {
  2: ['D1'],
  3: ['1 D1'],
  4: ['D2'],
  5: ['1 D2', '3 D1'],
  6: ['D3'],
  7: ['3 D2', '5 D1'],
  8: ['D4'],
  9: ['1 D4', '5 D2', '7 D1'],
  10: ['D5'],
  11: ['3 D4', '7 D2', '9 D1'],
  12: ['D6'],
  13: ['5 D4', '9 D2', '11 D1'],
  14: ['D7'],
  15: ['7 D4', '11 D2', '13 D1'],
  16: ['D8'],
  17: ['1 D8', '9 D4', '13 D2', '15 D1'],
  18: ['D9'],
  19: ['3 D8', '11 D4', '15 D2', '17 D1'],
  20: ['D10'],
  21: ['5 D8', '13 D4', '17 D2', '19 D1'],
  22: ['D11'],
  23: ['7 D8', '15 D4', '19 D2'],
  24: ['D12'],
  25: ['1 D12', '9 D8', '17 D4'],
  26: ['D13'],
  27: ['3 D12', '11 D8', '19 D4'],
  28: ['D14'],
  29: ['5 D12', '13 D8'],
  30: ['D15'],
  31: ['7 D12', '15 D8'],
  32: ['D16'],
  33: ['1 D16', '9 D12', '17 D8'],
  34: ['D17'],
  35: ['3 D16', '11 D12', '19 D8'],
  36: ['D18'],
  37: ['5 D16', '13 D12'],
  38: ['D19'],
  39: ['7 D16', '15 D12'],
  40: ['D20'],
  41: ['1 D20', '9 D16'],
  42: ['10 D16', '2 D20'],
  43: ['3 D20', '11 D16'],
  44: ['4 D20'],
  45: ['5 D20', '13 D16'],
  46: ['6 D20'],
  47: ['7 D20', '15 D16'],
  48: ['16 D16'],
  49: ['9 D20', '17 D16'],
  50: ['Bull', '10 D20', '18 D16'],
  51: ['11 D20', '19 D16'],
  52: ['12 D20', '20 D16'],  
  53: ['13 D20'],
  54: ['14 D20'],
  55: ['15 D20'],
  56: ['16 D20'],
  57: ['17 D20'],
  58: ['18 D20'],
  59: ['19 D20'],
  60: ['20 D20'],
  61: ['T15 D8'],
  62: ['T10 D16'],
  63: ['T13 D12'],
  64: ['T16 D8'],
  65: ['T19 D4'],
  66: ['T10 D18', 'T20 D3', 'T14 D12'],
  67: ['T17 D8'],
  68: ['T20 D4'],
  69: ['T19 D6'],
  70: ['T18 D8'],
  71: ['T13 D16'],
  72: ['T20 D6', 'T16 D12'],
  73: ['T19 D8'],
  74: ['T14 D16'],
  75: ['T17 D12'],
  76: ['T20 D8'],
  77: ['T19 D10'],
  78: ['T18 D12'],
  79: ['T19 D11', 'T13 D20'],
  80: ['T20 D10', 'T16 D16'],
  81: ['T19 D12'],
  82: ['T14 D20', 'Bull D16'],
  83: ['T17 D16', 'T19 D13'],
  84: ['T20 D12', 'T16 D18'],
  85: ['T15 D20', 'T19 D14'],
  86: ['T18 D16', 'T20 D13'],
  87: ['T17 D18'],
  88: ['T20 D14', 'T16 D20'],
  89: ['T19 D16'],
  90: ['T20 D15', 'T18 D18'],
  91: ['T17 D20'],
  92: ['T20 D16'],
  93: ['T19 D18'],
  94: ['T18 D20'],
  95: ['T19 D19'],
  96: ['T20 D18'],
  97: ['T19 D20'],
  98: ['T20 D19'],
  99: ['T19 10 D16'],
  100: ['T20 D20'],
  101: ['T20 9 D16'],
  102: ['T20 10 D16', 'T16 14 D20'],
  103: ['T19 6 D20'],
  104: ['T16 16 D20'],
  105: ['T20 13 D16'],
  106: ['T20 6 D20'],
  107: ['T19 10 D20'],
  108: ['T20 16 D16'],
  109: ['T20 17 D16'],
  110: ['T20 10 D20'],
  111: ['T19 14 D20',],
  112: ['T20 20 D16'],
  113: ['T19 16 D20',],
  114: ['T20 14 D20'],
  115: ['T20 15 D20'],
  116: ['T20 16 D20','T19 19 D20'],
  117: ['T20 17 D20'],
  118: ['T20 18 D20'],
  119: ['T19 12 Bull'],
  120: ['T20 20 D20'],
  121: ['T20 11 Bull'],
  122: ['T18 18 Bull'],
  123: ['T19 16 Bull'],
  124: ['T20 14 Bull'],
  125: ['25 T20 D20'],
  126: ['T19 19 Bull'],
  127: ['T20 17 Bull'],
  128: ['T20 18 Bull'],
  129: ['19 T20 Bull', 'T20 T13 D15'],
  130: ['T20 20 Bull'],
  131: ['T20 T13 D16'],
  132: ['25 T19 Bull'],
  133: ['T20 T19 D8'],
  134: ['T20 T14 D16', 'T17 T17 D16'],
  135: ['25 T20 Bull'],
  136: ['T20 T20 D8'],
  137: ['T20 T19 D10'],
  138: ['T20 T18 D12', 'T19 T19 D12'],
  139: ['T19 T14 D20'],
  140: ['T20 T20 D10'],
  141: ['T20 T19 D12'],
  142: ['T20 T14 D20'],
  143: ['T20 T17 D16'],
  144: ['T20 T20 D12'],
  145: ['T20 T15 D20'],
  146: ['T20 T18 D16'],
  147: ['T20 T17 D18'],
  148: ['T20 T20 D14'],
  149: ['T20 T19 D16'],
  150: ['T20 T20 D15', 'T20 T18 D18'],
  151: ['T20 T17 D20'],
  152: ['T20 T20 D16'],
  153: ['T20 T19 D18'],
  154: ['T20 T18 D20'],
  155: ['T20 T19 D19'],
  156: ['T20 T20 D18'],
  157: ['T20 T19 D20'],
  158: ['T20 T20 D19'],
  160: ['T20 T20 D20'],
  161: ['T20 T17 Bull'],
  164: ['T20 T18 Bull'],
  167: ['T20 T19 Bull'],
  170: ['T20 T20 Bull']
};

let players = [];
let activePlayerIndex = 0;
let gameState = {
  players: [],
  currentPlayer: 0,
  throws: []
};
let storageEnabled = false;
let currentSessionId = null;
let csrfToken = '';
let scolia_ws = null;
let archivedMode = false;

class Player {
  constructor(name, index, remainingScore = 501) {
    this.name = name;
    this.index = index;
    this.remainingScore = remainingScore;
    this.currentRound = [];
    this.rounds = [];
    this.element = this.createElement();
  }

  createElement() {
    const div = document.createElement('div');
    div.className = 'player-card';
    div.id = `player${this.index}`;
    div.innerHTML = `
      <h3>${this.name}</h3>
      <div class="score">Verbleibend: <span class="remaining-score">${this.remainingScore}</span></div>
      <div class="checkout-suggestions"></div>
      <div class="throws">
        <table>
          <thead>
            <tr><th>Runde</th><th>1</th><th>2</th><th>3</th></tr>
          </thead>
          <tbody id="throwsBody${this.index}">
          </tbody>
        </table>
      </div>
    `;
    return div;
  }

  updateDisplay() {
    const remainingSpan = this.element.querySelector('.remaining-score');
    remainingSpan.textContent = this.remainingScore;
    this.element.classList.toggle('active', activePlayerIndex === this.index);
    this.updateThrowsDisplay();
    this.updateCheckoutSuggestions();
  }

  addThrow(sector, points) {
    this.currentRound.push({ sector, points });
    if (this.currentRound.length === 3) {
      // Runde speichern mit busted-Flag (wird ggf. später gesetzt)
      this.rounds.unshift({ throws: [...this.currentRound], busted: false });
      this.currentRound = [];
    }
    this.updateThrowsDisplay();
  }

  markCurrentRoundAsBusted() {
    // Markiere die aktuelle unvollständige Runde (wird separat behandelt)
    if (this.currentRound.length > 0) {
      this.rounds.unshift({ throws: [...this.currentRound], busted: true });
      this.currentRound = [];
    }
  }

  updateCheckoutSuggestions() {
    const suggestionsDiv = this.element.querySelector('.checkout-suggestions');
    const dartsLeft = 3 - this.currentRound.length;
    if (this.remainingScore <= 170 && this.remainingScore > 1 && dartsLeft >= 1) {
      const suggestions = this.getCheckoutSuggestions(this.remainingScore, dartsLeft);
      if (suggestions.length > 0) {
        suggestionsDiv.textContent = 'Checkout: ' + suggestions.join(' oder ');
        suggestionsDiv.style.display = 'block';
      } else {
        suggestionsDiv.textContent = '';
        suggestionsDiv.style.display = 'none';
      }
    } else {
      suggestionsDiv.textContent = '';
      suggestionsDiv.style.display = 'none';
    }
  }

  getCheckoutSuggestions(score, dartsLeft) {
    const checkouts = pdcCheckouts[score];
    if (!checkouts) return [];
    // Filtere nach der Anzahl der Darts (Leerzeichen trennen die Würfe)
    return checkouts.filter(c => c.split(' ').length <= dartsLeft);
  }

  updateThrowsDisplay() {
    const tbody = this.element.querySelector(`#throwsBody${this.index}`);
    tbody.innerHTML = '';

    // Aktuelle Runde anzeigen (oben)
    if (this.currentRound.length > 0) {
      const tr = document.createElement('tr');
      const roundNum = this.rounds.length + 1;
      const tdRound = document.createElement('td');
      tdRound.textContent = roundNum;
      tr.appendChild(tdRound);
      for (let i = 0; i < 3; i++) {
        const td = document.createElement('td');
        if (i < this.currentRound.length) {
          td.textContent = `${this.currentRound[i].sector}`;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    // Abgeschlossene Runden in umgekehrter Reihenfolge (neueste zuerst)
    for (let i = 0; i < this.rounds.length; i++) {
      const roundObj = this.rounds[i];
      const round = roundObj.throws || roundObj; // Kompatibilität mit alten Daten
      const isBusted = roundObj.busted || false;
      
      const tr = document.createElement('tr');
      if (isBusted) {
        tr.classList.add('busted');
      }
      
      const roundNum = this.rounds.length - i;
      const tdRound = document.createElement('td');
      tdRound.textContent = roundNum;
      tr.appendChild(tdRound);
      
      round.forEach(throwData => {
        const td = document.createElement('td');
        td.textContent = `${throwData.sector}`;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  }
}

function initGame() {
  players = [];
  activePlayerIndex = 0;
  document.getElementById('playersContainer').innerHTML = '';
  addPlayer('Spieler 1');
  updateUI();
}

function addPlayer(name) {
  const index = players.length;
  const player = new Player(name, index);
  players.push(player);
  document.getElementById('playersContainer').appendChild(player.element);
}

function setActivePlayer(index) {
  activePlayerIndex = index;
  players.forEach(p => p.updateDisplay());
}

function nextPlayer() {
  activePlayerIndex = (activePlayerIndex + 1) % players.length;
  players.forEach(p => p.updateDisplay());
}

function parseThrow(input) {
  const trimmed = input.trim().toUpperCase();
  if (trimmed === 'MISS' || trimmed === '0') {
    return { sector: 'Miss', points: 0 };
  }

  const match = trimmed.match(/^([SDT]?)(\d+|BULL)$/);
  if (!match) return null;

  const multiplier = match[1];
  const target = match[2];

  let basePoints = 0;
  if (target === 'BULL') {
    basePoints = 25;
  } else {
    basePoints = parseInt(target);
    if (basePoints < 1 || basePoints > 20) return null;
  }

  let points = basePoints;
  if (multiplier === 'D') points *= 2;
  else if (multiplier === 'T') points *= 3;

  const sector = multiplier ? `${multiplier}${target}` : target.toString();
  return { sector, points };
}

function submitThrow() {
  const input = document.getElementById('throwSector').value;
  const throwData = parseThrow(input);
  if (!throwData) {
    alert('Ungültiger Wurf. Beispiele: 20, D20, T20, BULL, Miss');
    return;
  }

  const player = players[activePlayerIndex];
  const newScore = player.remainingScore - throwData.points;
  const isThirdThrow = player.currentRound.length === 2;

  // Spezielle Regel für den 3. Wurf: Muss auf 0 oder 2 enden
  if (isThirdThrow) {
    if (newScore !== 0 && newScore !== 2) {
      alert('3. Wurf ungültig! Mit dem 3. Wurf musst du auf 0 oder 2 Punkte kommen.');
      // Runde als busted markieren und speichern
      player.currentRound.push({ sector: throwData.sector, points: throwData.points });
      player.markCurrentRoundAsBusted();
      // Punkte zurücksetzen
      player.updateDisplay();
      document.getElementById('throwSector').value = '';
      nextPlayer();
      return;
    }
    if (newScore === 0 && !(throwData.sector.startsWith('D') || throwData.sector === 'BULL')) {
      alert('Letzter Wurf muss Double oder Bull sein!');
      return;
    }
  } else {
    // Für 1. und 2. Wurf: Normale Regeln
    if (newScore === 1) {
      alert('Auf 1 kann nicht beendet werden!');
      return;
    }

    if (newScore < 0) {
      alert('Überworfen! Bleib unter der Punktzahl.');
      // Runde als busted markieren und speichern
      player.currentRound.push({ sector: throwData.sector, points: throwData.points });
      player.markCurrentRoundAsBusted();
      // Punkte zurücksetzen
      player.updateDisplay();
      document.getElementById('throwSector').value = '';
      nextPlayer();
      return;
    }
  }

  player.remainingScore = newScore;
  player.addThrow(throwData.sector, throwData.points);
  player.updateDisplay();

  document.getElementById('throwSector').value = '';

  // Nach 3. Wurf zum nächsten Spieler
  if (isThirdThrow) {
    if (newScore === 0) {
      alert(`${player.name} hat gewonnen!`);
      // Spiel beenden
    }
    nextPlayer();
  }
}

function quickThrow(multiplier) {
  const input = document.getElementById('throwSector');
  const current = input.value.trim();
  if (current === '') {
    input.value = multiplier === 'S' ? '' : multiplier;
  } else {
    input.value = multiplier + current;
  }
  input.focus();
}

function undoLastThrow() {
  // Implementierung für Rückgängig
  alert('Rückgängig noch nicht implementiert');
}

function updateUI() {
  players.forEach(p => p.updateDisplay());
}

function initApp() {
  initGame();
  setupEventListeners();
  initScoliaWebSocket();
}

function setupEventListeners() {
  document.getElementById('submitThrowBtn').addEventListener('click', submitThrow);
  document.getElementById('throwSector').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitThrow();
  });

  document.getElementById('btnMiss').addEventListener('click', () => {
    document.getElementById('throwSector').value = 'Miss';
    submitThrow();
  });
  document.getElementById('btnSingle').addEventListener('click', () => quickThrow('S'));
  document.getElementById('btnDouble').addEventListener('click', () => quickThrow('D'));
  document.getElementById('btnTriple').addEventListener('click', () => quickThrow('T'));

  document.getElementById('nextPlayerBtn').addEventListener('click', nextPlayer);
  document.getElementById('undoBtn').addEventListener('click', undoLastThrow);
  document.getElementById('newGameBtn').addEventListener('click', initGame);
}

function initScoliaWebSocket() {
  const statusEl = document.getElementById('status');
  const { serialNumber, accessToken } = window.SCOLIA_CONFIG || {};

  if (statusEl && serialNumber && accessToken) {
    try {
      scolia_ws = new WebSocket(
        `wss://game.scoliadarts.com/api/v1/social?serialNumber=${serialNumber}&accessToken=${accessToken}`
      );
      scolia_ws.onopen = () => {
        statusEl.textContent = 'Board-Status: Ready';
        console.log('Scolia WebSocket verbunden');
      };
      scolia_ws.onclose = () => {
        statusEl.textContent = 'Board-Status: Offline';
        console.log('Scolia WebSocket getrennt');
      };
      scolia_ws.onerror = () => {
        statusEl.textContent = 'Board-Status: Fehler';
        console.error('Scolia WebSocket Fehler');
      };
      scolia_ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleScoliaMessage(msg);
        } catch (err) {
          console.error('Fehler beim Parsen von Scolia-Nachricht:', err);
        }
      };
    } catch (err) {
      console.error('WebSocket Fehler:', err);
      if (statusEl) statusEl.textContent = 'Board-Status: Fehler';
    }
  } else {
    if (statusEl) statusEl.textContent = 'Board-Status: (Keine Scolia-Config)';
  }
}

function handleScoliaMessage(msg) {
  if (archivedMode) return;

  console.debug('Scolia message:', msg);

  if (msg.type === 'THROW_DETECTED') {
    const payload = msg.payload || {};
    const sector = (payload.sector || '').toString().toLowerCase().toUpperCase();
    const bounceout = Boolean(payload.bounceout);
    const miss = bounceout || sector === 'NONE' || !sector;

    console.debug('THROW_DETECTED', { sector, bounceout, miss, payload });

    const player = players[activePlayerIndex];
    if (player) {
      if (miss) {
        processThrow(player, 'Miss', 0, {
          eventType: 'throw_detected',
          source: 'scolia_ws',
          detectedAt: payload.detectionTime || new Date().toISOString(),
          payload
        });
      } else {
        // Versuche zu parsen: "D20", "T20", "20", etc.
        const throwData = parseThrow(sector);
        if (throwData) {
          processThrow(player, throwData.sector, throwData.points, {
            eventType: 'throw_detected',
            source: 'scolia_ws',
            detectedAt: payload.detectionTime || new Date().toISOString(),
            payload
          });
        }
      }
    }
  }
}

function processThrow(player, sector, points, metadata = {}) {
  const newScore = player.remainingScore - points;

  if (newScore === 1) {
    // Auf 1 kann nicht beendet werden
    return;
  }

  if (newScore < 0) {
    // Überworfen
    return;
  }

  if (newScore === 0) {
    if (sector.startsWith('D') || sector === 'BULL') {
      alert(`${player.name} hat gewonnen!`);
      // Spiel beenden
    } else {
      // Letzter Wurf muss Double oder Bull sein
      return;
    }
  }

  player.remainingScore = newScore;
  player.addThrow(sector, points);
  player.updateDisplay();

  document.getElementById('throwSector').value = '';
  nextPlayer();
}

// Event Listener (wird durch initApp aufgerufen)
// document.addEventListener('DOMContentLoaded', initApp) wird in index.php gemacht