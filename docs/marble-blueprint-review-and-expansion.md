# Marble Racing Ecosystem Blueprint — review + expansion notes

Review of the 13-page *Marble Racing Ecosystem Blueprint* PDF (a NotebookLM-generated
visual deck) against the canonical written spec Mark supplied. Two jobs: (1) flag where
the deck and the spec disagree, (2) propose how to expand the ecosystem.

## TL;DR
The written spec is strong and unusually complete on the *economy*. The visual deck is
attractive but **lower-fidelity and partly hallucinated** — don't circulate it as the
source of truth. The richest parts of your spec (energy system, Career Value Premium,
Hall-of-Fame staking, certification) barely appear in the deck. Biggest expansion gap is
the **betting product** itself, which is one line in the spec yet is the whole point of
the KOREX cross-sell.

## A. Deck vs spec — fix before anyone sees the deck

1. **The deck invented a crypto token.** Cover page shows "MARKET CAP $2.5B USD · TOTAL
   SUPPLY 1,000,000,000 MBL · CIRCULATING 450,000,000 MBL · TOKEN UTILITY: GOVERNANCE,
   STAKING." There is **no token in your spec.** NotebookLM fabricated a tokenomics layer.
   Decide deliberately: is there an MBL token or not? If not, scrub it — a phantom token
   in an investor deck is a credibility (and securities) problem.
2. **The deck invented investors.** Cover: "APEX VENTURES $150M · QUANTUM FINANCIAL $260M ·
   GLOBAL SPORTS GROUP $160M · TECH INNOVATORS $75M." Not in your spec. Hallucinated. Remove.
