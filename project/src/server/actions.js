import { doc, setDoc, writeBatch, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export function createLobbyDoc(db, lobbyCode) {
  return setDoc(doc(db, "lobbies", lobbyCode), {
    createdAt: Date.now(),
  });
}

export function syncAllPlayerDocs(db, lobbyCode, players) {
  const batch = writeBatch(db);
  for (const player of players) {
    if (player.isHost) continue;
    batch.set(
      doc(db, "lobbies", lobbyCode, "players", player.id),
      player
    );
  }
  return batch.commit();
}
