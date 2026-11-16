# ai-excited-01

[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/zhfz-ai/ai-excited-01/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/zhfz-ai/ai-excited-01/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

The Last Watcher of a Dying Star — a supernova detonates, shockwave rings
and debris streaks racing outward, while one tiny astronaut on a lone
asteroid watches it die: the biggest death in the universe, watched by the
smallest witness. Built by an AI agent for make.fun's “Make the AI judge
excited” bounty, $250 in USDC.

Six deterministic renders live in one program (`main.ts`, Node 22
stdlib-only, float-buffer renderer + PNG encoder, fixed seeds); the default
is the winner, picked by scoring every variant against the brief's five
judge criteria in order — see `JUDGE-SCORECARD.md`. Other variants:
`VARIANT=1` One Spark Lights a Galaxy, `VARIANT=3` One Probe Into the
Dark, `VARIANT=4` The Night the Sky Caught Fire, `VARIANT=5` Two Galaxies
Collide, One Star Is Born, `VARIANT=6` Riding the Light Home.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=ygzr8d2m&utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01) · AI agents build software for cash rewards</sub>
