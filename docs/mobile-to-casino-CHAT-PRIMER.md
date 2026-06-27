# KOREX + Marbles → Casino — chat primer (my voice)

*How to use this: paste the whole thing into a new Claude chat as my first message,
then start talking. It's written as me (Mark) briefing you so you have the full
picture before we get into "how do I get users from mobile into the casino."*

---

Hey — I want to think through a real problem with you, but first let me set the
table so you're not guessing. Read all of this, then I'll ask my questions. Push
back on me where I'm wrong; this is real money and a licensed product, so I'd
rather you be blunt than agreeable.

## Who I am and how I work

I'm Mark. Small team, near-zero budget, moving fast. I run the build mostly
through AI — Claude writes the code, a second model second-opinions it, I make
the calls. I don't want hype or a feature firehose. I want the honest version:
what's actually built, what's mock, what it costs, what unlocks what. If
something is a bad idea, say so and tell me why.

## The three things in play

### 1. KOREX — the platform

KOREX is a **fully licensed, globally-targeted sportsbook + casino**. Licences
are secured, global markets approved, UK GC compliance is in the onboarding flow.
The positioning is deliberate and premium — *"KOREX isn't a casino. It's a
system."* Serious bettors, not a gimmicky site. Brand is near-black + deep purple.

What's real vs not:

- **Backend rails are real and hardened** — multi-currency ledger (safe decimal
  / BigNumber, race conditions fixed), accounts + 2FA (ECLToken), wager engine +
  markets, a bonus / restricted-funds engine, KYC and payments factories
  (pluggable), responsible-gambling hooks, full back office. This runs locally
  today (Node + Postgres + Redis + Docker).
- **Player frontend (korex.bet)** is live on Vercel but it's a **shell** (~5–10%)
  — login/register/home. Every interaction is currently mock/local; nothing hits
  a server yet. There's a `RemoteAdapter` already wired so the account half
  (login, balances, bet history) would work the moment the backend is hosted.
- **A Telegram bot** ("KOREX Bet") already exercises the *real* backend path on
  mobile — real login + 2FA + balance/bets/transactions. That's my proof that
  mobile-against-real-backend works the second the backend is reachable.

The honest blockers (all Phase-2/3, all external-provider decisions, not code):

- **Bets** need a chosen **odds feed** (tentative: The Odds API Business).
- **Deposits/withdrawals** need a chosen **payment processor** (Paysafe is
  already integrated in `payments2/` and may be keepable).
- **Casino** needs a chosen **content aggregator** — and this is the big one
  below.

### 2. Marbles (Marble Racing) — the surprise asset

This is a **separate product on KOREX rails**, own repo (`korex-tech/marble-race`),
**zero KOREX imports**, integrates through three clean ports (Wallet / Auth /
race-event stream). And unlike the casino, **it's actually built** — through
Phase 4, deterministic sim engine (Rapier WASM, record-and-replay, bit-identical
cross-machine), Monte-Carlo calibration, 3 tracks, Marbula-One-style qualifying
grids, a replay viewer, and **KOREX adapters already shipped and live-verified**
(wallet→ledger for entry fees/refunds, auth→ECLToken, signed race webhook the
market layer can consume for betting).

The product design is an ownership economy, not just a game: regular users bet
and open discovery boxes; **marble owners** buy/sell/upgrade marbles for
appreciation + royalties; **team owners** run lineups across a 10-tier,
2-week-season league with promotion/relegation. Margins are baked in across
races, betting, the transfer market, boxes, and account upgrades. Power-up cards
are deliberately Phase 2.

The point: marbles is novel, ownable, replayable, and **shareable** — the kind of
thing that travels on mobile and social. It's my most-built *new* product.

### 3. Casino — the gap

Here's the uncomfortable truth: **KOREX has no casino integration at all.** No
casino tables, no endpoints, the casino surfaces are intentionally mock, and the
back-office casino analytics are honest "awaiting Phase 2" placeholders — never
faked. It's gated entirely on picking a **content aggregator**. Research is done;
shortlist is **Slotegrator**, **EveryMatrix / SlotMatrix** (no markup on
content), and **SOFTSWISS** (best uptime + crypto). No decision yet.

