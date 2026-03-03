import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  writeBatch,
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export function createSyncController(db) {
  let serverActor = null;

  return {
    setServerActor(actor) {
      serverActor = actor;
    },

    createLobby(lobbyCode) {
      return setDoc(doc(db, "lobbies", lobbyCode), {
        createdAt: Date.now(),
      });
    },

    watchPlayers(lobbyCode, sendBack) {
      const unsub = onSnapshot(
        collection(db, "lobbies", lobbyCode, "players"),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              sendBack({
                type: "PLAYER_JOINED",
                playerId: change.doc.id,
                name: change.doc.data().name,
              });
            }
            if (change.type === "modified") {
              const data = change.doc.data();
              if (data.clientUpdates?.playerReady) {
                sendBack({
                  type: "PLAYER_READY",
                  playerId: change.doc.id,
                });
              }
            }
          });
        }
      );
      return () => unsub();
    },

    syncPlayerDocs(lobbyCode, players) {
      const batch = writeBatch(db);
      for (const player of players) {
        if (player.isHost) continue;
        batch.set(
          doc(db, "lobbies", lobbyCode, "players", player.id),
          player
        );
      }
      return batch.commit();
    },

    async joinLobby(lobbyCode, playerId, name) {
      const lobbySnap = await getDoc(doc(db, "lobbies", lobbyCode));
      if (!lobbySnap.exists()) {
        return { error: "Lobby not found" };
      }
      await setDoc(doc(db, "lobbies", lobbyCode, "players", playerId), { name });
      return { ok: true };
    },

    setPlayerReady(lobbyCode, playerId) {
      if (serverActor) {
        serverActor.send({ type: "PLAYER_READY", playerId });
      } else {
        updateDoc(doc(db, "lobbies", lobbyCode, "players", playerId), {
          "clientUpdates.playerReady": true,
        });
      }
    },

    watchMyDoc(lobbyCode, playerId, callback) {
      return onSnapshot(
        doc(db, "lobbies", lobbyCode, "players", playerId),
        (snap) => {
          if (snap.exists()) {
            callback(snap.data());
          }
        }
      );
    },
  };
}
