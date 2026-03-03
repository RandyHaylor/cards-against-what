// -- Sync operations (passthrough to sync controller) --

export function createLobby(syncController, lobbyCode) {
  return syncController.createLobby(lobbyCode);
}

export function syncAllPlayerDocs(syncController, lobbyCode, players) {
  return syncController.syncPlayerDocs(lobbyCode, players);
}

// -- Pure game logic --

export function buildPlayerState(id, name, isHost) {
  return {
    id,
    name,
    isHost,
    score: 0,
    phase: "lobby",
    players: [],
    hand: [],
    currentPrompt: null,
    isJudge: false,
    message: "",
    clientUpdates: {
      playerReady: false,
      submission: null,
      discardRequests: null,
    },
  };
}

export function buildPlayerList(players) {
  return players.map((p) => ({
    name: p.name,
    score: p.score,
    ready: p.clientUpdates.playerReady,
    isHost: p.isHost,
  }));
}

export function addPlayer(players, playerId, name, isHost) {
  const player = buildPlayerState(playerId, name, isHost);
  const allPlayers = [...players, player];
  const playerList = buildPlayerList(allPlayers);
  return allPlayers.map((p) => ({ ...p, players: playerList }));
}

export function markPlayerReady(players, playerId) {
  const updated = players.map((p) => {
    if (p.id === playerId) {
      return {
        ...p,
        clientUpdates: { ...p.clientUpdates, playerReady: true },
      };
    }
    return p;
  });
  const playerList = buildPlayerList(updated);
  return updated.map((p) => ({ ...p, players: playerList }));
}

export function allPlayersReady(players) {
  return players.length > 0 && players.every((p) => p.clientUpdates.playerReady);
}
