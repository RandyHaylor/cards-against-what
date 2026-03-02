import { HostTransport } from '../transport/host-transport.js';
import { renderPlayerSession } from './player-session.js';
import { getPlayerName } from '../utils.js';


function flashBtn(btn, msg) {
  const orig = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

export function renderHostShell(container, code, params) {
  const transport = new HostTransport(code);
  const players = {};
  const bootstrapped = {};
  let cleanupPlayer = null;
  let playerJoined = false;

  container.innerHTML = `
    <div class="host-shell">
      <div class="top-bar">
        <div class="top-bar-row">
          <button class="btn-host" id="btnHostMenu">Host Menu</button>
          <span class="top-bar-label">Lobby: <strong>${code}</strong></span>
          <div class="top-bar-right">
            <button class="btn-sm" id="btnCopyCode">Copy Code</button>
            <button class="btn-sm" id="btnCopyLink">Copy Link</button>
          </div>
        </div>
        <div id="hostPlayerList" class="top-bar-players"></div>
        <div class="host-menu" id="hostMenu" style="display:none">
          <p class="host-hint">Tap a player name above to copy their rejoin link</p>
          <div class="host-controls">
            <span id="hostPhase">Phase: &mdash;</span>
            <span id="hostPlayerCount">Players: 0</span>
          </div>
        </div>
      </div>
      <div class="join-section card">
        <label for="hostJoinName">Your Name</label>
        <input type="text" id="hostJoinName" value="${getPlayerName()}" placeholder="Enter your name" />
        <p class="name-warning" id="hostNameWarning" style="display:none">That name is already taken</p>
        <button id="btnJoinAsPlayer">Join as Player</button>
      </div>
      <div id="embeddedPlayer"></div>
    </div>
  `;

  // ── Host Menu toggle ───────────────────────

  const menuEl = container.querySelector('#hostMenu');
  let menuOpen = false;

  container.querySelector('#btnHostMenu').addEventListener('click', () => {
    menuOpen = !menuOpen;
    menuEl.style.display = menuOpen ? '' : 'none';
  });

  // ── Copy Code / Copy Link ──────────────────

  container.querySelector('#btnCopyCode').addEventListener('click', (e) => {
    navigator.clipboard.writeText(code).then(() => flashBtn(e.target, 'Copied!'));
  });

  container.querySelector('#btnCopyLink').addEventListener('click', (e) => {
    const url = `${location.origin}${location.pathname}#/?code=${code}`;
    navigator.clipboard.writeText(url).then(() => flashBtn(e.target, 'Copied!'));
  });

  // ── Meta subscription ──────────────────────

  transport.subscribeMeta(meta => {
    const el = container.querySelector('#hostPhase');
    if (!meta) { el.textContent = 'Lobby not found'; return; }
    el.textContent = `Phase: ${meta.phase}`;
  });

  // ── Player events → bootstrap + roster ─────

  transport.subscribePlayerEvents(events => {
    for (const evt of events) {
      if (evt.type !== 'join') continue;
      if (bootstrapped[evt.playerId]) continue;

      const finalName = evt.payload?.name || evt.playerId;

      players[evt.playerId] = { name: finalName, joinedAt: evt.clientTs };
      bootstrapped[evt.playerId] = true;

      transport.writePlayerView(evt.playerId, {
        promptId: '', hand: [], canSubmit: false,
        submitted: false, revealData: null, score: 0,
        bannerMsg: `Welcome, ${finalName}!`
      });

      transport.writeRoster(evt.playerId, { name: finalName, joinedAt: evt.clientTs });
    }

    const entries = Object.entries(players);
    container.querySelector('#hostPlayerCount').textContent = `Players: ${entries.length}`;
    const listEl = container.querySelector('#hostPlayerList');
    listEl.innerHTML = entries
      .map(([pid, p]) => `<span class="player-tag player-tag-clickable" data-pid="${pid}">${p.name}</span>`)
      .join(' ');

    // Re-validate host name input in case a new player took the name
    if (!playerJoined) validateHostName();

    listEl.querySelectorAll('.player-tag-clickable').forEach(tag => {
      tag.addEventListener('click', () => {
        const pid = tag.dataset.pid;
        const url = `${location.origin}${location.pathname}#/lobby/${code}?reclaim=${pid}`;
        navigator.clipboard.writeText(url).then(() => {
          tag.textContent = 'Copied!';
          setTimeout(() => { tag.textContent = players[pid].name; }, 1500);
        });
      });
    });
  });

  // ── Join as Player (with name validation) ──

  const joinBtn = container.querySelector('#btnJoinAsPlayer');
  const nameInput = container.querySelector('#hostJoinName');
  const warningEl = container.querySelector('#hostNameWarning');
  const embedEl = container.querySelector('#embeddedPlayer');
  const joinSection = container.querySelector('.join-section');

  function isHostNameTaken(name) {
    return Object.values(players).some(p => p.name.toLowerCase() === name.toLowerCase());
  }

  function validateHostName() {
    const name = nameInput.value.trim();
    if (name && isHostNameTaken(name)) {
      warningEl.style.display = '';
      joinBtn.disabled = true;
    } else {
      warningEl.style.display = 'none';
      joinBtn.disabled = false;
    }
  }

  nameInput.addEventListener('input', validateHostName);

  joinBtn.addEventListener('click', () => {
    if (playerJoined) return;
    const name = nameInput.value.trim();
    if (!name) { alert('Enter your name to join'); return; }
    if (isHostNameTaken(name)) return;
    playerJoined = true;
    joinSection.style.display = 'none';
    cleanupPlayer = renderPlayerSession(embedEl, code, { ...params }, { embedded: true });
  });

  return () => {
    transport.destroy();
    if (cleanupPlayer) cleanupPlayer();
  };
}
