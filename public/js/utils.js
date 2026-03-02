export function generateLobbyCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function guid() {
  return crypto.randomUUID().split('-')[0];
}

export function getPlayerId(code) {
  const key = `playerId:${code}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = guid();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getPlayerName() {
  return localStorage.getItem('playerName') || '';
}

export function setPlayerName(name) {
  localStorage.setItem('playerName', name);
}
