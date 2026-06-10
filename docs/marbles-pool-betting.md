# Marbles Pool Betting — client contract & design note

A wagering layer over **Marbles On Stream** (Pixel Dough Games' Steam
marble-racing game). The game already integrates with Twitch — viewers enter a
race from chat (`!play`) and each marble is named after a Twitch user. We reuse
that as the **event feed**: a bot watching the channel knows the entrants and,
when the race ends, which marble won.

This document describes the flow the `client-tests` harness exercises
(the **Marbles Pool** tab) and the backend endpoints it expects. The endpoints
are a proposed contract — the betting/settlement engine lives in the backend
repos (`backend-module-core` `markets2_*`, `backend-utils/lib/ledger`), not here.

## The model — "winner takes 90%"

A **round** maps one-to-one onto a single marble race.

1. **Create round** — an operator opens a round bound to a Twitch channel, in a
   currency, with a house rake in basis points (`1000` = 10%).
2. **Place wagers** — players stake an amount on a marble (a Twitch entrant).
   Each stake is debited from the player's ledger balance into the round pool.
3. **Settle** — when the race result arrives (winning marble reported from the
   Twitch feed), the pot pays out:
   - **Backers of the winning marble split 90% of the total pool**, pro-rata to
     their stake.
   - The house keeps the remaining **10%** (the rake).

This is a pari-mutuel pool with a configurable rake, so it works whether one
player or many backed the winner. Payout for a winning backer *i*:

```
payout_i = stake_i / sum(winning_stakes) * total_pool * (1 - rake_bps/10000)
```

If nobody backed the winning marble, the policy for the pool (roll over vs.
refund vs. house) is a backend decision — flagged below.

## Endpoints (client contract)

All are `POST` under `/api/v1/marbles/`, authenticated with the `ecltoken`
header like every other call in `EclContext.js`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `createMarblesRound(twitch_channel, currency, rake_bps)` | `/v1/marbles/createround` | Open a round bound to a Twitch channel. Returns `round_id`. |
| `fetchMarblesRound(round_id)` | `/v1/marbles/fetchround` | Round status, entrant marbles, per-marble pool totals, overall pot. |
| `fetchActiveMarblesRound(twitch_channel)` | `/v1/marbles/activeround` | The currently-open round for a channel (what a player bets on now) + entrants. |
| `setMarblesOptIn(opted_in)` | `/v1/marbles/optin` | Record the player's consent to take part. Wagering is gated on this. |
| `placeMarblesWager(round_id, marble_id, currency, amount)` | `/v1/marbles/placewager` | Stake `amount` on `marble_id`; debits the player's ledger into the pool. |
| `settleMarblesRound(round_id, winning_marble_id)` | `/v1/marbles/settleround` | Settle against the winning marble; triggers the 90/10 pro-rata payout + rake. |

Money values follow the platform rule (smallest units, BigNumber, per-currency,
never cross-currency). The 10% rake reuses the existing commission mechanism in
`markets2_calculations.js`.

## What's in this repo

The betting engine itself lives in the backend repos (not here), so the
`/v1/marbles/*` endpoints above are a **proposed contract**. This repo carries
the client-side pieces that build against it:

- **`src/api/EclContext.js`** — the six methods in the table above.
- **`src/ui/MarblesTest.js`** — operator/dev harness tab ("Marbles Pool"):
  create round → place wager → fetch → settle, with raw JSON responses.
- **`src/ui/MarblesPage.js`** — player-facing page at route `/marbles`, written
  to be lifted into `matchpoint-client`. Starts with an **opt-in gate** (the
  player must consent before any wager UI shows; consent is sent via
  `setMarblesOptIn` and remembered locally), then shows the active round,
  entrant marbles, a stake form, and the result.
- **`marbles-bot/`** — the result bot: reads the channel's Twitch chat, tracks
  `!play` entrants, parses the game's winner announcement, and calls
  `settleMarblesRound`. See `marbles-bot/README.md`.

**Still needs the backend repos (not in this session's scope):** implementing
the `/v1/marbles/*` endpoints on `markets2` + ledger, and porting `MarblesPage`
into the real player frontend (`matchpoint-client`).

## Opt-in

Marbles is presented as an optional novelty round, separate from the main
sportsbook. Players must explicitly **opt in** before any wager UI is shown:

- `MarblesPage` gates the whole betting UI behind a consent checkbox.
- Consent is recorded server-side via `setMarblesOptIn(true)` and cached in
  `localStorage` so the player isn't re-prompted; an "Opt out" control reverses
  it.
- The backend should treat the opt-in flag as a hard gate on `placewager`.

## How this maps onto the existing engine

- A round is a **market** with N outcomes (the marbles) — the analog of the
  `abios_market_mapper.js` esports markets, but the event source is the Twitch
  race instead of the MySQL esports mirror.
- Wager placement and settlement reuse `markets2_api.js` /
  `markets2_calculations.js` + the ledger (the single source of truth for money).
- The Twitch bot is the **result ingestion** path that calls `settleround`.

## Open questions for the backend / product

- **Licensing.** The UK GC Combined Remote Operating Licence is for real-event
  betting. A Steam marble race is a novel event type — Mark to confirm whether
  it's in scope before any real-money round is opened.
- **Result trust.** The Twitch bot result needs an integrity story (operator
  confirmation, a settle delay / dispute window) before it moves real money.
- **No-winner pool policy.** Roll over to the next round, refund stakes, or
  house — pick one.
- **Betting window.** When does a round lock (entries close before the race
  starts; wagers close at race start)?

These don't block the client harness — they block opening a real-money round.
