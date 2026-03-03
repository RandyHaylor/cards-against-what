export async function joinLobby(syncController, lobbyCode, playerId, name) {
  return syncController.joinLobby(lobbyCode, playerId, name);
}

export function setPlayerReady(syncController, lobbyCode, playerId) {
  syncController.setPlayerReady(lobbyCode, playerId);
}
