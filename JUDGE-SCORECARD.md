# Judge scorecard — ai-excited-01 improvement round (2026-11-16)

Brief's 5 criteria, in the judge's order (lexicographic: the first criterion
where two entries differ decides). Each variant scored 0–2 per criterion.
All renders viewed at 1024px and at 300px (downscaled with PIL Lanczos).
Files: `out/variants/vN.png` (first pass) and `vNb.png` (after fixes).

| Variant | Title | C1 Excite | C2 Surprise | C3 Momentum | C4 Craft | C5 Reads 300px |
|---|---|---|---|---|---|---|
| V1 | One Spark Lights a Galaxy (baseline, already submitted) | 1 | 1 | 1 | 2 | 2 |
| V2 | The Last Watcher of a Dying Star | 2 | 2 | 2 | 2 | 2 |
| V3 | One Probe Into the Dark | 2 | 2 | 1 | 2 | 2 |
| V4 | The Night the Sky Caught Fire | 1 | 1 | 1 | 1 | 1 |
| V5 | Two Galaxies Collide, One Star Is Born | 2 | 1 | 1 | 1 | 1 |
| V6 | Riding the Light Home | 2 | 2 | 2 | 1 | 2 |

## Per-variant notes (what the eye actually saw)

- **V1** — Pretty golden spiral, clean render, but calm: a match lighting a
  galaxy is a gentle idea and the shaft reads a little like a wand. Already
  submitted once; the improvement round exists because this was not enough.
- **V2** — The biggest jolt in the set: a white-hot supernova core, four
  expanding shockwave rings and 46 debris streaks radiating across the
  frame. The twist is scale: one tiny astronaut on a lone asteroid, arm
  raised, watching a star die — the biggest death in the universe, watched
  by the smallest witness. Fixed in pass 2: the asteroid rim light was
  beaded dots; now a continuous golden rim. At 300px the blast, the rings
  and the asteroid all read instantly.
- **V3** — First pass was broken: additive halo glow tinted the hole brown
  and it read as a ringed planet. Fixed in pass 2 (hole re-blackened after
  the final glow, disc thickened with a third mid ring): now a true black
  void with a blazing accretion disc, photon ring, vertical jets and a cyan
  probe trail diving in. Loses to V2 only on C3: its symmetric composition
  is stately rather than bursting.
- **V4** — Beautiful aurora ribbons and a strong beam, but the calmest
  entry: the bottom third is dark cliff, the lighthouse lamp room washes
  out into the lamp glow (craft), and aurora + lighthouse is a familiar
  postcard. Raised horizon + taller tower in pass 2 helped, not enough.
- **V5** — Gorgeous gold + violet interlocking spirals with a blazing
  newborn star at the impact point. But at 300px the two galaxies tangle
  into one knot — the "collision" read weakens — and "two spirals" is a
  familiar space image; the birth twist is subtle. Rings dimmed in pass 2.
- **V6** — Huge diagonal energy: the comet tears across the frame and the
  tiny surfer (arms up, on the tail) is visible at full size. First pass
  the tail was a solid white wedge; pass 2 added gaps so it reads as gas.
  Loses to V2 on C4: the planet's ring is still a little neon-bright and
  the surfer vanishes at 300px (the comet itself still carries the read).

## Head-to-heads (criteria 1–2 decide; C3+ only breaks ties)

- V2 vs V3: C1 tie 2–2, C2 tie 2–2, **C3 V2 wins 2–1** (rings + streaks burst outward; V3 is symmetric/static).
- V2 vs V6: C1 tie, C2 tie, C3 tie 2–2, **C4 V2 wins 2–1** (clean rim + no neon artefacts).
- V2 vs V5: C1 tie, **C2 V2 wins 2–1** (tiny watcher vs a familiar two-spiral picture).
- V2 vs V1: **C1 V2 wins 2–1**. V2 vs V4: **C1 V2 wins 2–1**.
- V2 wins or ties every head-to-head. No other variant does.

## Pick

**V2 — "The Last Watcher of a Dying Star"** is the default (`VARIANT=2`,
the fallback when the env var is unset). It is the only variant scoring 2
on all five criteria, and it wins the most head-to-heads on criteria 1–2.

## Verification

- All 6 PNGs ≤ 1 MiB, 1024×1024 (largest: V1 727,455 B; V2 585,348 B).
- Determinism: default render run twice, byte-identical (see STATE file).
- 300px downscale check: V2, V3, V6 read instantly; V2's blast + asteroid
  are the clearest subject + story at small size.
