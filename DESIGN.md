# Cards Against What — Game Design

## Status & Roadmap

App is feature-complete. Deck expansion in progress.

**Completed features:**
- Rejoin via URL params (`?code=XXXX&playerId=YYYY`) — auto-skips landing, reconnects to active game
- Sequential player IDs (1, 2, 3...) for easy rejoin URLs
- Host refresh warning (beforeunload) — warns host that refresh kills the game
- Pick-2 prompts — `"pick": 2` with 3 text segments, two blanks
- Modern CSS overhaul — mobile-first, consistent design system
- Discard UI redesign — tap-to-flag instead of drag
- Player Admin page shows rejoin links for all players

**In progress:**
- 500 more answer cards via 5-agent team (see `agent-team-answer-writing-plan.md`)

## Tech Stack

Firestore DB. Host game logic runs on player one's client. All player client logic in JS on static Firebase-hosted sites. Free Spark plan — no Cloud Functions, no billing.
No npm. No frameworks. No builds. Firebase CLI for deployment. Firebase SDK and XState loaded via CDN everywhere — dev and production identical.

## Game Flow

1. Player one creates a lobby — picks a deck, configures settings (or accepts defaults from settings json/schema)
2. Other players join the lobby using a code. Player IDs are sequential (1, 2, 3...)
3. Players mark themselves as ready. Player one starts the game when all players are ready.
   - Rejoining: URL with `?code=XXXX&playerId=YYYY` auto-skips landing, reconnects to active game
4. Deck is loaded (from cardsUrl), hands of `handSize` cards dealt to all players
5. Judge is selected (first of the rotation)
6. Prompt card drawn
7. Non-judge players pick their answer card(s) and optionally flag up to `freeDiscardsPerRound` cards for discard — within `roundTimerMin` if set. Judge may also flag discards during this time.
8. On submit: discard request and player answer submitted to server
9. Server processes all discard requests (every player, including judge), processes all answer submissions (non-judge only), then deals replacement cards to top up any hand below `handSize` — doesn't care why cards are missing
10. Judging: received answers assembled into a list and randomized. Judge sees submissions one at a time with arrow buttons and index counter. Non-judge players see "[judgeName] is reviewing submissions."
11. Judge picks a winner — within `judgingTimerMin` if set
12. Winner gets a point. All players see results: arrow view with winner highlighted, can browse all submissions.
13. Judge presses start next round. Non-judge players see "NEXT ROUND STARTED: [Join]" between arrows. Players are not forced out of review — they press join when ready.
14. Check: does anyone have `scoreToWin` points? If yes, game over.
15. Rotate judge per `judgeMode`, next round (back to 6)

## Architecture

- Host and client are each driven by an XState state machine (see `data/server-state-flow.json` and `data/client-state-flow.json`)
- Each state has enter/during/exit logic in its own module
- Action logic lives in `server/actions.js` and `player/actions.js`, not inline in machine.js. Actions are passthrough functions to the sync controller, reusable across states.
- Host logic runs on player one's browser. Host code ships in every client but only activates for the player flagged as host.
- Server holds ALL game state in memory (XState context) — not in Firestore. This includes an array of all player objects, including player one.
- Each player object contains a `players` array: `[{ name, score, ready, isHost }]`. Single source of truth for who's playing, scores, and readiness. `ready` is dual-purpose: "ready to start" in lobby, "has submitted" during gameplay.
- Player-writable fields live in a `clientUpdates` container: `{ playerReady, submission, discardRequests }`. Clear boundary — server writes everything else, players only write inside `clientUpdates`.
- `playerSyncController.js` owns all sync between client and server. It hides whether updates go via Firestore (non-host) or directly to the server actor (host). Neither the server machine nor client/player code imports Firebase — only the sync controller does.
- Firestore is a sync layer, not a state store. Server serializes player objects directly to player docs for players 2+. Player one doesn't need a Firestore doc — they ARE the server.
- If host disconnects, game ends. Acceptable — players are physically together.

## Server States

```
lobby
  enter: create lobby doc, set settings, generate join code
  during: process player joins, update player list to all players, validate names
  exit: player one starts game → load deck, deal hands to all players, select first judge

round-active
  enter: draw prompt, assign judge, update all player game states, start round timer if set
  during: server waits for exit condition
  exit: all non-judge players submitted OR timer expired → single read of all submissions,
        process all discard requests (every player including judge),
        process all answer submissions (non-judge only),
        deal replacement cards to top up any hand below handSize,
        assemble and randomize submission list

judging
  enter: send randomized submission list to judge, notify non-judge players
  during: judge is working client-side, server waits for pick
  exit: judge picks winner OR judging timer expired → award point, update scores

judged
  enter: send results to all players (winner highlighted, full list available)
  during: players browsing results client-side, server waits
  exit: judge presses start next round → rotate judge
  [scoreToWin reached?] → game-over

game-over
  enter: send final scores to all players
```

