// "Klassisches 501 Darts" v1.0

const storageApiUrl = '/cloud-storage.php';
const gameType = 'darts501';

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

class Player {
  constructor(name, index, remainingScore = 501) {
    this.name = name;
    this.index = index;
    this.remainingScore = remainingScore;
    this.element = this.createElement();
  }

  createElement() {
    const div = document.createElement('div');
    div.className = 'player-card';
    div.id = `player${this.index}`;
    div.innerHTML = `
      <h3>${this.name}</h3>
      <div class="score">Verbleibend: <span class="remaining-score">${this.remainingScore}</span></div>
      <div class="throws"></div>
    `;
    return div;
  }

  updateDisplay() {
    const remainingSpan = this.element.querySelector('.remaining-score');
    remainingSpan.textContent = this.remainingScore;
    this.element.classList.toggle('active', activePlayerIndex === this.index);
  }

  addThrow(sector, points) {
    const throwsDiv = this.element.querySelector('.throws');
    const throwDiv = document.createElement('div');
    throwDiv.className = 'throw';
    throwDiv.textContent = `${sector}: ${points}`;
    throwsDiv.appendChild(throwDiv);
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

  if (newScore < 0) {
    alert('Überworfen! Bleib unter der Punktzahl.');
    return;
  }

  if (newScore === 0) {
    if (throwData.sector.startsWith('D') || throwData.sector === 'BULL') {
      alert(`${player.name} hat gewonnen!`);
      // Spiel beenden
    } else {
      alert('Letzter Wurf muss Double oder Bull sein!');
      return;
    }
  }

  player.remainingScore = newScore;
  player.addThrow(throwData.sector, throwData.points);
  player.updateDisplay();

  document.getElementById('throwSector').value = '';
  nextPlayer();
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

// Event Listener
document.addEventListener('DOMContentLoaded', () => {
  initGame();

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

  // Speichern-Buttons (später implementieren)
  document.getElementById('newGameBtn').addEventListener('click', initGame);
});