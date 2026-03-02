// HostTransport — centralized Firebase access for the host side.
//   Reads:  meta, playerEvents
//   Writes: meta, playerView
// Nothing else in the app touches these paths for host concerns.

import { db } from '../firebase-init.js';
import { ref, onValue, set, update, get } from 'firebase/database';

export class HostTransport {
  constructor(code) {
    this.code = code;
    this._unsubs = [];
  }

  // ── Reads ──────────────────────────────────

  subscribeMeta(cb) {
    const unsub = onValue(ref(db, `lobbies/${this.code}/meta`), s => cb(s.val()));
    this._unsubs.push(unsub);
    return unsub;
  }

  subscribePlayerEvents(cb) {
    const unsub = onValue(ref(db, `lobbies/${this.code}/playerEvents`), s => {
      const all = s.val();
      if (!all) { cb([]); return; }
      const flat = [];
      for (const [playerId, events] of Object.entries(all)) {
        for (const [eventId, evt] of Object.entries(events)) {
          flat.push({ playerId, eventId, ...evt });
        }
      }
      cb(flat);
    });
    this._unsubs.push(unsub);
    return unsub;
  }

  // ── Writes ─────────────────────────────────

  async createLobby(meta) {
    await set(ref(db, `lobbies/${this.code}/meta`), meta);
  }

  async writeMeta(data) {
    await update(ref(db, `lobbies/${this.code}/meta`), data);
  }

  async writePlayerView(playerId, uiData) {
    await set(ref(db, `lobbies/${this.code}/playerView/${playerId}/ui`), uiData);
  }

  async writeRoster(playerId, data) {
    await set(ref(db, `lobbies/${this.code}/roster/${playerId}`), data);
  }

  // ── One-shot queries ───────────────────────

  async lobbyExists() {
    const snap = await get(ref(db, `lobbies/${this.code}/meta`));
    return snap.exists();
  }

  // ── Cleanup ────────────────────────────────

  destroy() {
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
  }
}
