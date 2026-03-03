export function createLobby(syncController, lobbyCode) {
  return syncController.createLobby(lobbyCode);
}

export function syncAllPlayerDocs(syncController, lobbyCode, players) {
  return syncController.syncPlayerDocs(lobbyCode, players);
}
