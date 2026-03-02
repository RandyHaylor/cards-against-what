Development Roadmap (Single-File Spec) — Lightweight RTDB Multiplayer + Isolated Host Shell
0) Non-goals / Constraints
- no AI features
- no security focus (can add anon auth + rules later)
- all logic runs in frontend
- Firebase RTDB used as shared sync + persistence
- avoid reactive-domino architecture:
    - PlayerSession has no host logic
    - HostShell isolated + imperative engine
    - Firebase listeners centralized in transport modules
1) Product Shape
Landing page:
  - gameSelect dropdown (supports multiple games)
  - deckSelect dropdown (themes/decks per game)
  - Start Lobby button
  - Join Lobby input + button
  - optional checkbox: "Open Host Tools"

PlayerSession:
  - identical UI for all players (host can embed it)
  - players write only their own event log node
  - players read only meta + their own playerView

HostShell:
  - top toolbar (host controls)
  - below: embedded PlayerSession (optional join toggle)
  - host listens to playerEvents, writes playerView + meta
2) Routes / Modes
/                       -> Landing
/lobby/{code}           -> PlayerSession(mode=player)
/host/{code}            -> HostShell(mode=host) + Embedded PlayerSession(mode=hostPlayer?) // join toggle
3) Firebase: RTDB Data Contract (authoritative)
3.1 Lobby root
/lobbies/{code}/meta:
  gameId
  deckId
  createdAt
  phase            // lobby|playing|locked|reveal|score|ended
  roundId
  lockId           // increments each lock
  leaderPlayerId
  currentPromptId
  hostClientId     // best-effort claim, no auth

/lobbies/{code}/playerView/{playerId}:
  ui:
    promptId
    hand[]                 // answers visible to this player
    canSubmit
    submitted
    revealData             // post-lock/reveal display
    score
    bannerMsg

/lobbies/{code}/playerEvents/{playerId}/{eventId}:
  type                     // join|ready|submit|leave (minimal)
  roundId
  lockId                   // optional
  payload                  // {name, ready, selectionIds[], ...}
  clientTs
3.2 Optional (later)
/lobbies/{code}/roster/{playerId}: {name, joinedAt}         // if you want a lighter roster node
/lobbies/{code}/admin/debug/...                             // dev introspection
4) Static Content (Games/Decks)
4.1 Catalog file (hosted as static JSON)
GameCatalog.json:
  games[]:
    gameId
    displayName
    decks[]:
      deckId
      displayName
      promptsUrl
      answersUrl
4.2 Runtime usage
Landing loads GameCatalog.json (fetch)
Host loads selected deck resources (fetch prompts + answers)
Players do NOT need deck files if playerView is authoritative
5) Lobby Code Strategy
GenerateLobbyCode():
  repeat:
    code = random4(alphanum_lower)
  until !exists(/lobbies/{code}/meta)
  return code
6) Landing Flows
6.1 Start Lobby
OnStartLobby(gameId, deckId, openHostTools):
  code = GenerateLobbyCode()
  hostClientId = guid()

  write /lobbies/{code}/meta = {
    gameId, deckId,
    createdAt: now(),
    phase: "lobby",
    roundId: 0,
    lockId: 0,
    leaderPlayerId: "",
    currentPromptId: "",
    hostClientId
  }

  if openHostTools:
    nav /host/{code}?join=1
  else:
    nav /lobby/{code}?join=1&host=1
6.2 Join Lobby
OnJoinLobby(code):
  nav /lobby/{code}
7) PlayerSession Module (Common, Reused Everywhere)
7.1 Identity
playerId:
  - generate once per (lobbyCode + browser profile)
  - store in localStorage: playerId:{code} = guidShort()
displayName:
  - store localStorage: playerName = "..."
