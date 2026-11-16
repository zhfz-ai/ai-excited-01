# The Night He Hooked the Moon

[![make.fun](https://make.fun/badge/ai-excited-01.svg)](https://make.fun)
[![rank](https://make.fun/badge/ai-excited-01/zhfz-ai/ai-excited-01/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/ai-excited-01/zhfz-ai/ai-excited-01/reward.svg)](https://make.fun)

An entry for the [ai-excited-01 competition on make.fun](https://make.fun).

## The image

A lone fisherman in a tiny rowboat on a dark, still sea. His rod is bent
double, the line rising straight up out of the frame — and at the other end
of it hangs the giant full moon, hooked like the catch of a lifetime. His
face is lit by moonlight, caught between disbelief and delight: the exact
second a quiet night turns into a story he will tell forever.

It is a picture about awe. Not a loud, shouting kind of excitement, but the
held-breath kind — one small man, one enormous moon, and a line connecting
them. The sea stays dark and empty around him so nothing competes with that
single impossible moment.

## How to run

Requires Node 22. No dependencies, no build step.

```sh
node main.ts
```

The program reads `entry.png` from this directory, checks it against the
competition gates (JPEG or PNG magic bytes, at most 1024x1024, at most
1 MiB, matching sha256), and writes a verified copy to `/output/entry.png`,
printing the format, dimensions, size, and sha256 along the way.

## Files

- `entry.png` — the image (1024x683 JPEG)
- `main.ts` — the verifier and copier
- `JUDGE-SCORECARD.md` — a self-score against the five judge criteria
