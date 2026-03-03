import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export async function joinLobby(db, lobbyCode, playerId, name) {
  const lobbySnap = await getDoc(doc(db, "lobbies", lobbyCode));
  if (!lobbySnap.exists()) {
    return { error: "Lobby not found" };
  }
  await setDoc(doc(db, "lobbies", lobbyCode, "players", playerId), { name });
  return { ok: true };
}

export function setPlayerReady(db, lobbyCode, playerId, isHost, serverActor) {
  if (isHost) {
    serverActor.send({ type: "PLAYER_READY", playerId });
  } else {
    updateDoc(doc(db, "lobbies", lobbyCode, "players", playerId), {
      "clientUpdates.playerReady": true,
    });
  }
}
