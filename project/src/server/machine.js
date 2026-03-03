import { setup, assign, fromCallback } from "https://esm.sh/xstate@5";
import {
  createLobby,
  syncAllPlayerDocs,
  addPlayer,
  markPlayerReady,
  allPlayersReady,
} from "./actions.js";

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

export const serverMachine = setup({
  actors: {
    watchPlayersCollection: fromCallback(({ input, sendBack }) => {
      return input.syncController.watchPlayers(input.lobbyCode, sendBack);
    }),
  },
  guards: {
    allPlayersReady: ({ context }) => allPlayersReady(context.players),
  },
  actions: {
    createLobby: ({ context }) => {
      createLobby(context.syncController, context.lobbyCode);
    },
    addPlayerToContext: assign({
      players: ({ context, event }) =>
        addPlayer(context.players, event.playerId, event.name, event.isHost || false),
    }),
    setPlayerReady: assign({
      players: ({ context, event }) =>
        markPlayerReady(context.players, event.playerId),
    }),
    syncPlayerDocs: ({ context }) => {
      syncAllPlayerDocs(context.syncController, context.lobbyCode, context.players);
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
        START_GAME: {
          guard: "allPlayersReady",
          target: "roundActive",
        },
      },
    },
    roundActive: {
    },
  },
});
