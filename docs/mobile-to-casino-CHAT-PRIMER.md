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

The product design is an ownership economy, not just a game: regular users play
and open discovery boxes; **marble owners** buy/sell/upgrade marbles for
appreciation + royalties; **team owners** run lineups across a 10-tier,
2-week-season league with promotion/relegation. Power-up cards are deliberately
Phase 2.

**The most important thing about marbles: it's deliberately structured so it
won't be considered gambling. That's the whole reason it's a separate entity and
a separate repo — not just a KOREX vertical.** That non-gambling status is a real
asset: I can market it where a licensed casino legally *can't* — mainstream app
stores, paid/social ads, influencers, a broader (still-adult) audience, and
jurisdictions where gambling is restricted. It's novel, ownable, replayable, and
**shareable** — the kind of thing that travels on mobile. It's my most-built
*new* product, and I think it's my best top-of-funnel.

One honesty note for you to pressure-test: "separate repo" does **not** by itself
make something legally not-gambling. The spec still contains gambling-shaped
pieces — paid-entry races with **20–30% randomness**, *betting on league races*
(a KOREX market category), and gacha-style **discovery boxes**. The clean
architecture helps (the race engine never knows betting exists; KOREX's market
layer consumes race events for any wagering, and money stays in the KOREX
ledger), but whether marbles "isn't gambling" is a legal conclusion per
jurisdiction — prize + chance + consideration — not a given. Keep me honest on
this, and tell me plainly when I need a gambling lawyer rather than you.

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

The goal has sharpened: **I want to drive people TO marbles — and I'm thinking
about using promotions on the game to do it.** Marbles is the growth engine
*precisely because* it isn't gambling: I can run promos and ads for it that I
could never run for the casino.

My instinct:

- Marbles (+ the Telegram bot already proving the mobile path) is the
  acquisition front door — non-gambling, marketable, shareable.
- Promotions *on marbles* are easier and safer than gambling promos: free race
  entries, marble/skin drops, referral rewards, season passes, leaderboards —
  none of it is a "free bet," so most gambling-ad / RG promo rules don't bite.
- The shared KOREX wallet + identity is the bridge to the casino *for users who
  also want to gamble* — same account, same KYC.

**The tension I want you to attack:** the shared wallet and the shared
bonus/restricted-funds engine are exactly what could *collapse* the non-gambling
separation I built marbles for. If marble promos route through the gambling bonus
engine, or I cross-sell casino aggressively off a marbles audience, a regulator
can argue it's all one gambling product under one roof — and I lose the
non-gambling status that made marbles worth marketing in the first place. So:
drive people to marbles with promotions, yes — but the money/promo boundary
between "not-gambling marbles" and "gambling KOREX" has to be *real*, not just a
different table in the same ledger. And the casino cross-sell is a careful,
secondary step, not the headline.

## What I want from you in this chat

Work these with me, and challenge my framing where it's weak:

1. **Keep the non-gambling status intact.** Where's the line? Which parts of the
   marbles design (paid races + randomness, league betting, discovery boxes,
   shared wallet, the bonus engine) most threaten "not gambling," and how do I
   drive traffic + run promos without crossing it? Flag clearly where I genuinely
   need a gambling lawyer, not you.
2. **Promotions to drive people to marbles.** What actually works for a
   non-gambling skill/ownership game on mobile — free entries, marble/skin drops,
   referral loops, season passes, leaderboards, creator/influencer hooks? Which
   give the best acquisition-per-pound on a near-zero budget, and which quietly
   *look* like gambling inducements and should be avoided?
3. **The marbles → casino bridge, done safely.** *If* I cross-sell the gambling
   side to marbles users, what's the compliant way to do it on a shared wallet
   without collapsing the separation — and is it even worth the regulatory risk
   versus just growing marbles on its own?
4. **Sequencing under near-zero budget.** What creates real value first — push
   marbles + promos + Telegram now (the casino is still mock anyway), host the
   backend, or pick the casino aggregator? What order de-risks the most for the
   least spend?
5. **Aggregator pick, later** (Slotegrator vs EveryMatrix/SlotMatrix vs
   SOFTSWISS) — only once casino is actually on the roadmap; judge it through
   mobile-first + safe-cross-sell, not just catalog/uptime.

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
- **Marbles:** deliberately **not gambling** (the reason it's a separate entity);
  built through Phase 4, standalone repo, KOREX adapters live; own economy
  (owners/teams/leagues, 2-week seasons); cards are Phase 2. Non-gambling status =
  marketable where casino isn't, but it's a legal conclusion to *protect*, not a
  given.
- **Casino:** zero integration today; blocked on aggregator (Slotegrator /
  EveryMatrix / SOFTSWISS).
- **Mobile today:** Telegram bot already does real login/2FA/balances against the
  live backend path.
- **Open product call on marbles:** with earned qualifying grids the favorite
  wins ~49% (gate-rush) / ~66% (korex-arena) of league races — skill expression
  vs betting drama is an unresolved tension worth keeping in mind for the betting
  cross-sell.

Okay — that's the table set. Start with question 1: how do I drive people to
marbles and run promotions on it *without* jeopardising the non-gambling status
that makes it worth marketing in the first place?
