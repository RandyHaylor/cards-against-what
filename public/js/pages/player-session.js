import { PlayerTransport } from '../transport/player-transport.js';
import { getPlayerId, getPlayerName, setPlayerName } from '../utils.js';

function resolvePlayerId(code, params) {
  if (params.reclaim) {
    localStorage.setItem(`playerId:${code}`, params.reclaim);
    return params.reclaim;
  }
  return getPlayerId(code);
}

function flashBtn(btn, msg) {
  const orig = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

export function renderPlayerSession(container, code, params, opts = {}) {
  const playerId = resolvePlayerId(code, params);
  const transport = new PlayerTransport(code, playerId);
  const isEmbedded = opts.embedded;
  let joined = false;
  let rosterNames = [];  // current names in roster (lowercase for comparison)

  const topBarHtml = isEmbedded ? '' : `
    <div class="top-bar">
      <div class="top-bar-row">
        <span class="top-bar-label">Lobby: <strong>${code}</strong></span>
        <div class="top-bar-right">
          <button class="btn-sm" id="btnCopyCode">Copy Code</button>
          <button class="btn-sm" id="btnCopyLink">Copy Link</button>
        </div>
      </div>
      <div id="rosterBar" class="top-bar-players"></div>
    </div>`;

  container.innerHTML = `
    <div class="player-session${isEmbedded ? ' embedded' : ''}">
      ${topBarHtml}
      <div class="session-header">
        <span>You: <strong id="pName">${getPlayerName() || playerId}</strong></span>
      </div>
      <div id="metaDisplay" class="meta-display">Connecting...</div>
      <div id="playerViewDisplay" class="player-view"></div>
      <div id="namePrompt" class="card" style="display:none">
        <label for="joinName">Your Name</label>
        <input type="text" id="joinName" placeholder="Enter your name" value="${getPlayerName()}" />
        <p class="name-warning" id="nameWarning" style="display:none">That name is already taken</p>
        <button id="btnJoinLobby">Join Lobby</button>
      </div>
    </div>
  `;

  // ── Copy buttons (standalone only) ─────────

  if (!isEmbedded) {
    container.querySelector('#btnCopyCode')?.addEventListener('click', (e) => {
      navigator.clipboard.writeText(code).then(() => flashBtn(e.target, 'Copied!'));
    });
    container.querySelector('#btnCopyLink')?.addEventListener('click', (e) => {
      const url = `${location.origin}${location.pathname}#/?code=${code}`;
      navigator.clipboard.writeText(url).then(() => flashBtn(e.target, 'Copied!'));
    });
  }

  // ── Name validation ────────────────────────

  function isNameTaken(name) {
    return rosterNames.includes(name.toLowerCase());
  }

  function validateNameInput() {
    const input = container.querySelector('#joinName');
    const warning = container.querySelector('#nameWarning');
    const btn = container.querySelector('#btnJoinLobby');
    if (!input || !warning || !btn) return;

    const name = input.value.trim();
    if (name && isNameTaken(name)) {
      warning.style.display = '';
      btn.disabled = true;
    } else {
      warning.style.display = 'none';
      btn.disabled = false;
    }
  }

  container.querySelector('#joinName')?.addEventListener('input', validateNameInput);

  // ── Roster subscription ────────────────────

  transport.subscribeRoster(roster => {
    if (!roster) { rosterNames = []; }
    else { rosterNames = Object.values(roster).map(p => p.name.toLowerCase()); }

    // Update top bar tags (standalone only)
    if (!isEmbedded) {
      const bar = container.querySelector('#rosterBar');
      if (!roster) { bar.innerHTML = ''; }
      else {
        bar.innerHTML = Object.entries(roster).map(([pid, p]) => {
          const cls = pid === playerId ? 'player-tag player-tag-me' : 'player-tag';
          return `<span class="${cls}">${p.name}</span>`;
        }).join(' ');
      }
    }

    // Re-validate in case roster changed while typing
    if (!joined) validateNameInput();
  });

  // ── Meta subscription ──────────────────────

  transport.subscribeMeta(meta => {
    const el = container.querySelector('#metaDisplay');
    if (!meta) { el.textContent = 'Lobby not found.'; return; }
    el.innerHTML = `Phase: <strong>${meta.phase}</strong> &middot; Round: ${meta.roundId}`;

    if (!joined) {
      const name = getPlayerName();
      if (name && !isNameTaken(name)) {
        doJoin(name);
      } else {
        container.querySelector('#namePrompt').style.display = 'block';
        validateNameInput();
      }
    }
  });

  // ── PlayerView subscription ────────────────

  transport.subscribeMyView(view => {
    const el = container.querySelector('#playerViewDisplay');
    if (!view) { el.textContent = joined ? 'Waiting for host...' : ''; return; }
    const ui = view.ui || view;
    const parts = [];
    if (ui.bannerMsg) parts.push(`<p class="banner">${ui.bannerMsg}</p>`);
    parts.push(`<p>Score: ${ui.score ?? 0}</p>`);
    if (ui.hand?.length) parts.push(`<p>Hand: ${ui.hand.join(', ')}</p>`);
    el.innerHTML = parts.join('');
  });

  // ── Join intent ────────────────────────────

  function doJoin(name) {
    if (joined) return;
    if (isNameTaken(name)) return;
    joined = true;
    setPlayerName(name);
    transport.emitEvent('join', { name });
    container.querySelector('#namePrompt').style.display = 'none';
    container.querySelector('#pName').textContent = name;
  }

  container.querySelector('#btnJoinLobby')?.addEventListener('click', () => {
    const name = container.querySelector('#joinName').value.trim();
    if (!name) { alert('Enter your name'); return; }
    if (isNameTaken(name)) return;
    doJoin(name);
  });

  return () => transport.destroy();
}
