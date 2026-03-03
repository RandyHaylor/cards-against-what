# Agent Team: Answer Card Writers

## Overview
5 agents, each writing 4 answer cards per assigned prompt = ~500 new answer cards total.

## Agent Assignments

| Agent | Prompts | Output File |
|-------|---------|-------------|
| writer-1 | 1-27 | new-answers-agent-1.json |
| writer-2 | 28-55 | new-answers-agent-2.json |
| writer-3 | 56-82 | new-answers-agent-3.json |
| writer-4 | 83-110 | new-answers-agent-4.json |
| writer-5 | 111-137 | new-answers-agent-5.json |

All output files live in `C:\cards-against-what\` (project root).

## Files Each Agent Must Read

### Skills
- `C:\cards-against-what\.claude\skills\being-funny\SKILL.md`
- `C:\cards-against-what\.claude\skills\cards-against-what-deck-generator\SKILL.md`

### Content Docs
- `C:\cards-against-what\golden-girls-themed-content-docs\characters.md`
- `C:\cards-against-what\golden-girls-themed-content-docs\golden-girls-quotes.md`
- `C:\cards-against-what\golden-girls-themed-content-docs\time-period-related-things-to-include.md`
- `C:\cards-against-what\golden-girls-themed-content-docs\golden-girls-card-game.md`

### Dedup Sources
- `C:\cards-against-what\project\data\decks\golden-girls-cards.json` (the "answers" array — 500 existing cards, do not duplicate)
- All 5 agent output files (check the other agents' work periodically to avoid cross-team duplicates):
  - `C:\cards-against-what\new-answers-agent-1.json`
  - `C:\cards-against-what\new-answers-agent-2.json`
  - `C:\cards-against-what\new-answers-agent-3.json`
  - `C:\cards-against-what\new-answers-agent-4.json`
  - `C:\cards-against-what\new-answers-agent-5.json`

## Answer Style Guide

Each batch of 4 answers should vary in style. Use these 8 types as a reference — not every batch needs all 8, but no batch should be all one type:

1. **Dry, anti-glamorous object** — "Sensible underwear"
2. **Object that implies a story** — "A compromising Polaroid"
3. **Person described by role** — "The pharmacist who recognizes Blanche by name"
4. **Timeline story** — "An evening that started with dinner and ended with bail money"
5. **Simple absurd pairing** — "Prune juice cocktails"
6. **Abstract concept, two words** — "Weaponized Southern charm"
7. **Deadpan two-word object** — "Fiber supplements"
8. **Concrete with vivid detail** — "The 3 year old mustard Blanche swears still smells like her ex"
9. **Metaphorical object** — "a metaphorical peach"
10. **Mundane with specific amount** — "$25 towards rent"
11. **Object with attitude/context** — "a protest sign reading 'yeah, we take singles'"
12. **Oddly specific household item** — "the only curling iron that doesn't trip the circuit breaker"

## Writing Rules

- At least 3 of 4 must be CONCRETE (a specific person, thing, object, event, place). Max 1 of 4 may be abstract.
- Max 1 of 4 may include a direct show character reference (Sophia, Blanche, Dorothy, Rose, Stan, etc.). The other 3 should stand on their own as things, people, places, events.
- Each answer must work grammatically as a noun or noun phrase.
- Keep answers era-appropriate (1985-1992 Miami). No internet, no cell phones, no modern references.
- Use comedic devices from the being-funny skill.
- Include descriptive words that paint a picture.
- Do NOT duplicate any of the existing 500 answer cards OR any answers written by other agents. Check the original deck AND all 5 agent output files before writing each batch.
- Vary the length and style across the 4 answers. A batch of 4 long-form answers is as bad as a batch of 4 two-word answers.

## Answer Writing Philosophy

The POINT is to make answers that are "too close to the actual show's real canon." Each answer should read like a real Golden Girls plot point, character detail, or scene. Each answer should make sense as a logical and canonical fill-in for the prompt it was written for.

When these canonical answers get drawn for unrelated prompts, the mismatch creates the comedy. The skills and content docs exist to align the agent with the show's voice, era, and humor — not to make the answers generically funny. Funny emerges from specificity and canon-accuracy colliding with wrong contexts.

## JSON Format

```json
[
  {
    "prompt_id": "1",
    "prompt_text": "Picture it: Sicily, 1922. A young peasant girl discovers ___.",
    "answers": [
      "answer 1",
      "answer 2",
      "answer 3",
      "answer 4"
    ]
  },
  "// ACTIVE BLOCK INSTRUCTIONS: For each prompt, write 4 answer cards that would be LOGICAL, CANONICAL answers to this specific prompt — as if this were an actual scene from The Golden Girls. The goal is answers so on-the-nose for THIS prompt that they become hilariously wrong when drawn for OTHER prompts. At least 3 of 4 must be CONCRETE. Max 1 of 4 may be abstract. Max 1 of 4 may reference a show character by name. Vary style across the 12 types in the style guide (dry object, implies-a-story, person-by-role, timeline, absurd pairing, abstract concept, deadpan, vivid detail, metaphorical, mundane-with-amount, object-with-attitude, oddly-specific-household). Check original 500 cards AND all 5 agent files for duplicates before writing. Each answer must work grammatically as a noun or noun phrase.",
  {
    "prompt_id": "2",
    "prompt_text": "Blanche's latest gentleman caller brought her ___ and she hasn't been the same since.",
    "answers": [
      "answer 1",
      "answer 2",
      "answer 3",
      "answer 4"
    ]
  }
]
```

## Critical File-Write Sequence

For each prompt, the agent MUST:
1. Delete the instruction comment from its previous position in the array
2. Write the instruction comment string to the JSON file at the end of the array — SAVE THE FILE
3. Only THEN write the new answer block after the comment — SAVE THE FILE

The comment is always immediately above the block currently being worked on. It is written and saved BEFORE the answer block is added. This ensures the instruction is in the agent's active working context at the moment of writing.
