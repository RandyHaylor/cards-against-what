import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export async function joinLobby(db, lobbyCode, playerId, name) {
  const lobbySnap = await getDoc(doc(db, "lobbies", lobbyCode));
  if (!lobbySnap.exists()) {
    return { error: "Lobby not found" };
  }
  await setDoc(doc(db, "lobbies", lobbyCode, "players", playerId), { name });
  return { ok: true };
}
