import { setup, assign, fromCallback } from "https://esm.sh/xstate@5";

// TODO: Once live, any new game created also looks at existing lobby docs,
// grabs player 1 last update timestamp for each, deletes that lobby doc
// if timestamp is over 48 hours old.
// DO NOT DO THIS UNTIL I EXPLICITLY SAY TO.
function generateLobbyCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildPlayerState(id, name, isHost) {
  return {
    id: id,
    name: name,
    isHost: isHost,
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

function buildPlayerList(players) {
  return players.map((p) => ({
    name: p.name,
    score: 0,
    ready: p.clientUpdates.playerReady,
    isHost: p.isHost,
  }));
}

export const serverMachine = setup({
  actors: {
    watchPlayersCollection: fromCallback(({ input, sendBack }) => {
      return input.syncController.watchPlayers(input.lobbyCode, sendBack);
    }),
  },
  actions: {
    createLobby: ({ context }) => {
      context.syncController.createLobby(context.lobbyCode);
    },
    addPlayerToContext: assign({
      players: ({ context, event }) => {
        const player = buildPlayerState(
          event.playerId,
          event.name,
          event.isHost || false
        );
        const allPlayers = [...context.players, player];
        const playerList = buildPlayerList(allPlayers);
        return allPlayers.map((p) => ({ ...p, players: playerList }));
      },
    }),
    setPlayerReady: assign({
      players: ({ context, event }) => {
        const updated = context.players.map((p) => {
          if (p.id === event.playerId) {
            return {
              ...p,
              clientUpdates: { ...p.clientUpdates, playerReady: true },
            };
          }
          return p;
        });
        const playerList = buildPlayerList(updated);
        return updated.map((p) => ({ ...p, players: playerList }));
      },
    }),
    syncPlayerDocs: ({ context }) => {
      context.syncController.syncPlayerDocs(context.lobbyCode, context.players);
    },
  },
}).createMachine({
  id: "server",
  initial: "lobby",
  context: ({ input }) => ({
    syncController: input.syncController,
    lobbyCode: input.lobbyCode || generateLobbyCode(),
    deckId: input.deckId || "",
    players: [],
  }),
  states: {
    lobby: {
      entry: "createLobby",
      invoke: {
        src: "watchPlayersCollection",
        input: ({ context }) => ({
          syncController: context.syncController,
          lobbyCode: context.lobbyCode,
        }),
      },
      on: {
        ADD_PLAYER: {
          actions: ["addPlayerToContext", "syncPlayerDocs"],
        },
        PLAYER_JOINED: {
          actions: ["addPlayerToContext", "syncPlayerDocs"],
        },
        PLAYER_READY: {
          actions: ["setPlayerReady", "syncPlayerDocs"],
        },
      },
    },
  },
});
