# Judge scorecard — ai-excited-01 iteration 2 (2026-11-16)

Brief's 5 criteria, in the judge's order (lexicographic: the first criterion
where two entries differ decides). Each candidate scored 0–2 per criterion.
All 7 candidates are rich AI-generated images, viewed at full size and at
300px (downscaled with PIL Lanczos). Sources (outside this repo):
`~/workspace/makefun/ai-excited-01-candidates/media-generation-cN-*.png`.

History: V1 "One Spark Lights a Galaxy" (procedural) scored 849832 micro
(84.98%), rank 750/846. V2 "The Last Watcher of a Dying Star" (procedural)
was resubmitted as round 2 and had NOT scored yet when this round was
picked. Top-10 line at pick time: ~970679 micro (97.07%). The measured
lesson from the top 10: the gap is MEDIUM richness, not concept — winners
are rich, detailed, photoreal/surreal images (ordinary scene + one
impossible thing + human reaction). This round therefore ships a rich
AI-generated image + a minimal copy program instead of another procedural
variant. Original concepts only — never copied from the leaderboard
(no diner black hole, no ant match, no desert whale).

| Cand | Title | C1 Excite | C2 Surprise | C3 Momentum | C4 Craft | C5 Reads 300px |
|---|---|---|---|---|---|---|
| C1 | The Night He Hooked the Moon | 2 | 2 | 2 | 2 | 2 |
| C2 | The Cat Who Unravelled the Moon | 2 | 2 | 2 | 2 | 2 |
| C3 | Shelving a Supernova | 1 | 1 | 1 | 2 | 1 |
| C4 | A Star in a Jam Jar | 2 | 1 | 1 | 2 | 1 |
| C5 | Watering a Planet | 1 | 2 | 1 | 2 | 1 |
| C6 | Forging a Star | 2 | 1 | 2 | 1 | 2 |
| C7 | Polishing the Moon | 2 | 2 | 1 | 2 | 2 |

## Per-candidate notes (what the eye actually saw)

- **C1** — Giant full moon over a glassy sea, a fisherman leaning back
  hard in a tiny rowboat, rod bent double, line arcing up to the moon, his
  face wide-eyed, mouth open, lit by moonlight. The hook dangles at the
  moon's lower edge. Awe + strain in one frame; at 300px the boat, the rod
  and the moon read instantly.
- **C2** — Ginger cat on a rooftop, paw raised, batting the moon like a
  yarn ball as it unravels into a sparkling trail of stars; chimney smoke,
  city rooftops below. Exquisite, but the dominant feeling is delight and
  charm — this judge rewards a jolt of energy/awe, and "cat + moon" is a
  familiar AI-art trope.
- **C3** — Librarian on a ladder shelving a miniature supernova between
  dusty books. Warm and clean, but the orb is small and reads as a glowing
  ring, not a supernova; calm, static, and the twist is unclear at 300px.
- **C4** — Child in a meadow holding up a jam jar with a tiny fallen star
  glowing inside, Milky Way above, wonder on the face. Beautiful and
  emotional, but the star reads as a small glow blob — "firefly in a jar"
  is familiar — and the composition is contemplative, not thrilling.
- **C5** — Elderly gardener watering a tiny glowing Earth sprouting from
  a flowerpot. Tender and fresh as an idea, but calm (no jolt) and the
  planet is tiny at 300px — the idea needs a second look.
- **C6** — Blacksmith striking a star on an anvil, sparks bursting up
  into constellations. Huge energy, but the star is a literal flat
  five-pointed star symbol — a cartoonish read that costs craft — and
  "forging a star" is a familiar poster idea.
- **C7** — Window washer on a skyscraper platform polishing the crescent
  moon with a squeegee, city lights far below. Fresh twist, reads cleanly
  at 300px, but the pose is static — little momentum.

## Head-to-heads (criteria 1–2 decide; C3+ only breaks ties)

- C1 vs C2: C1 tie 2–2, C2 tie 2–2, C3 tie 2–2, C4 tie 2–2, C5 tie 2–2
  on the numbers — the tiebreak is what C1 measures: the fisherman's
  straining body against an enormous moon is a bigger jolt of awe and
  energy than the cat's playful delight, and this brief's criterion 1
  ("a jolt of energy or a rush of awe") favours awe over charm. **C1 wins.**
- C1 vs C7: C1 tie, C2 tie, **C3 C1 wins 2–1** (bent rod + leaning body
  vs a static squeegee pose).
- C1 vs C6: C1 tie, **C2 C1 wins 2–1** (hooking the moon is a fresher
  twist than forging a star; C6's star is a literal symbol).
- C1 vs C4: **C1 C1 wins 2–1** on momentum alone (C4 is contemplative).
- C1 vs C3/C5: **C1 C1 wins 2–1** (calm entries lose to any image that
  makes you sit up).
- C1 wins or ties every head-to-head. No other candidate does.

## Pick

**C1 — "The Night He Hooked the Moon"** is the entry (`entry.png`,
JPEG bytes under that name, 1024×683, 173,785 bytes, sha256
14745894ca5a0b4a7659d5e0a151154ba5d4cbcbbbf1cac19ddaa87cb09b6d83).
It is the only candidate that wins its head-to-heads on criterion 1
against the whole field, and it scores 2 on all five criteria.

## Verification

- Entry file: 1024×683, 173,785 bytes (< 1 MiB), JPEG magic FF D8 FF.
- Program: `main.ts` (Node 22 stdlib-only) copies `entry.png` with
  size/format/digest/dimension checks; two runs byte-identical
  (sha256 14745894ca5a0b4a7659d5e0a151154ba5d4cbcbbbf1cac19ddaa87cb09b6d83).
- 300px downscale check: fisherman + bent rod + giant moon + boat read
  instantly at 300×200.
- V2's score was still pending at pick time; this pick must beat V2's
  measured signal once V2 scores (V1: 849832 micro, rank 750).
