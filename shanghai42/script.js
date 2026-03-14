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

  function updateTripleButton() {
    const btn = document.getElementById('btnTriple');
    if (!btn) return;
    btn.style.display = sequence[currentIndex] === 'Bull' ? 'none' : 'inline';
  }

  sequence.forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${t}</td><td></td><td></td>`;
    tbody.appendChild(row);
  });
  highlightRow(0);
  updateTripleButton();

  function parseHit(sector, type = null) {
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
    updateTripleButton();
    if (currentIndex > 0) {
      document.getElementById('undoButton').style.display = 'inline';
    }
  }

  function handleMessage(msg) {
    console.debug('WS message:', msg);
    if (msg.type === 'THROW_DETECTED') {
      const sector = (msg.payload.sector || '').toString().toLowerCase();
      const bounceout = Boolean(msg.payload.bounceout);
      const miss = bounceout || sector === 'none';
      console.debug('THROW_DETECTED', { sector, bounceout, miss, payload: msg.payload });
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
  document.getElementById('btnSingle').onclick = () => processThrow(sequence[currentIndex], 'Single');
  document.getElementById('btnDouble').onclick = () => processThrow(sequence[currentIndex], 'Double');
  document.getElementById('btnTriple').onclick = () => processThrow(sequence[currentIndex], 'Triple');

  // Bearbeitungsmodus
  function calculatePoints(hit, target) {
    if (hit === '0' || hit === '') return 0;
    const isBull = target === 'Bull';
    const hitBase = hit.replace(/^D |^T /, '');
    const hitMult = hit.startsWith('D ') ? 2 : hit.startsWith('T ') ? 3 : 1;
    if ((isBull && hitBase === 'Bull' && hitMult === 2) || (!isBull && hitBase === target && hitMult === 2)) {
      return isBull ? 50 : 2 * parseInt(target, 10);
    }
    return -1;
  }

  function undoLastThrow() {
    if (currentIndex > 0) {
      currentIndex--;
      const row = tbody.children[currentIndex];
      row.cells[1].textContent = '';
      row.cells[2].textContent = '';
      row.classList.remove('hit', 'miss');
      totalScore = 0;
      for (let i = 0; i < currentIndex; i++) {
        const pts = calculatePoints(tbody.children[i].cells[2].textContent, sequence[i]);
        totalScore += pts;
      }
      sumCell.textContent = totalScore;
      highlightRow(currentIndex);
      updateTripleButton();
      if (currentIndex === 0) {
        document.getElementById('undoButton').style.display = 'none';
      }
    }
  }

  function enterEditMode() {
    document.getElementById('editButton').style.display = 'none';
    document.getElementById('saveButton').style.display = 'inline';
    const rows = tbody.children;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].cells[2];
      const currentHit = cell.textContent;
      cell.innerHTML = `<input type="text" value="${currentHit}" class="hit-input">`;
    }
  }

  function exitEditMode() {
    document.getElementById('editButton').style.display = 'inline';
    document.getElementById('saveButton').style.display = 'none';
    const rows = tbody.children;
    totalScore = 0;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].cells[2];
      const input = cell.querySelector('.hit-input');
      const newHit = input.value.trim();
      cell.textContent = newHit;
      const pts = calculatePoints(newHit, sequence[i]);
      if (newHit === '') {
        rows[i].cells[1].textContent = '';
      } else {
        rows[i].cells[1].textContent = pts;
      }
      totalScore += pts;
      rows[i].classList.remove('hit', 'miss');
      if (pts > 0) rows[i].classList.add('hit');
      else if (pts < 0) rows[i].classList.add('miss');
    }
    sumCell.textContent = totalScore;
    // Finde die nächste leere Zeile
    let newIndex = sequence.length;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].cells[2].textContent === '') {
        newIndex = i;
        break;
      }
    }
    currentIndex = newIndex;
    highlightRow(currentIndex);
    updateTripleButton();
    if (currentIndex > 0) {
      document.getElementById('undoButton').style.display = 'inline';
    } else {
      document.getElementById('undoButton').style.display = 'none';
    }
  }

  document.getElementById('editButton').addEventListener('click', enterEditMode);
  document.getElementById('saveButton').addEventListener('click', exitEditMode);
  document.getElementById('undoButton').addEventListener('click', undoLastThrow);
}