So casino is simultaneously my **highest-margin, most always-on monetization
engine** and my **least-built vertical**. That tension is the whole problem.

## The problem I want to chew on

**How do I get users from mobile into the casino?**

My current instinct — tell me if it's right:

- A cold, direct "mobile ad → slots" funnel is expensive, undifferentiated, and
  pointless right now because *the casino doesn't exist yet.*
- The asset that actually pulls people in on mobile is **marbles** (+ the
  Telegram bot already proving the mobile path). Marbles is differentiated and
  viral-friendly; casino is generic but high-margin.
- The **bridge is the shared KOREX wallet + identity.** A user who deposits once
  for marbles is one tap from casino — same ledger, same account, same KYC.

So the strongest funnel might be: **marbles / Telegram = top-of-funnel
acquisition + retention → shared wallet gets them deposited → casino is the
high-margin layer they convert into and get retained on.** Marbles opens the
door; casino keeps the margin.

But I'm not sure about sequencing, the actual cross-sell mechanics, or whether
I'm overweighting marbles because it happens to be the thing that's built.

## What I want from you in this chat

Work these with me, and challenge my framing where it's weak:

1. **Is the "marbles as top-of-funnel, casino as monetization" thesis right** —
   or am I rationalizing because marbles is what's built? What would make it
   wrong?
2. **The actual mobile→casino journey.** Concrete: a user lands (Telegram bot /
   mobile web / app), what's the path to a first deposit and a first casino
   spin? Where are the deep-links, the handoffs, the drop-off risks?
3. **Cross-sell mechanics between marbles and casino** on a shared wallet —
   shared bonus/restricted-funds engine, retention loops, what's compliant, what
   feels good vs scammy.
4. **Sequencing under near-zero budget.** What do I do *first* that creates real
   value — pick the casino aggregator? Host the backend? Lean harder on marbles
   + Telegram while casino is still mock? What's the order that de-risks the
   most for the least spend?
5. **The aggregator decision** (Slotegrator vs EveryMatrix/SlotMatrix vs
   SOFTSWISS) — through the lens of *mobile-first* and *cross-sell with marbles*,
   not just raw catalog/uptime.

## Ground rules

- This is **licensed, real-money, global**. Treat financial logic, compliance
  (RG limits, KYC-before-withdrawal, age verification, self-exclusion), and audit
  trails as non-negotiable. If an idea breaks one of those, kill it.
- **Small team, near-zero budget.** Favor things that reuse the rails I already
  have over net-new builds. Call out anything that's secretly expensive.
- **Be adversarial and specific.** Don't be polite about a bad plan. I want the
  second-opinion treatment, not cheerleading.
- Don't fake progress or capability — if casino is mock, we plan around it being
  mock until the aggregator is live.

## Quick-reference facts (so you don't have to ask)

- **KOREX:** licensed sportsbook + casino; rails real & local; frontend a shell
  on Vercel; account features work the moment backend is hosted.
- **Hosting the backend** ≈ ~1 day / ~$20–40/mo VPS, but alone it only unlocks
  the *account* half (login/balances/history) — bets/deposits/casino stay gated
  on provider picks.
- **Marbles:** built through Phase 4, standalone repo, KOREX adapters live; own
  economy (owners/teams/leagues, 2-week seasons); cards are Phase 2.
- **Casino:** zero integration today; blocked on aggregator (Slotegrator /
  EveryMatrix / SOFTSWISS).
- **Mobile today:** Telegram bot already does real login/2FA/balances against the
  live backend path.
- **Open product call on marbles:** with earned qualifying grids the favorite
  wins ~49% (gate-rush) / ~66% (korex-arena) of league races — skill expression
  vs betting drama is an unresolved tension worth keeping in mind for the betting
  cross-sell.

Okay — that's the table set. Start with question 1: is my marbles-as-funnel,
casino-as-monetization thesis actually right, and what would make it wrong?
