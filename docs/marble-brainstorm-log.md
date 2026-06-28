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

## Decision/idea 3 — energy: why it's parked (not just "on hold")
Energy is the steepest mechanic in the design and the most optional. The concept (stamina)
is intuitive; the *model* (zones, drain rates, rotation math, recharge pricing) is the wall.
Its jobs were daily monetisation + multi-marble demand; demand is already covered (idea 1),
and entry fees already gate spam, leaving only daily monetisation — not worth the cognitive
load at launch. Aligns with the broad, shallow-onboarding acquisition goal.
- **Decision:** launch WITHOUT energy. If daily monetisation/pacing is wanted later, use a
  **rest period / cooldown ("energy-lite")**: "marble rests X hrs after a race, or pay to
  skip." Keep the full zone model only as a far-future option.

## Decision/idea 4 — breeding & marble dust (PHASE 2 / future)
Horse-racing bloodstock economy translated to marbles (the breeding economy can rival the
racing prize economy). Behind the Owner tier; fully optional, never in the new-user path.
- **Dust:** a famous / Hall-of-Fame marble produces tradable "dust" on a cooldown; dust sells
  on the open market (transfer-market margin). Gives legends a perpetual *legacy income* and a
  reason to HOLD rather than redeem.
- **Finite dust + generational turnover:** each legend yields dust up to a **lifetime cap**
  (cooldown = rate, cap = total), then becomes "breeding-retired." Early dust from a tapped-out
  legend is a rare collectible. As old lines dry up, new legends must emerge → dynasties +
  natural supply control ("supply ≈ retiring + growth").
- **Infusing/breeding:** apply dust to develop a marble or create offspring; outcome **capped by
  growth potential** (no god-marbles → protects competitive integrity + betting drama).
- **Anti-exploit rules:** breeding requires **2+ DIFFERENT source dusts** (no same-source
  stacking/duplication); close-line pairing carries an **inbreeding penalty** (weaker / higher
  defect chance) → rewards crossing distinct lines, keeps the marketplace diverse.
- **Pedigree/provenance:** public bloodline/lineage tree in the Hall of Fame; provenance drives
  price (as in real bloodstock).
- **Sinks (anti-inflation):** breeding consumes dust + a fee + carries failure/variance; tie the
  faucet to the supply rule.
- **Caution:** random infusion outcomes are loot-box-adjacent → compliance flag (deterministic-
  with-ranges is the safer option).

## Decision/idea 5 — pull-or-breed entry + development-through-racing
- **Entry point:** acquire a marble cheaply (plain marble OR a pack pull with some stats) and
  develop/breed it. A cheap marble with high hidden **growth potential** = a development project.
- **Does a marble improve by racing?** The spec already implies it (attributes INCREASE through
  Rookie→Prospect→Prime, stabilise Veteran, decline Retirement) but never says HOW. Proposed
  mechanism: **racing develops the marble toward its growth-potential ceiling.**
  - **Nature vs nurture (Football Manager model):** growth potential = ceiling (nature); racing
    realises it (nurture). Identical starting stats + different GP = totally different upside →
    GP is the prospect's hidden value.
  - **Race IQ gets a home:** physical attributes grow via development/training; **Race IQ grows
    specifically through racing experience** — solves the earlier "orphan stat" problem.
  - **Lifecycle gates the curve:** develop Rookie→Prime (steep then tapering), none in Veteran,
    decline in Retirement → a window to develop = urgency + strategy.
  - **Track specialisation:** racing a track type builds affinity (spec's "identifying long-term
    track specialisations").
  - **Anti pay-to-win:** racing-earned development (engagement) + optional paid acceleration
    (monetisation), BOTH capped at GP → money buys speed-to-ceiling, never a higher ceiling.
- **Core value loop this completes:** acquire cheap → develop through play → realise potential →
  breed / sell at a premium → offspring & dust seed the next generation. Player-driven value
  creation — the engine of every successful sports-sim / collectible-breeding game.
- **GP partly hidden at acquisition** → scouting/analytics meta + chase (bet on unseen
  potential, as in real bloodstock).

## Session status (2026-06-27)
- **Pitch decks produced:**
  - Canva (edited, on-brand-ish: purple headlines, placeholders removed) —
    edit: https://www.canva.com/d/JeLm9s3-JEbHAFn · view: https://www.canva.com/d/xdGzuYi7uT-Ls2e
  - Gamma (fully on-brand, Style Bible imagery, exact copy preserved) —
    https://gamma.app/generations/fXQNO6ysEDVeK1AFH6XvA
  - Canonical copy: `marble-pitch-script.md`. Concept locked: Marbles is its own
    separate (advertisable, non-gambling) product, cross-promoted with the KOREX
    casino, same marbles playable on casino products. Connected, not merged.
- **Deck critique (next improvements to make it investor-complete):** add a numbers
  section (market size, ARPU/LTV/CAC, projections), a risk/regulatory slide, a
  roadmap/team slide, and an ask. Address the "not gambling vs casino games"
  mechanism explicitly. Soften "$5 → earn for years" (reads like guaranteed return).
- **Tooling notes:** Gamma can't be edited via the API (regenerate for changes;
  or edit in the Gamma editor). Canva CAN be edited in place but needs a Canva
  Brand Kit for true on-brand auto-generation (none set up; values are in the
  Style Bible). Gamma honours the Style Bible via the custom image style.

## NEW workstream — Blender artist for the 3D tracks
- Goal: hire a Blender artist to model the race tracks (Mountain, Sprint, arena).
- Starter brief + new-session prompt: `docs/blender-artist-track-brief.md`.
- Key constraints to carry: Rapier-friendly collision meshes, real-world scale,
  z-monotonic courses (no closed loops yet), GLB export, Clean Futurism style.

## Carried-over context (from earlier this session)
- Betting on marble races runs on **KOREX** (gambling entity) via a race-event API; paid race
  **entries** framed as a skill competition on the (non-gambling) Marbles side.
- Cross-sell plan: acquire broadly via Marbles → convert through **race betting first** (gated)
  → widen to casino later.
- Blueprint review flagged: hallucinated MBL token/investors in the deck, rake-math
  mismatches, orphan Race IQ, ambiguous league field size, unfunded staking yield, "never
  lose" box margin erosion. See `marble-blueprint-review-and-expansion.md`.