## Client States

```
landing
  enter: display create/join options. Check URL for rejoin params (?code=XXXX&playerId=YYYY)
  during: player configuring settings or entering join code
  exit: player creates or joins lobby. On rejoin params: skip landing, auto-reconnect to game

lobby
  enter: display join code, player list, settings
  during: player list updates as others join
  exit: game started notification received

picking
  enter: display prompt, display hand, enable discard flagging and answer selection
  during: player toggling discard flags, selecting answer card(s). Judge can flag discards but has no answer to select.
  exit: player submits answer and discard flags (non-judge). Judge discard flags submitted when round closes.

submitted
  enter: show waiting message
  during: waiting
  exit: judging state received from server

judging-waiting (non-judge)
  enter: display "[judgeName] is reviewing submissions"
  during: waiting
  exit: results received from server

judging-active (judge)
  enter: display submission list with arrows, index counter
  during: judge cycling through submissions
  exit: judge picks winner

post-judging
  enter: display results with arrows, winner highlighted
  during: all players can browse submissions
  exit: new round notification received → show join button

next-round-ready
  enter: display join button between arrows, keep review available
  during: player can still browse previous results
  exit: player presses join

game-over
  enter: display final scores, winner announcement
```

## Firestore Structure

```
lobbies/{code}
  createdBy, createdAt          ← minimal signpost, server creates on lobby creation

lobbies/{code}/players/{playerId}
  (serialized player object)    ← same shape as server's in-memory player object
  includes: players: [{ name, score, ready, isHost }]  ← one list for lobby display, scoreboard, and readiness
  includes: clientUpdates: { playerReady, submission, discardRequests }  ← player-writable zone
```

- Server creates a minimal lobby doc as a signpost for joining players. Joining players check it exists, then write their own doc. Server watches the players collection for new joins.
- Players only listen (onSnapshot) to their own doc — never the lobby doc, never other players' docs.
- Server clears player submission/discard fields when writing the next round's state. Each round starts clean.
- Player docs are direct serializations of the server's player objects. No transformation.
- Only players 2+ get Firestore docs. Player one is the server — no doc needed.
- Server-side: the sync controller feeds player events into the machine (from onSnapshot for remote players, from direct calls for the host). The machine doesn't know the source.
- Client-side: player actions call the sync controller to push updates. The sync controller decides how to deliver them.
- Lobby doc is a signpost — joining players check it exists. Server deletes it on game end.

## Deck & Cards

- Deck loaded from cardsUrl (GitHub raw). Not stored in Firestore.
  - Golden Girls deck: `https://raw.githubusercontent.com/RandyHaylor/cards-against-what/master/project/data/decks/golden-girls-cards.json`
  - Format: `{ deckId, prompts: [{ id, text: [...strings], pick }], answers: [{ id, text }] }`. Prompt `text` is an array of string segments — answers get inserted between segments, then appended to the end. `pick` is the number of answer cards needed (1 or 2). Pick-2 prompts have 3 text segments with two blanks.
  - Current deck: 137 prompts (including 7 pick-2), 500 answers. Expansion to ~1000 answers planned.
  - TODO: Add tests for deck exhaustion — what happens when answer cards run out mid-game? Shuffle discards back in, or end game?
- Settings are validated against `game-settings-schema.json` on START_GAME. Missing fields get defaults from the schema. Out-of-range values get clamped. The schema and settings object are passed in the START_GAME event.

## Settings (from game-settings-schema.json)

- **judgeMode**: rotating (string, only one mode for now)
- **handSize**: default 10, min 1, max 30
- **scoreToWin**: default 7, min 1, max 1000
- **roundTimerMin**: default 0 (no timer), min 0, max 60
- **judgingTimerMin**: default 0 (no timer), min 0, max 60
- **freeDiscardsPerRound**: default 2, min 0, max 30

## Testing

- Tests are HTML files containing JS that run against live Firestore — no mocks, no emulators
- Puppeteer (installed globally) runs them headless from the terminal via `node project/test/run.js` (or pass a different test file as argument)
- Tests tell a multiplayer story: create lobby, join, play rounds, score, win
- Same CDN-loaded Firebase SDK as production — no environment differences

## Content & Reference Files

- `project/data/decks/golden-girls-cards.json` — the card deck (137 prompts, 500 answers)
- `golden-girls-themed-content-docs/` — characters, quotes, time period context, card game rules
- `.claude/skills/being-funny/` — comedy writing techniques and humor theory
- `.claude/skills/cards-against-what-deck-generator/` — Randy's prompt style preferences
- `new-prompts.md` — all 37 accepted new prompts
- `favorite-cards.md` — Randy's personally written/modified prompts
- `agent-team-answer-writing-plan.md` — 5-agent team plan for 500 new answer cards
