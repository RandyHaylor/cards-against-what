# Cards Against What

Cards Against Humanity clone for mobile web on top of Firebase.
Firestore DB. Server host logic in Cloud Functions. Light player client logic in JS on static Firebase-hosted sites.
No npm. No frameworks. No builds. Firebase CLI for deployment. Firebase SDK and XState loaded via CDN everywhere — dev and production identical.

## Architecture

- Server and client are each driven by an XState state machine (see `data/server-state-flow.json` and `data/client-state-flow.json`)
- Each state has enter/during/exit logic in its own module
- Server (Cloud Functions) is the host — no player is the host
- Player one creates the lobby and can start the game, but is otherwise just a player
- Each player has one Firestore document. Players only listen (onSnapshot) to their own doc — never the lobby doc, never other players' docs
- Server writes all updates to each player's doc, batching when possible (deal cards + set prompt + update phase = one write)
- onSnapshot fires only when that specific player's doc is updated by the server

## Testing

- Tests are HTML files containing JS that run against live Firestore — no mocks, no emulators
- Puppeteer (installed globally) runs them headless from the terminal
- Tests tell a multiplayer story: create lobby, join, play rounds, score, win
- Same CDN-loaded Firebase SDK as production — no environment differences

## Commandments

0. **Client app layer exists and is separate from GUI.** Game logic lives in plain JS modules with zero DOM awareness. Testable without any GUI. The GUI is a dumb skin. GUI knows nothing about Firestore or game rules.

1. **No reactive waterfalls.** Firestore subscriptions feed the client app layer, not UI components. No listener → component → cascade → logic-in-render-tree chains.

2. **All features work without a front end.** JS modules are written and tested BEFORE any HTML exists.

3. **Two state objects, never merged.** `playerGameState` (from Firestore) and `guiState` (for rendering) are fully separate. The app layer translates between them with well-named functions.

4. **Respect Firebase usage.** No live-updating on keystrokes or field changes. DB reads/writes happen on submit actions or proper hooks only.

5. **Git commits: single line message, no attribution.**

6. **Name functions after what they do in plain English.** If the design doc says "replaces discard-requested and submitted cards in player's hand," the function reads close to that.
