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

// -- Round setup --

export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealHands(players, answerCards, handSize) {
  let cardIndex = 0;
  const updated = players.map((p) => {
    const hand = answerCards.slice(cardIndex, cardIndex + handSize);
    cardIndex += handSize;
    return { ...p, hand };
  });
  const remainingCards = answerCards.slice(cardIndex);
  return { players: updated, remainingAnswers: remainingCards };
}

export function assignJudge(players, judgeIndex) {
  const playerList = buildPlayerList(players);
  return players.map((p, i) => ({
    ...p,
    isJudge: i === judgeIndex,
    players: playerList,
  }));
}

export function startRound(players, prompt) {
  const playerList = buildPlayerList(players);
  return players.map((p) => ({
    ...p,
    phase: "round-active",
    currentPrompt: prompt,
    message: "",
    players: playerList,
    clientUpdates: {
      playerReady: false,
      submission: null,
      discardRequests: null,
    },
  }));
}
