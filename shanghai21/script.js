// "Shanghai 21" Scolia Dartspiel

// 1) Init-Funktion nach Login
function initApp() {
  // Anmeldedaten aus config (bzw. localStorage) übernehmen
  document.getElementById('scoliaSerial').value = localStorage.getItem('scoliaSerial') || '';
  document.getElementById('scoliaToken').value = localStorage.getItem('scoliaToken') || '';

  // 2) WebSocket-Verbindung initialisieren
  const statusEl = document.getElementById('status');
  let ws = new WebSocket(
    `wss://game.scoliadarts.com/api/v1/social?serialNumber=${scoliaSerial}&accessToken=${scoliaToken}`
  );
  ws.onopen = () => statusEl.textContent = 'Board-Status: Ready';
  ws.onclose = () => statusEl.textContent = 'Board-Status: Offline';
  ws.onerror = () => statusEl.textContent = 'Board-Status: Fehler';
  ws.onmessage = ({ data }) => handleMessage(JSON.parse(data));

  // 3) Spiel-Logik
  const sequence = Array.from({ length: 20 }, (_, i) => (i + 1).toString()).concat('Bull');
  let currentIndex = 0;
  let totalScore = 0;
  const tbody = document.querySelector('#resultsTable tbody');
  const sumCell = document.getElementById('sumCell');

  // Highlight-Funktion
  function highlightRow(i) {
    document.querySelectorAll('#resultsTable tr').forEach(r => r.classList.remove('current-row'));
    const rows = Array.from(document.querySelectorAll('#resultsTable tbody tr')).concat(
      document.querySelector('#resultsTable tfoot tr')
    );
    if (rows[i]) rows[i].classList.add('current-row');
  }

  // Tabelle initial füllen und erstes Ziel markieren
  sequence.forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${t}</td><td></td><td></td>`;
    tbody.appendChild(row);
  });
  highlightRow(0);

  // 4) Wurf verarbeiten
  function processThrow(sec, type = null) {
    const sector = sec.toString().toUpperCase();
    let mult = type === 'miss' ? 0
      : type === 'Double' ? 2
      : type === 'Triple' ? 3
      : sector.startsWith('D') ? 2
      : sector.startsWith('T') ? 3
      : 1;
    let base = sector === '25' ? '25'
      : sector === 'BULL' ? 'Bull'
      : (sector.match(/(20|1[0-9]|[1-9])/) || [''])[0];
    let hit = mult === 0 ? '0'
      : base === 'Bull' ? (mult === 2 ? '50' : '25')
      : mult === 2 ? `D ${base}`
      : mult === 3 ? `T ${base}`
      : base;
    let pts = 0;
    if ((hit === '25' || hit === '50') && sequence[currentIndex] === 'Bull'
      || hit.replace(/^D |^T /, '') === sequence[currentIndex]) {
      pts = base === 'Bull' ? mult * 25 : mult * parseInt(base, 10);
    }
    totalScore += pts;
    const row = tbody.children[currentIndex];
    row.cells[1].textContent = pts;
    row.cells[2].textContent = hit;
    if (pts > 0) row.classList.add('hit');
    sumCell.textContent = totalScore;
    currentIndex++;
    highlightRow(currentIndex);
    if (sequence[currentIndex] === 'Bull') document.getElementById('btnTriple').style.display = 'none';
  }

  // 5) WebSocket-Messages
  function handleMessage(msg) {
    if (msg.type === 'THROW_DETECTED') {
      const miss = msg.payload.sector === 'None' || msg.payload.bounceout;
      processThrow(miss ? 'None' : msg.payload.sector, miss ? 'miss' : null);
    }
  }

  // 6) Manueller Input
  document.getElementById('manualSubmit').onclick = () => {
    const val = document.getElementById('manualSector').value.trim();
    if (val) processThrow(val);
  };
  document.getElementById('manualSector').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('manualSubmit').click();
  });
  document.getElementById('btnMiss').onclick = () => processThrow('None', 'miss');
  document.getElementById('btnSingle').onclick = () => processThrow(sequence[currentIndex]);
  document.getElementById('btnDouble').onclick = () => processThrow(sequence[currentIndex], 'Double');
  document.getElementById('btnTriple').onclick = () => processThrow(sequence[currentIndex], 'Triple');
}