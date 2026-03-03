# Abandoned: Distributed Server Plan

Explored and liked but shelved — too much complexity for a card game.

## Summary
- All clients run server code
- Judge's client acts as server each round
- Single lobby doc, all player state inside
- Judge failover: next in rotation gets "Take Over" button after distance × 30s
- No Cloud Functions, no single host

## Why abandoned
- Adds distributed systems complexity to a casual party game
- Judge-as-server rotation, failover timers, claim logic
- Cool but overkill

## Key ideas worth keeping
- Single lobby doc (efficient reads)
- onSnapshot on one doc per player
- Judge rotation naturally distributes responsibility
- Cascading delay formula: distance_in_rotation × 30s
