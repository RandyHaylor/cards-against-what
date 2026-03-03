import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

function generateLobbyCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createLobby(db, player, deckId) {
  const code = generateLobbyCode();
  await setDoc(doc(db, "lobbies", code), {
    code: code,
    deckId: deckId,
    createdBy: player.id,
    createdAt: Date.now(),
    players: [{ id: player.id, name: player.name }],
    state: "lobby"
  });
  return { code };
}
