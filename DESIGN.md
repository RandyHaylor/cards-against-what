# Cards Against What — Game Design

## Game Flow

1. Player one creates a lobby — picks a deck, configures settings (or accepts defaults from settings json/schema)
2. Other players join the lobby using a code
3. Players mark themselves as ready. Player one starts the game when all players are ready.
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
  enter: display create/join options
  during: player configuring settings or entering join code
  exit: player creates or joins lobby

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

- Server holds all game state in memory (XState context), including all player objects in an array.
- Each player object has a `players` list with `{ name, score, ready, isHost }` for every player. `ready` means "ready to start" in lobby, "submitted answer" during gameplay.
- Player-writable fields are isolated in `clientUpdates`: `{ playerReady, submission, discardRequests }`. Server writes everything else.
- `playerSyncController.js` owns all sync between client and server. Host updates go directly to the server actor (same runtime). Non-host updates write to Firestore. Neither the server machine nor client code imports Firebase — only the sync controller does. This abstracts the transport layer, making it portable to other platforms.
- Server-side: the sync controller feeds player events into the machine (from onSnapshot for remote players, from direct calls for the host). The machine doesn't know the source.
- Client-side: player actions call the sync controller to push updates. The sync controller decides how to deliver them.
- Lobby doc is a signpost — joining players check it exists. Server deletes it on game end.
- Player docs are direct serializations of the server's player objects. No transformation.
- Only players 2+ get Firestore docs. Player one is the server — no doc needed.
- Players listen (onSnapshot) to their own doc only. Never the lobby doc, never other players' docs.
- Players write to their own doc for submissions and discard flags. Server reads, processes, then writes clean state back — each round starts fresh.
- Deck loaded from cardsUrl (GitHub raw). Not stored in Firestore.
  - Golden Girls deck: `https://raw.githubusercontent.com/RandyHaylor/cards-against-what/master/project/data/decks/golden-girls-cards.json`
  - Format: `{ deckId, prompts: [{ id, text: [...strings], pick }], answers: [{ id, text }] }`. Prompt `text` is an array of string segments — answers get inserted between segments, then appended to the end. `pick` is the number of answer cards needed.
  - TODO: Add tests for deck exhaustion — what happens when answer cards run out mid-game? Shuffle discards back in, or end game?

## Settings (from game-settings-schema.json)

- **judgeMode**: rotating (string, only one mode for now)
- **handSize**: default 10, min 1, max 30
- **scoreToWin**: default 7, min 1, max 1000
- **roundTimerMin**: default 0 (no timer), min 0, max 60
- **judgingTimerMin**: default 0 (no timer), min 0, max 60
- **freeDiscardsPerRound**: default 2, min 0, max 30