3. **Rake math contradicts the spec.** Deck micro-economy page: 9% rake, $218.40 net, and it
   prints the "4th–8th place" row **twice** (duplicate, no #1–#8 detail). Your spec: **10%
   rake, $216 net, clean #1–#8 split** (20/16/14/13/12/10/8/7). Trust the spec; the deck is wrong.
4. **Skill split typo.** Deck race-mechanics page lists the 50% skill as SPEED 20 /
   ACCELERATION 20 / STABILITY 20 / AGILITY 20 / **AGILITY 20** — Agility twice, **Endurance
   dropped.** Spec is correct (Speed/Accel/Stability/Agility/Endurance, 20% each).
5. **Sprint radar mislabeled.** Track-dynamics page radar axes show "AGILITY" twice instead
   of Agility + Endurance.
6. **Funnel entry mismatch.** Deck's "Engagement Ascension" starts at *Step 1: Betting*. Your
   spec's ideal flow starts at *Marble Discovery Boxes → Ownership → Team Building → League*.
   Pick one canonical funnel — they imply different first-run experiences and different
   acquisition stories.
7. Minor: cover typos ("SKILL NETRICS", "ENGAGEMENT").

## B. Real holes in the spec itself (not just the deck)

1. **Race IQ has no home in the formula.** Marbles have a *Race IQ (1–1000)* attribute, but
   the result model is "50% skill split across Speed/Accel/Stability/Agility/Endurance" —
   Race IQ isn't in it. (The engine repo notes say Race IQ *does* differentiate outcomes.)
   Define exactly where Race IQ enters: steering/racing-line quality? tie-breaker? a 6th
   skill axis? Right now it's an orphan stat.
2. **League-race field size is ambiguous.** "League races = 24 teams/marbles per race" but
   also "a team has exactly 5 marbles" and "each league race = 5 sets (maps), 1 marble per
   set." So is the field 24 *teams* (= up to 120 marbles across 5 maps) or 24 *marbles*? The
   prize-pool and points math depend on this. Nail down: field = N teams × 5 maps, scoring
   per map, aggregate to team result.
3. **Hall-of-Fame staking yield has no source.** Yield is "generated from the ring-fenced
   cash reserve attached to the marble." A static cash reserve doesn't generate yield. The
   Legacy example pays ~$184.61 over 24 seasons **plus** the full $5,000 floor back — so the
   4% is paid *on top of* returning principal, funded from... where? Either (a) it's paid out
   of the reserve (then the floor isn't fully intact), or (b) the platform subsidises it
   (then it's a real cost line you haven't budgeted), or (c) the reserve is actually invested
   (then you're running a fund — securities/treasury question). Pick one and fund it.
4. **Discovery-box "never lose" erodes the stated margin.** Box $100, EV $90, "margin $10."
   But if every sub-$100 pull is topped up with energy toward ~parity, your *expected* payout
   rises above $90 and real margin drops below $10. Recompute true margin = price − E[marble
   value] − E[energy compensation]. The "never lose" promise is a cost, not free.
5. **Energy revenue is missing from the margin table.** Buying energy is a core monetisation
   lever (priced at ~3–4 entry fees for a full recharge) yet there's no "Energy: X% margin"
   line. Add it; it may be one of your biggest revenue lines.
6. **Career Value Premium + guaranteed redemption + staking yield = looks like an investment
   contract.** A "guaranteed minimum redemption price" that accrues and pays yield is the
   textbook shape of a security in several regimes — separate risk from the gambling
   classification. Worth your compliance team's eyes specifically on this, not just the
   gambling angle.
7. **Power-up cards are core here but "Phase 2" in the build.** Spec makes cards 20–30% of
   outcome; the engine repo deliberately deferred cards to Phase 2 (v1 ≈ 65/35 skill/random).
   Reconcile so the deck doesn't promise a mechanic that isn't built.

## C. Expansion opportunities (ranked)

1. **Betting product deep-dive (biggest gap, highest leverage).** It's one line ("bettable,
   10% margin") but it's the entire KOREX cross-sell. Expand into its own section: market
   types (win / place / podium / head-to-head / season-outcome), **parimutuel pools**, **live
   in-race micro-betting** ("overtake on next bend?"), and the **provably-fair, deterministic,
   record-and-replay** angle as the trust differentiator. This is what makes the ecosystem a
   gambling funnel, not just a game.
2. **Spectator / broadcast layer.** Watch mode, clips, live leaderboards, the arena broadcast
   theme. Spectating is the top of the betting funnel — no spectators, no bettors.
3. **Sponsorship & brand layer.** Marble/team jersey + skin sponsorships sold to real
   advertisers; "Marble Sponsorships" is hinted but undefined. Adds non-player revenue.
4. **Onboarding / free-to-play ramp.** The spec drops users straight into deposit + boxes.
   Add a free trial loop (a starter marble, free spectating, free-to-play prediction games)
   to widen the non-gambling top-of-funnel and feed the gated gambling conversion.
5. **Market integrity & anti-abuse.** A real-money asset market needs: wash-trading
   detection on the transfer market, collusion controls on team lineups, marble-value
   manipulation guards, and conflict handling for house-owned marbles (which both race for
   margin *and* are bettable). Non-optional once money is real.
6. **Fractional / index ownership (carefully).** Fractional shares of high-value marbles or a
   "marble index" lowers the entry price to the Owner tier and deepens liquidity — but leans
   further into securities territory; gate behind legal.
7. **Live-ops / seasonal narrative.** Themed 2-week seasons, limited-edition marbles, event
   calendars built around tentpole league finals — turns the season clock into a marketing
   and retention engine.

## D. What's genuinely strong (keep, don't touch)
- **Two-currency design** (cash entry fee = competition/gambling layer; energy = maintenance/
  engagement layer) cleanly separates monetisation from retention. The 3–4-marble rotation
  target deliberately manufacturing marketplace demand is elegant.
- **Career Value Premium with a per-marble ring-fenced reserve funded by its own wins** gives
  marbles a real value floor without pooling platform risk — strong, *if* the yield source
  (B3) is fixed.
- **Discovery-box energy compensation** ("a bad pull becomes fuel, not a loss") is good
  behavioural design.
- **Promotion/relegation + league-class marble requirements + certification fees** create a
  continuous, self-reinforcing marketplace churn flywheel.
