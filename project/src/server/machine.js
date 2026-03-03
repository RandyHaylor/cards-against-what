import { setup, assign, fromCallback } from "https://esm.sh/xstate@5";
import { createLobbyDoc, syncAllPlayerDocs } from "./actions.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
    submissions: null,
    discardRequests: null,
    message: "",
  };
}

export const serverMachine = setup({
  actors: {
    watchForPlayerJoins: fromCallback(({ input, sendBack }) => {
      const unsub = onSnapshot(
        collection(input.db, "lobbies", input.lobbyCode, "players"),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              sendBack({
                type: "PLAYER_JOINED",
                playerId: change.doc.id,
                name: change.doc.data().name,
              });
            }
          });
        }
      );
      return () => unsub();
    }),
  },
  actions: {
    createLobby: ({ context }) => {
      createLobbyDoc(context.db, context.lobbyCode);
    },
    addPlayerToContext: assign({
      players: ({ context, event }) => {
        const player = buildPlayerState(
          event.playerId,
          event.name,
          event.isHost || false
        );
        const allPlayers = [...context.players, player];
        const playerList = allPlayers.map((p) => ({ name: p.name, score: 0, ready: false }));
        return allPlayers.map((p) => ({ ...p, players: playerList }));
      },
    }),
    syncPlayerDocs: ({ context }) => {
      syncAllPlayerDocs(context.db, context.lobbyCode, context.players);
    },
  },
}).createMachine({
  id: "server",
  initial: "lobby",
  context: ({ input }) => ({
    db: input.db,
    lobbyCode: input.lobbyCode || generateLobbyCode(),
    deckId: input.deckId || "",
    players: [],
  }),
  states: {
    lobby: {
      entry: "createLobby",
      invoke: {
        src: "watchForPlayerJoins",
        input: ({ context }) => ({
          db: context.db,
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
      },
    },
  },
});
