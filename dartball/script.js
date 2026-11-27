(() => {
  'use strict';

  const APP = window.DARTBALL_APP || {};
  const API = '/cloud-storage.php';
  const HALF_MS = 4 * 60 * 1000 + 30 * 1000;
  const STORAGE_KEY = 'dartball:local-state';
  const TEAM = { ORANGE: 'orange', BLUE: 'blue' };
  let scoliaSocket = null;
  let lastScoliaDetection = '';
  const $ = id => document.getElementById(id);
  let state;
  let undoStack = [];
  let timerHandle = null;
  let persistQueue = Promise.resolve();
  let savedGames = [];
  let activeSaveId = null;
  let storageEnabled = false;
  let archived = false;

  function initialState() {
    return {
      gameType: 'dartball', half: 1, status: 'ready', halfStartedAt: null,
      halfStartTimes: { 1: null, 2: null },
      scores: { orange: 0, blue: 0 }, activeTeam: TEAM.ORANGE,
      possession: null, ballField: 'bull', dartInTurn: 0,
      history: [], eventNo: 0,
    };
  }

  function cleanState(raw) {
    const base = initialState();
    if (!raw || typeof raw !== 'object') return base;
    const half = Number(raw.half);
    const team = raw.activeTeam === TEAM.BLUE ? TEAM.BLUE : TEAM.ORANGE;
    const ball = raw.ballField;
    return {
      ...base, ...raw,
      half: half === 2 ? 2 : 1,
      status: ['ready', 'playing', 'half-time', 'finished'].includes(raw.status) ? raw.status : 'ready',
      halfStartedAt: typeof raw.halfStartedAt === 'string' ? raw.halfStartedAt : null,
      halfStartTimes: {
        1: typeof raw.halfStartTimes?.[1] === 'string' ? raw.halfStartTimes[1] : null,
        2: typeof raw.halfStartTimes?.[2] === 'string' ? raw.halfStartTimes[2] : null,
      },
      scores: { orange: Math.max(0, Number(raw.scores?.orange) || 0), blue: Math.max(0, Number(raw.scores?.blue) || 0) },
      activeTeam: team,
      possession: raw.possession === TEAM.ORANGE || raw.possession === TEAM.BLUE ? raw.possession : null,
      ballField: ball === 'bull' || (Number.isInteger(Number(ball)) && Number(ball) >= 1 && Number(ball) <= 20) ? (ball === 'bull' ? 'bull' : Number(ball)) : 'bull',
      dartInTurn: Math.min(3, Math.max(0, Number(raw.dartInTurn) || 0)),
      history: Array.isArray(raw.history) ? raw.history.filter(item => item && typeof item.text === 'string').slice(-200) : [],
      eventNo: Math.max(0, Number(raw.eventNo) || 0),
    };
  }

  function goalFor(team) {
    // End switch: Orange attacks D6 / Blue attacks D11 in the first half.
    if (state.half === 1) return team === TEAM.ORANGE ? 6 : 11;
    return team === TEAM.ORANGE ? 11 : 6;
  }
  function teamName(team) { return team === TEAM.ORANGE ? 'Team Orange' : 'Team Blau'; }
  function fieldName(field) { return field === 'bull' ? 'Mittelkreis' : String(field); }
  function goalName(field) { return `Doppel ${field}`; }
  function possessionText() {
    if (!state.possession) return `Ball liegt am ${fieldName(state.ballField)}`;
    return `Ballbesitz ${teamName(state.possession)} auf ${fieldName(state.ballField)}`;
  }
  function targetLabel() {
    if (state.possession !== state.activeTeam) return state.ballField === 'bull' ? 'Bull' : fieldName(state.ballField);
    return goalName(goalFor(state.activeTeam));
  }
  function targetHint() {
    if (state.possession !== state.activeTeam) return state.ballField === 'bull' ? 'Ball aufnehmen: Single Bull oder Bull' : `Ball übernehmen: Single, Double oder Triple ${state.ballField}`;
    return `Tor für ${teamName(state.activeTeam)} · ${goalName(goalFor(state.activeTeam))}`;
  }

  function parseHit(raw) {
    const value = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!value || ['MISS', 'M', '0', 'NONE'].includes(value)) return { kind: 'miss', label: 'Fehlwurf' };
    if (['BULL', 'DBULL', 'BULLSEYE', '50'].includes(value)) return { kind: 'bull', field: 'bull', label: 'Bull' };
    if (['25', 'SBULL', 'S25', 'SINGLEBULL'].includes(value)) return { kind: 'bull', field: 'bull', label: 'Single Bull' };
    const match = value.match(/^([SDT]?)(20|1[0-9]|[1-9])$/);
    if (!match) return null;
    const multiplier = match[1] || 'S';
    return { kind: 'number', field: Number(match[2]), multiplier, label: `${multiplier}${match[2]}` };
  }

  function snapshot() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 100) undoStack.shift();
  }

  function addHistory(text, type = 'event', team = null) {
    state.eventNo += 1;
    state.history.unshift({ no: state.eventNo, text, type, team, at: new Date().toISOString() });
    state.history = state.history.slice(0, 200);
  }

  function secondsLeft() {
    if (state.status === 'half-time' || state.status === 'finished') return 0;
    const startedAt = state.halfStartedAt || state.halfStartTimes?.[state.half];
    if (state.status !== 'playing' || !startedAt) return HALF_MS / 1000;
    const started = Date.parse(startedAt);
    if (!Number.isFinite(started)) return HALF_MS / 1000;
    return Math.max(0, Math.ceil((started + HALF_MS - Date.now()) / 1000));
  }

  function endHalf() {
    if (state.status !== 'playing') return;
    state.status = state.half === 1 ? 'half-time' : 'finished';
    state.halfStartedAt = null;
    state.dartInTurn = 0;
    state.possession = null;
    state.ballField = 'bull';
    addHistory(state.half === 1 ? 'Halbzeit. Seitenwechsel, es geht am Mittelkreis weiter.' : 'Spielende. Die zweite Halbzeit ist abgelaufen.', 'period');
    setStatus(state.half === 1 ? 'Halbzeit beendet. Nach dem Seitenwechsel die zweite Halbzeit starten.' : 'Spiel beendet.');
    render();
    void persist('half_end');
  }

  function updateClock() {
    if (state.status === 'playing' && secondsLeft() <= 0) endHalf();
    const remaining = secondsLeft();
    const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    $('clock').textContent = `${minutes}:${seconds}`;
    $('clock').classList.toggle('clock-expired', state.status === 'finished');
  }

  function render() {
    $('orangeScore').textContent = String(state.scores.orange);
    $('blueScore').textContent = String(state.scores.blue);
    $('halfLabel').textContent = state.half === 1 ? 'Halbzeit 1' : 'Halbzeit 2';
    $('activeTeamLabel').textContent = `${teamName(state.activeTeam)} am Zug`;
    $('activeTeamLabel').style.color = state.activeTeam === TEAM.ORANGE ? '#ffad5c' : '#70b7ff';
    $('dartCounter').textContent = state.status === 'playing' || state.status === 'ready' ? `Dart ${Math.min(state.dartInTurn + 1, 3)} / 3` : 'Runde pausiert';
    $('target').textContent = targetLabel();
    $('targetHint').textContent = targetHint();
    $('possessionBanner').textContent = possessionText();
    $('possessionBanner').classList.toggle('orange', state.possession === TEAM.ORANGE);
    $('possessionBanner').classList.toggle('blue', state.possession === TEAM.BLUE);
    $('matchStatus').textContent = state.status === 'ready' ? 'Anstoß: Mittelkreis' : state.status === 'playing' ? 'Spiel läuft' : state.status === 'half-time' ? 'Halbzeitpause · Seitenwechsel' : 'Spiel beendet';
    const ticker = $('eventTicker');
    ticker.replaceChildren();
    if (!state.history.length) {
      const empty = document.createElement('li'); empty.className = 'ticker-empty'; empty.textContent = 'Der Spielverlauf erscheint hier.'; ticker.appendChild(empty);
    } else {
      state.history.forEach(entry => {
        const row = document.createElement('li');
        if (entry.type === 'goal') row.classList.add(entry.team === TEAM.ORANGE ? 'goal-orange' : 'goal-blue');
        const text = document.createElement('span'); text.textContent = entry.text; row.appendChild(text);
        const time = document.createElement('span'); time.className = 'event-time';
        const date = new Date(entry.at); time.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); row.appendChild(time);
        ticker.appendChild(row);
      });
    }
    $('startNextHalfBtn').hidden = state.status !== 'half-time';
    $('throwBtn').disabled = archived || state.status === 'half-time' || state.status === 'finished';
    $('throwInput').disabled = $('throwBtn').disabled;
    $('undoBtn').disabled = archived || undoStack.length === 0;
    $('resetBtn').disabled = archived;
    updateClock();
  }

  function setStatus(message, error = false) {
    $('actionStatus').textContent = message;
    $('actionStatus').style.color = error ? '#ff8989' : '';
  }

  function startClockIfNeeded() {
    if (state.status === 'ready') {
      state.status = 'playing';
      state.halfStartedAt = new Date().toISOString();
      state.halfStartTimes[state.half] = state.halfStartedAt;
      addHistory(`${teamName(state.activeTeam)} nimmt am Mittelkreis den Ball auf. Die Uhr läuft.`, 'period');
      setStatus('Die Halbzeit läuft.');
    }
  }

  function processThrow(raw, eventMeta = {}) {
    if (archived || ['half-time', 'finished'].includes(state.status)) return false;
    const hit = parseHit(raw);
    if (!hit) { setStatus('Ungültiger Wurf. Beispiele: S20, D6, T19, Bull, 25 oder Miss.', true); $('throwInput').focus(); return false; }
    if (state.status === 'playing' && secondsLeft() <= 0) { endHalf(); return false; }
    snapshot();
    const team = state.activeTeam;
    const normalizedSector = hit.kind === 'miss' ? 'Miss' : hit.label;
    const dart = state.dartInTurn + 1;
    let eventText = `${teamName(team)} · Dart ${dart}: ${hit.label}.`;

    if (hit.kind !== 'miss') {
      if (!state.possession) {
        const matchesBall = state.ballField === 'bull' ? hit.kind === 'bull' : hit.kind === 'number' && hit.field === state.ballField;
        if (matchesBall) {
          state.possession = team;
          startClockIfNeeded();
          eventText += ` Ballbesitz ${teamName(team)} auf ${fieldName(state.ballField)}.`;
        } else {
          eventText += ` Ball bleibt auf ${fieldName(state.ballField)}.`;
        }
      } else if (state.possession !== team) {
        const takesBall = state.ballField === 'bull' ? hit.kind === 'bull' : hit.kind === 'number' && hit.field === state.ballField;
        if (takesBall) {
          state.possession = team;
          eventText += ` ${teamName(team)} erobert den Ball auf ${fieldName(state.ballField)}.`;
        } else {
          eventText += ` Ballbesitz bleibt bei ${teamName(state.possession)} auf ${fieldName(state.ballField)}.`;
        }
      } else {
        const goal = goalFor(team);
        const opposingGoal = goalFor(team === TEAM.ORANGE ? TEAM.BLUE : TEAM.ORANGE);
        if (hit.kind === 'number' && hit.multiplier === 'D' && (hit.field === goal || hit.field === opposingGoal)) {
          const ownGoal = hit.field === opposingGoal;
          const scorer = ownGoal ? (team === TEAM.ORANGE ? TEAM.BLUE : TEAM.ORANGE) : team;
          state.scores[scorer] += 1;
          eventText += ` ${ownGoal ? 'Eigentor!' : 'TOR!'} Punkt für ${teamName(scorer)}.`;
          addHistory(eventText, 'goal', scorer);
          state.possession = null;
          state.ballField = 'bull';
          setStatus(`${ownGoal ? 'Eigentor' : 'Tor'} für ${teamName(scorer)}! Ball zurück am Mittelkreis.`);
          advanceDart();
          if (state.status === 'ready') startClockIfNeeded();
          render();
          void persist('goal', { ...eventMeta, sectorResult: eventMeta.sectorResult || normalizedSector });
          return true;
        }
        state.ballField = hit.kind === 'bull' ? 'bull' : hit.field;
        eventText += ` Ball liegt jetzt auf ${fieldName(state.ballField)}; ${teamName(team)} bleibt im Ballbesitz.`;
      }
    } else {
      eventText += ' Kein Treffer; Ballbesitz unverändert.';
    }

    addHistory(eventText);
    if (state.status === 'ready' && state.possession === team) startClockIfNeeded();
    if (secondsLeft() <= 0 && state.status === 'playing') { endHalf(); return; }
    advanceDart();
    setStatus(state.possession === team ? `${teamName(team)} ist am Ball.` : state.possession ? `Ballbesitz ${teamName(state.possession)}.` : `Ball liegt auf ${fieldName(state.ballField)}.`);
    render();
    void persist('throw', { ...eventMeta, sectorResult: eventMeta.sectorResult || normalizedSector });
    return true;
  }

  function advanceDart() {
    state.dartInTurn += 1;
    if (state.dartInTurn >= 3) {
      state.dartInTurn = 0;
      state.activeTeam = state.activeTeam === TEAM.ORANGE ? TEAM.BLUE : TEAM.ORANGE;
      addHistory(`Rundenwechsel: ${teamName(state.activeTeam)} wirft.`);
    }
  }

  function startSecondHalf() {
    if (state.status !== 'half-time' || archived) return;
    snapshot();
    state.half = 2;
    state.status = 'ready';
    state.halfStartedAt = null;
    state.possession = null;
    state.ballField = 'bull';
    state.activeTeam = TEAM.BLUE;
    state.dartInTurn = 0;
    addHistory('Seitenwechsel abgeschlossen. Zweite Halbzeit startet am Mittelkreis, die Uhr beginnt mit der Ballaufnahme.');
    setStatus('Zweite Halbzeit: Ballaufnahme am Mittelkreis startet die Uhr.');
    render();
    void persist('half_start');
  }

  function resetGame() {
    if (archived) return;
    if ((state.history.length || state.scores.orange || state.scores.blue) && !window.confirm('Das Dartball-Spiel wirklich zurücksetzen?')) return;
    state = initialState(); undoStack = [];
    addHistory('Neues Spiel bereit. Team Orange beginnt am Mittelkreis.');
    setStatus('Spiel bereit. Treffer am Mittelkreis starten die Uhr.');
    render();
    void persist('reset');
  }

  function undo() {
    if (archived || !undoStack.length) return;
    state = cleanState(JSON.parse(undoStack.pop()));
    setStatus('Letzter Dart wurde zurückgenommen.');
    render();
    void persist('undo');
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }
  async function fetchJson(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Speicherstand konnte nicht verarbeitet werden.');
    return data;
  }
  function setSaveInfo(text, error = false) { const el = $('saveStateInfo'); if (el) { el.textContent = text; el.classList.toggle('error', error); } }
  function stateForSave() { return { ...state, players: [{ index: 0, name: 'Team Orange' }, { index: 1, name: 'Team Blau' }] }; }
  function saveIdKey() { return `dartball:last-save:${APP.userId || 'guest'}`; }

  function persist(eventType, eventMeta = {}) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* storage may be disabled */ }
    if (!APP.isAuthenticated || !storageEnabled || !activeSaveId || archived) return Promise.resolve();
    const id = activeSaveId;
    const stateCopy = stateForSave();
    const eventNo = state.eventNo;
    const activeTeam = state.activeTeam;
    const eventSnapshot = {
      eventNo, eventType, source: eventMeta.source || 'ui',
      playerIndex: activeTeam === TEAM.ORANGE ? 0 : 1,
      playerName: teamName(activeTeam), targetLabel: targetLabel(),
      sectorResult: eventMeta.sectorResult || '', scoreDelta: 0,
      scoreAfter: state.scores[activeTeam],
      detectedAt: eventMeta.detectedAt || new Date().toISOString(),
      payload: { ...(eventMeta.payload || {}), half: state.half, possession: state.possession, ballField: state.ballField },
    };
    persistQueue = persistQueue.catch(() => undefined).then(async () => {
      if (!storageEnabled || activeSaveId !== id) return;
      const result = await fetchJson(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', csrfToken: APP.csrfToken, gameType: 'dartball', saveId: id, state: stateCopy, event: eventSnapshot }) });
      if (result.save) setSaveInfo(`Cloud-Spiel aktiv: ${result.save.saveName || 'Dartball'}`);
    }).catch(error => setSaveInfo(`Cloud-Speichern fehlgeschlagen: ${error.message}`, true));
    return persistQueue;
  }

  async function enableStorage() {
    if (!APP.isAuthenticated) return;
    try {
      const data = await fetchJson(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', csrfToken: APP.csrfToken, gameType: 'dartball', saveName: 'Dartball', state: stateForSave() }) });
      activeSaveId = Number(data.save?.id) || null; storageEnabled = Boolean(activeSaveId); archived = false;
      if (storageEnabled) localStorage.setItem(saveIdKey(), JSON.stringify({ saveId: activeSaveId }));
      setSaveInfo(storageEnabled ? `Cloud-Spiel aktiv: ${data.save?.saveName || 'Dartball'}` : 'Cloud-Spiel konnte nicht aktiviert werden.');
      await refreshSaves();
      render();
    } catch (error) { setSaveInfo(error.message, true); }
  }

  async function refreshSaves() {
    if (!APP.isAuthenticated) return;
    const params = new URLSearchParams({ action: 'list', gameType: 'dartball', page: '1', pageSize: '50' });
    const data = await fetchJson(`${API}?${params}`);
    savedGames = data.saves || [];
    renderSaves();
  }

  function renderSaves() {
    const list = $('savedGamesList'); if (!list) return;
    list.replaceChildren();
    if (!savedGames.length) { const li = document.createElement('li'); li.textContent = 'Keine Spielstände vorhanden.'; list.appendChild(li); return; }
    savedGames.forEach(save => {
      const li = document.createElement('li');
      const label = document.createElement('span'); label.textContent = `${save.saveName || 'Dartball'} · ${save.updatedAt || ''}`;
      const actions = document.createElement('span'); actions.className = 'save-actions';
      const load = document.createElement('button'); load.type = 'button'; load.textContent = 'Laden'; load.onclick = () => void loadSave(save.id);
      actions.appendChild(load);
      if (save.isOwner !== false) {
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Löschen'; remove.onclick = () => void deleteSave(save.id); actions.appendChild(remove);
      }
      li.append(label, actions); list.appendChild(li);
    });
  }

  async function loadSave(id) {
    try {
      const data = await fetchJson(`${API}?action=load&gameType=dartball&saveId=${encodeURIComponent(id)}`);
      state = cleanState(data.save?.state || {});
      activeSaveId = Number(data.save?.id) || Number(id); storageEnabled = true; archived = Boolean(data.save?.isArchived); undoStack = [];
      try { localStorage.setItem(saveIdKey(), JSON.stringify({ saveId: activeSaveId })); } catch (_) { /* ignore */ }
      if (state.status === 'playing' && secondsLeft() <= 0) endHalf();
      setSaveInfo(archived ? 'Archivierter Spielstand (schreibgeschützt).' : `Spielstand geladen: ${data.save?.saveName || 'Dartball'}`);
      render();
    } catch (error) { setSaveInfo(error.message, true); }
  }

  async function deleteSave(id) {
    if (!window.confirm('Diesen Dartball-Spielstand löschen?')) return;
    try {
      await fetchJson(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', csrfToken: APP.csrfToken, gameType: 'dartball', saveId: id }) });
      if (activeSaveId === Number(id)) { activeSaveId = null; storageEnabled = false; }
      await refreshSaves(); setSaveInfo('Spielstand gelöscht.');
    } catch (error) { setSaveInfo(error.message, true); }
  }

  async function renameSave() {
    if (!activeSaveId || !storageEnabled) { setSaveInfo('Zuerst einen Cloud-Spielstand laden oder anlegen.', true); return; }
    const saveName = $('saveNameInput').value.trim();
    try {
      await fetchJson(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rename', csrfToken: APP.csrfToken, gameType: 'dartball', saveId: activeSaveId, saveName }) });
      setSaveInfo(`Spielstand umbenannt: ${saveName || 'Dartball'}`); await refreshSaves();
    } catch (error) { setSaveInfo(error.message, true); }
  }

  async function initializeStorage() {
    if (!APP.isAuthenticated) return;
    $('toggleStorageBtn')?.addEventListener('click', () => void enableStorage());
    $('loadGamesBtn')?.addEventListener('click', async () => {
      $('savedGamesPanel').hidden = !$('savedGamesPanel').hidden;
      if (!$('savedGamesPanel').hidden) { try { await refreshSaves(); } catch (error) { setSaveInfo(error.message, true); } }
    });
    $('renameSaveBtn')?.addEventListener('click', () => void renameSave());
    try {
      const persisted = JSON.parse(localStorage.getItem(saveIdKey()) || '{}');
      if (Number(persisted.saveId)) await loadSave(Number(persisted.saveId));
      else await refreshSaves();
    } catch (error) { setSaveInfo(error.message, true); }
  }

  function handleScoliaMessage(message) {
    if (!message || typeof message !== 'object' || message.type !== 'THROW_DETECTED' || archived) return;
    const payload = message.payload && typeof message.payload === 'object' ? message.payload : {};
    const detectionId = String(payload.detectionTime || payload.detectionId || '');
    if (detectionId && detectionId === lastScoliaDetection) return;
    if (detectionId) lastScoliaDetection = detectionId;
    const sector = String(payload.sector || '').trim().toUpperCase();
    const isMiss = Boolean(payload.bounceout) || !sector || ['NONE', 'MISS', '0'].includes(sector);
    const result = processThrow(isMiss ? 'Miss' : sector, {
      eventType: 'throw_detected', source: 'scolia_ws', sectorResult: isMiss ? 'Miss' : sector,
      detectionId, detectedAt: payload.detectionTime || new Date().toISOString(), payload,
    });
    if (result === false && !archived) setStatus(`Scolia-Wurf ignoriert (Spiel pausiert oder ungültiges Feld): ${sector || 'Miss'}`, true);
  }

  function initDartballScolia() {
    const status = $('status');
    const { serialNumber, accessToken } = window.SCOLIA_CONFIG || {};
    if (!serialNumber || !accessToken) {
      if (status) status.textContent = 'Board-Status: Keine Scolia-Konfiguration';
      return;
    }
    try {
      const url = `wss://game.scoliadarts.com/api/v1/social?serialNumber=${encodeURIComponent(serialNumber)}&accessToken=${encodeURIComponent(accessToken)}`;
      scoliaSocket = new WebSocket(url);
      if (status) status.textContent = 'Board-Status: Verbinde…';
      scoliaSocket.onopen = () => { if (status) status.textContent = 'Board-Status: Ready'; };
      scoliaSocket.onclose = () => { if (status) status.textContent = 'Board-Status: Offline'; };
      scoliaSocket.onerror = () => { if (status) status.textContent = 'Board-Status: Fehler'; };
      scoliaSocket.onmessage = event => {
        try { handleScoliaMessage(JSON.parse(event.data)); }
        catch (error) { console.error('Ungültige Scolia-Nachricht', error); }
      };
    } catch (error) {
      console.error('Scolia WebSocket konnte nicht gestartet werden.', error);
      if (status) status.textContent = 'Board-Status: Fehler';
    }
  }

  function bind() {
    $('throwBtn').addEventListener('click', () => { const input = $('throwInput'); if (!input.value.trim()) return; processThrow(input.value); input.value = ''; input.focus(); });
    $('throwInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('throwBtn').click(); });
    document.querySelectorAll('[data-hit]').forEach(button => button.addEventListener('click', () => processThrow(button.dataset.hit)));
    $('undoBtn').addEventListener('click', undo);
    $('resetBtn').addEventListener('click', resetGame);
    $('startNextHalfBtn').addEventListener('click', startSecondHalf);
    $('newGameBtn')?.addEventListener('click', () => {
      if (state.history.length && !window.confirm('Neues Spiel starten? Der aktuelle Stand bleibt gespeichert, falls er in der Cloud liegt.')) return;
      activeSaveId = null; storageEnabled = false; archived = false; undoStack = []; state = initialState(); addHistory('Neues Spiel bereit. Team Orange beginnt am Mittelkreis.');
      try { localStorage.removeItem(saveIdKey()); } catch (_) { /* ignore */ }
      setStatus('Spiel bereit. Treffer am Mittelkreis starten die Uhr.'); render(); void persist('new_game');
    });
  }

  function recoverExpiredHalf() {
    if (state.status !== 'playing' || secondsLeft() > 0) return false;
    state.status = state.half === 1 ? 'half-time' : 'finished';
    state.halfStartedAt = null;
    state.dartInTurn = 0;
    state.possession = null;
    state.ballField = 'bull';
    addHistory(state.half === 1 ? 'Halbzeit lief während der Abwesenheit ab. Seitenwechsel erforderlich.' : 'Spielende: Die zweite Halbzeit lief während der Abwesenheit ab.', 'period');
    return true;
  }

  function init() {
    try { state = cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); } catch (_) { state = initialState(); }
    if (state.status === 'playing') state.halfStartedAt = state.halfStartedAt || state.halfStartTimes[state.half];
    recoverExpiredHalf();
    if (!state.history.length) addHistory('Neues Spiel bereit. Team Orange beginnt am Mittelkreis.');
    bind(); render();
    timerHandle = window.setInterval(() => { updateClock(); }, 250);
    void initializeStorage();
  }
  window.initDartballScolia = initDartballScolia;
  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
