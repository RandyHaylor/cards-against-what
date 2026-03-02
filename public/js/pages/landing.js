import { HostTransport } from '../transport/host-transport.js';
import { generateLobbyCode, getPlayerName, setPlayerName, guid } from '../utils.js';
import { navigate } from '../router.js';

export function renderLanding(container, params = {}) {
  const saved = getPlayerName();
  const prefillCode = params.code || '';

  container.innerHTML = `
    <div class="landing">
      <h1>Cards Against What</h1>

      <div class="card">
        <h2>Start a New Lobby</h2>
        <button id="btnCreate">Create Lobby</button>
      </div>

      <div class="card">
        <h2>Join a Lobby</h2>
        <label for="playerName">Your Name</label>
        <input type="text" id="playerName" placeholder="Enter your name" value="${saved}" />
        <input type="text" id="lobbyCode" placeholder="4-character lobby code" maxlength="4" value="${prefillCode}" />
        <button id="btnJoin">Join</button>
      </div>
    </div>
  `;

  // ── Create Lobby (no name needed) ──────────

  container.querySelector('#btnCreate').addEventListener('click', async () => {
    const btn = container.querySelector('#btnCreate');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    let code, transport;
    let exists = true;
    while (exists) {
      code = generateLobbyCode();
      transport = new HostTransport(code);
      exists = await transport.lobbyExists();
      if (exists) transport.destroy();
    }

    await transport.createLobby({
      gameId:          'caw',
      deckId:          'default',
      createdAt:       Date.now(),
      phase:           'lobby',
      roundId:         0,
      lockId:          0,
      leaderPlayerId:  '',
      currentPromptId: '',
      hostClientId:    guid()
    });
    transport.destroy();

    navigate(`/host/${code}`);
  });

  // ── Join Lobby ─────────────────────────────

  container.querySelector('#btnJoin').addEventListener('click', () => {
    const name = container.querySelector('#playerName').value.trim();
    if (!name) { alert('Enter your name first'); return; }
    setPlayerName(name);

    const code = container.querySelector('#lobbyCode').value.trim().toLowerCase();
    if (!code) { alert('Enter a lobby code'); return; }
    navigate(`/lobby/${code}`);
  });
}
