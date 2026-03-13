// "Shanghai 42" v2.0 Scolia Dartspiel

function initApp() {
  const { serialNumber, accessToken } = window.SCOLIA_CONFIG;

  const statusEl = document.getElementById('status');
  let ws = new WebSocket(
    `wss://game.scoliadarts.com/api/v1/social?serialNumber=${serialNumber}&accessToken=${accessToken}`
  );
  ws.onopen = () => statusEl.textContent = 'Board-Status: Ready';
  ws.onclose = () => statusEl.textContent = 'Board-Status: Offline';
  ws.onerror = () => statusEl.textContent = 'Board-Status: Fehler';
  ws.onmessage = ({ data }) => handleMessage(JSON.parse(data));

  const sequence = Array.from({ length: 20 }, (_, i) => (i + 1).toString()).concat('Bull');
  let currentIndex = 0;
  let totalScore = 0;
  const tbody = document.querySelector('#resultsTable tbody');
  const sumCell = document.getElementById('sumCell');

  function highlightRow(i) {
    document.querySelectorAll('#resultsTable tr').forEach(r => r.classList.remove('current-row'));
    const rows = Array.from(document.querySelectorAll('#resultsTable tbody tr')).concat(
      document.querySelector('#resultsTable tfoot tr')
    );
    if (rows[i]) rows[i].classList.add('current-row');
  }

  sequence.forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${t}</td><td></td><td></td>`;
    tbody.appendChild(row);
  });
  highlightRow(0);

  function parseHit(sector, type = null) {
    const raw = sector.toString().toUpperCase();
    const mult = type === 'miss' ? 0
      : type === 'Double' ? 2
      : type === 'Triple' ? 3
      : raw.startsWith('D') ? 2
      : raw.startsWith('T') ? 3
      : 1;
    const base = raw === '25' ? '25'
      : raw === 'BULL' ? 'Bull'
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

  function processThrow(sec, type = null) {
    const { hit, value, base, mult } = parseHit(sec, type);
    const target = sequence[currentIndex];

    // Scoring rule: only doubles of the current target score give positive points.
    // Any other hit (including singles/triples of the target or any other number) gives -1.
    // Misses (bounce out / None) are 0 points.
    let pts = 0;
    if (value > 0) {
      const correctDouble = (target === 'Bull' && hit === '50') || (hit === `D ${target}`);
      pts = correctDouble ? value : -1;
    }

    totalScore += pts;

    const row = tbody.children[currentIndex];
    row.cells[1].textContent = pts;
    row.cells[2].textContent = hit;
    row.classList.toggle('hit', pts > 0);
    row.classList.toggle('miss', pts < 0);

    sumCell.textContent = totalScore;
    currentIndex++;
    highlightRow(currentIndex);
    if (sequence[currentIndex] === 'Bull') document.getElementById('btnTriple').style.display = 'none';
  }

  function handleMessage(msg) {
    if (msg.type === 'THROW_DETECTED') {
      const miss = msg.payload.sector === 'None' || msg.payload.bounceout;
      processThrow(miss ? 'None' : msg.payload.sector, miss ? 'miss' : null);
    }
  }

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