7.2 Reads (subscriptions)
subscribe meta   = /lobbies/{code}/meta
subscribe myView = /lobbies/{code}/playerView/{playerId}
(optional) subscribe roster = /lobbies/{code}/playerView/* OR /roster/*
7.3 Writes (append-only, player-owned)
emitEvent(type, payload):
  eventId = pushId()
  write /lobbies/{code}/playerEvents/{playerId}/{eventId} = {
    type,
    roundId: meta.roundId,
    lockId: meta.lockId,
    payload,
    clientTs: now()
  }

OnEnterLobby():
  emitEvent("join", {name: displayName})

OnReadyToggle(readyBool):
  emitEvent("ready", {ready: readyBool})

OnSubmit(selectionIds[]):
  emitEvent("submit", {selectionIds})
  // immediate local UI disable allowed, but final truth comes from myView.ui fields
7.4 UI behavior (pure view)
render(meta, myView):
  - show phase/round/prompt via myView.ui.promptId
  - show hand via myView.ui.hand
  - submit enabled iff myView.ui.canSubmit && !myView.ui.submitted
  - reveal area driven by myView.ui.revealData
  - banner via myView.ui.bannerMsg
8) HostShell Module (Isolated)
8.1 Layout
HostShell:
  - fixed toolbar top (host controls)
  - below: Embedded PlayerSession (optional join toggle)
    - loads /lobby/{code} UI in "embedded mode"
8.2 Host “claim” (best-effort, no auth)
HostShellInit(code):
  hostClientId = localStorage.hostClientId or guid()
  subscribe meta

  if meta.hostClientId empty:
    attempt write meta.hostClientId = hostClientId (race acceptable)
  if meta.hostClientId != hostClientId:
    show "view-only host tools disabled" (optional)
9) Host Engine (Imperative State Machine)
9.1 Central principle
- host is the only writer of /meta and /playerView/*
- players write only /playerEvents/{playerId}/*
- host logic lives in one module: HostEngine
- no gameplay rules in UI watchers/components
9.2 Inputs collection (host listens)
subscribe playerEvents = /lobbies/{code}/playerEvents/* with child_added

OnPlayerEvent(playerId, event):
  - record event in memory per player (ring buffer)
  - optionally mirror roster to /roster/{playerId} on join
  - optionally update playerView.ui.bannerMsg or submitted status live
9.3 Minimal helper APIs (host-only)
GetPlayers():
  - derive from known playerIds seen in events OR from /playerView keys

BootstrapPlayer(playerId, name?):
  if !exists /playerView/{playerId}:
    write /playerView/{playerId}/ui = {
      promptId: "",
      hand: [],
      canSubmit: false,
      submitted: false,
      revealData: null,
      score: 0,
      bannerMsg: ""
    }

DealHand(deck, playerId, roundId):
  - deterministic if desired: seed = hash(code + playerId + roundId)
  - return N answers

DrawPrompt(deck, roundId):
  - deterministic if desired: seed = hash(code + roundId)
  - return promptId
10) Host Toolbar Actions (State Transitions)
10.1 Start Game / Begin Round
Action_StartOrNextRound():
  assert hostClaimed

  newRoundId = meta.roundId + 1
  promptId = DrawPrompt(deck, newRoundId)
  leaderId = RotateLeader(GetPlayers(), newRoundId)

  write meta:
    phase = "playing"
    roundId = newRoundId
    currentPromptId = promptId
    leaderPlayerId = leaderId
    // lockId unchanged

  for each playerId in GetPlayers():
    BootstrapPlayer(playerId)
    write /playerView/{playerId}/ui = {
      promptId: promptId,
      hand: DealHand(deck, playerId, newRoundId),
      canSubmit: true,
      submitted: false,
      revealData: null,
      bannerMsg: ""
    }
10.2 Lock Round
Action_LockRound():
  assert hostClaimed

  newLockId = meta.lockId + 1
  write meta:
    phase = "locked"
    lockId = newLockId

  submissions = CollectLatestSubmissions(roundId=meta.roundId)
  for each playerId:
    write /playerView/{playerId}/ui.canSubmit = false
    write /playerView/{playerId}/ui.submitted = submissions.has(playerId)
10.3 Reveal
Action_Reveal():
  assert hostClaimed

  submissions = CollectLatestSubmissions(roundId=meta.roundId)
  revealData = BuildReveal(submissions)  // format for UI

  write meta.phase = "reveal"
  for each playerId:
    write /playerView/{playerId}/ui.revealData = revealData
10.4 Score / Pick Winner (optional)
Action_SetWinner(winnerPlayerId):
  assert hostClaimed
  write meta.phase = "score"
  increment /playerView/{winner}/ui.score
  write bannerMsg for all
10.5 Reset Lobby (dev)
Action_ResetLobby():
  delete /lobbies/{code}    // simplest during development
11) Submission Collection (host-side, minimal)
CollectLatestSubmissions(roundId):
  for each playerId:
    find newest event in playerEvents[playerId] with:
      type == "submit" && event.roundId == roundId
    keep selectionIds
  return map playerId -> selectionIds
12) Embedded Host-as-Player Session
12.1 Why
- reuses identical PlayerSession UI/behavior
- host toolbar stays isolated
- supports future server-host: player view unchanged
12.2 Behavior
HostShell:
  toggleJoinAsPlayer (default on)
  if on:
    render embedded PlayerSession with same lobby code
  if off:
    embedded area shows placeholder ("host not participating")
13) Centralized Transport (Anti-domino enforcement)
PlayerTransport:
  - only place subscribing to meta + myView
  - only place writing playerEvents

HostTransport:
  - only place subscribing to meta + playerEvents
  - only place writing meta + playerView

UI components:
  - consume state via props/store
  - emit intents (submit, ready, lock, reveal) upward
  - NO direct Firebase access
14) Minimal Testing Plan (Single Machine)
1) open / in tab A
2) Start Lobby -> /host/{code}?join=1
3) open /lobby/{code} in tab B (or incognito)
4) validate:
   - join event appears
   - host bootstraps playerView
   - submit from tab B shows in reveal after lock
5) toggle host join off/on to ensure embedded session optional
15) Later Upgrade Path (Optional)
- add Firebase Anonymous Auth + RTDB rules:
    players can only write /playerEvents/{uid}
    host can write /meta and /playerView/*
- move HostEngine to server-side (Cloud Run / Functions):
    keep exact same DB contract
    HostShell becomes admin UI only
16) Deliverables Checklist (Order)
[ ] Static Hosting: Landing + routes
[ ] GameCatalog.json + deck JSON assets
[ ] RTDB connection + minimal CRUD helpers
[ ] PlayerSession UI (join/ready/hand/submit/reveal)
[ ] PlayerTransport (meta+myView reads, events writes)
[ ] HostShell UI (toolbar + embedded PlayerSession)
[ ] HostTransport (meta read, playerEvents listen, meta/playerView writes)
[ ] HostEngine (round transitions, deal/prompt, lock+reveal)
[ ] End-to-end test with 2 tabs