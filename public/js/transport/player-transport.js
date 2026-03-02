// PlayerTransport — centralized Firebase access for the player side.
//   Reads:  meta, myView
//   Writes: playerEvents
// Nothing else in the app touches these paths for player concerns.

import { db } from '../firebase-init.js';
import { ref, onValue, push, set, get } from 'firebase/database';

export class PlayerTransport {
  constructor(code, playerId) {
    this.code = code;
    this.playerId = playerId;
    this._unsubs = [];
  }

  // ── Reads ──────────────────────────────────

  subscribeMeta(cb) {
    const unsub = onValue(ref(db, `lobbies/${this.code}/meta`), s => cb(s.val()));
    this._unsubs.push(unsub);
    return unsub;
  }

  subscribeMyView(cb) {
    const unsub = onValue(
      ref(db, `lobbies/${this.code}/playerView/${this.playerId}`),
      s => cb(s.val())
    );
    this._unsubs.push(unsub);
    return unsub;
  }

  // ── Writes ─────────────────────────────────

  async emitEvent(type, payload) {
    const newRef = push(ref(db, `lobbies/${this.code}/playerEvents/${this.playerId}`));
    await set(newRef, { type, payload, clientTs: Date.now() });
  }

  subscribeRoster(cb) {
    const unsub = onValue(ref(db, `lobbies/${this.code}/roster`), s => cb(s.val()));
    this._unsubs.push(unsub);
    return unsub;
  }

  // ── One-shot queries ───────────────────────

  async getMeta() {
    const snap = await get(ref(db, `lobbies/${this.code}/meta`));
    return snap.val();
  }

  // ── Cleanup ────────────────────────────────

  destroy() {
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
  }
}
