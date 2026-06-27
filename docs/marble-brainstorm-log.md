# Marble Racing — brainstorm log (running)

Live capture of in-session brainstorming so it survives a flaky/crashing app.
Append-only; these are working decisions, not final spec. Date context: 2026-06-27.

## Status flags set this session
- **Energy system: ON HOLD.** Not part of current design discussion.
- **Marbles per race: UNDECIDED / elastic.** Not locked at 24; field size may flex.
- **Mode: brainstorming.** Ignore code/build state for now; this is design thinking.

## Decision/idea 1 — replacing what energy quietly did
Energy was secretly the **demand driver for owning multiple marbles** (the "need 3–4 in
rotation" pressure that kept the marketplace churning daily). Parking it removes daily
monetisation, but the marketplace flywheel can stand on other drivers already in the design:
- **Team-of-5 requirement** — must own 5 marbles to field a league team. Structural, strong.
- **League-class eligibility** — marbles must match the tier; promotion makes you outgrow
  your roster → buy/certify new ones. Strong churn driver.
- **Aging & retirement** — marbles decline and retire to the Hall of Fame → permanent
  replacement demand. Slow but constant.
- **Track-type diversity** — Mountain rewards stability, Sprint rewards speed; if you can't
  pick the track you need a *portfolio*, not one star marble.
- **Working conclusion:** team-of-5 + league-class eligibility + track diversity can fully
  replace energy as the demand driver. Parking energy costs daily monetisation, not the
  marketplace flywheel.

## Decision/idea 2 — elastic field size: split race types
A single elastic number fights with betting, so make it two classes:
- **Public / grind races → fully elastic.** Fill-and-fire between a min and a max; scales
  with the player base, kills wait times when small. Keep a **floor (~6–8)** so it still
  feels like a race / spectacle.
- **League / bettable races → fixed field** (12 or 24). Betting wants stable, comparable
  markets and marquee spectacle; dovetails with "betting lives on KOREX, runs on league races."

Elastic forces two things to be defined:
1. **Payout curve f(N)** — % shape parameterised by field size, not a fixed #1–#8 dollar ladder.
2. **Points normalised by field size** — so a 6-marble win ≠ a 24-marble win on the table.

Bonus: when registrations exceed max, **split into heats → finals** (reuse qualifying-grid
tech). Overflow becomes a feature.

## Open questions on the table
- Elastic public races: **fill-and-fire on a timer**, or **continuous matchmaking** that
  starts the instant a min field is ready?
- Which demand driver should carry the most weight now that energy is parked?

## Carried-over context (from earlier this session)
- Betting on marble races runs on **KOREX** (gambling entity) via a race-event API; paid race
  **entries** framed as a skill competition on the (non-gambling) Marbles side.
- Cross-sell plan: acquire broadly via Marbles → convert through **race betting first** (gated)
  → widen to casino later.
- Blueprint review flagged: hallucinated MBL token/investors in the deck, rake-math
  mismatches, orphan Race IQ, ambiguous league field size, unfunded staking yield, "never
  lose" box margin erosion. See `marble-blueprint-review-and-expansion.md`.
