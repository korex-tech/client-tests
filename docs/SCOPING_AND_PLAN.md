# Betfair × Polymarket — Scoping & Implementation Plan

**Question this answers:** *How do we actually make money on Betfair Exchange and Polymarket, and what must the software do to capture that edge?*

**Status:** Research + repo audit complete. This is a planning document, not yet built. Figures are snapshots (mostly April–June 2026) — reward pools, fees, and legal/geo status change fast; re-verify flagged items before committing capital.

**Build order (decided):** Polymarket first, then Betfair.

---

## 1. Executive summary — the honest answer

For a **small, software-driven operation**, the edges fall into three tiers:

| Tier | Strategy | Why |
|---|---|---|
| ✅ **Most viable** | **Polymarket market-making + liquidity-reward farming** | Documented reward formula, maker orders are free, gas is sponsored (gasless), first-party bot tooling, and reward is paid for *posting* liquidity rather than *predicting* outcomes. This is a software/latency game, not an alpha game. |
| ⚠️ **Conditionally viable** | **Betfair pre-race / value trading** | Automatable on cheap infra, but edges are thin (~single-digit % on turnover), taxed by the Expert Fee on consistent winners, and gated by a paid live API key. |
| ❌ **Not viable (for us)** | **Cross-platform Betfair↔Polymarket arbitrage** | The original thesis does **not** survive scrutiny — see §6. Overlap is narrow, currencies/settlement/resolution differ, and capital is locked per leg until resolution. Documented prediction-market arb is Polymarket↔Kalshi, both USD-native — not Betfair. |

**Recommendation:** Build a **Polymarket market-making / liquidity-rewards bot** as the money engine (Phases 1–2), then add Betfair as a second venue for trading strategies (Phase 3). Treat cross-venue arb as an opportunistic monitor at most, not a core strategy.

> ⚠️ **The #1 gate is jurisdiction** (see §7). Polymarket's deep international order book is geoblocked to US IPs; a separate CFTC-regulated "Polymarket US" venue (different order book, mandatory KYC) opened 3 Dec 2025. Betfair Exchange is unavailable in the US. *Which jurisdiction we operate from changes what is legal and buildable.*

---

## 2. Strategy viability matrix

### Polymarket

| Strategy | How it works | Edge | Capital / latency | Automatable? |
|---|---|---|---|---|
| **Liquidity rewards** | Rest two-sided GTC limit orders within a market's `rewardsMaxSpread` of midpoint, ≥ `rewardsMinSize`; scored every minute by closeness to mid, paid daily in pUSD pro-rata of the market pool. | Low-risk yield on posted capital; pools are sizable (April '26 sports examples: CL QF ~$24k/game, EPL ~$10k, NBA ~$7.7k — *single 3rd-party source, flag*). No reliable published APY. | Order size must clear `min_incentive_size` (often tens of $); meaningful pool share needs sustained two-sided depth. Latency: re-quote on midpoint moves. | **Yes — primary target.** |
| **Market making (spread capture)** | Post bid below / ask above fair mid on the CLOB; YES and NO share one book (sell YES = buy NO at complement). Stack rewards on top. | Spread minus adverse selection; thin on liquid markets, wider on niche. | Scales with depth. Medium latency. | **Yes.** |
| **Directional trading** | Buy mispriced YES/NO, hold to $1 resolution or sell early. | Requires genuine domain alpha. Anecdotal "8–25%/mo for skilled traders" — *survivorship-biased, flag*. | Capital-flexible. | Partially — needs an edge model, not just code. |
| **Internal arbitrage** | YES+NO < $1 → buy both for guaranteed $1. | Mostly structurally closed by the shared book; real edges are cross-/multi-outcome. An academic study (arXiv 2508.03474) found ~41% of conditions had *some* single-market arb historically — *now "a game between bots."* | Capital locked to resolution. Very low latency. | Hard — bot-saturated. |

### Betfair

| Strategy | How it works | Edge | Capital / latency | Automatable? |
|---|---|---|---|---|
| **Value betting** | Back odds whose implied prob < true prob; profit over large samples. | ~6% yield on turnover cited (*single vendor track record, unaudited, flag*). | Tolerates the free/delayed key; cheap infra. | **Yes — most automatable.** |
| **Pre-race back/lay trading** | Trade odds drift before the off; "green up" to lock profit across runners. | Statistical, not latency-driven. | Cheap infra. | **Yes.** |
| **Scalping** | Back then lay for ~1 tick, repeated at volume. | ~£3/trade (*affiliate source, treat skeptically*); profit from turnover not margin. | Needs live key + low latency (sub-20–100ms) + 2% commission tier. | Yes but latency-bound. |
| **Market making** | Two-sided quotes across all outcomes 1–2 ticks off mid, target 105–110% book. | Spread; competes with Betfair's own cross-matching. | Live key + low latency. | Yes but competitive. |
| **Matched betting** | Lay bookmaker free bets on the exchange. | One-time per offer. | Manual sign-ups. | **No — manual, gubbing-limited.** |

---

## 3. Cost structures (what eats the edge)

### Betfair
- **Commission:** Market Base Rate **5%** on net winnings (UK/most of EU); higher regionally (sport/intl racing ~6%, Australian racing 8–10%, NRL 10%). Reducible to **2%** via Betfair Rewards "Basic" tier. Smarkets is a flat 2% alternative.
- **Points/discount system:** effectively retired for commission reduction outside Australia.
- **Expert Fee (current — replaced the Premium Charge on 6 Jan 2025):** based on **rolling 52-week gross profit** — **0%** under £25k, **20%** £25k–£100k, **40% cap** above. Old 50%/60% tiers abolished. Betfair states ~80% of users unaffected; it targets consistent professional winners. *This is the structural tax on a successful bot.*
- **Live API key:** one-off, non-refundable activation fee — **£299 vs £499, sources disagree (flag — confirm with Betfair).** Free "Delayed" key returns conflated data (`conflateMs` forced to 180000 ms = 3 min).
- **Transaction/data charges:** penalize high request-to-bet ratios; offset by `(Commission + Implied Commission)/2` where Implied Commission = market losses × 3%. Pure data-pulling without betting incurs charges.

### Polymarket
- **Trading fees (post-CLOB-v2, ~2026):** no longer zero-fee. **Taker fees by category** (~): Crypto 1.80%, Economics 1.50%, Culture/Weather 1.25%, Finance/Politics/Tech 1.00%, Sports 0.75%, geopolitics free. **Maker (limit) orders are free** — *which is exactly why a maker/liquidity strategy is the play.* 15-min crypto markets use a dynamic taker fee (up to ~3.15%) to kill latency arb. *Rates change frequently — flag.*
- **Maker rebate program (launched 29 May 2026):** ~20–25% of taker fees rebated daily to makers in pUSD, $1 min payout, tiered by 30-day weighted volume.
- **Gas:** effectively **gasless** — a Relayer sponsors all on-chain txns on Polygon; users hold only USDC/pUSD, not POL. Typical underlying Polygon cost is fractions of a cent.
- **Deposits/withdrawals:** no platform fee; Polygon cost <$0.01; bridging to Ethereum mainnet ~$1–$20+; third-party on-ramps (card) ~2–3% — the real cost to watch.
- **Collateral:** mid-migration from bridged **USDC.e** → native **USDC / pUSD** (Circle partnership, ~April 2026). *Flag — token in transition.*

---

## 4. API capabilities & constraints

### Betfair Exchange API (API-NG, JSON-RPC)
- **Endpoints:** `listEventTypes` / `listMarketCatalogue` (static metadata, runner names) / `listMarketBook` (prices, status, traded volume, your order status) / `placeOrders` (≤200/req) / `cancelOrders` (≤60) / `listCurrentOrders` / `getAccountFunds`.
- **Exchange Stream API:** low-latency push — initial full image then deltas merged locally; `status` field flips to **503** under latency stress; heartbeat 500–5000 ms. **Critical for trading** (the delayed key conflates to 3 min, so serious trading needs the live key).
- **Limits:** market-data request weighting ≤ **200 points/request** (TOO_MUCH_DATA above); per-projection weights (EX_BEST_OFFERS=5, EX_ALL_OFFERS=17, EX_TRADED=17…).
- **Auth:** interactive (user+pass+2FA) **or** non-interactive cert ("bot") login — self-signed RSA cert POST to `identitysso-cert.betfair.com/api/certlogin`; session token in `X-Authentication` + app key in `X-Application`; ~12 h session, extend via `keepAlive`.
- **ToS:** automated/API betting is **explicitly permitted**.

### Polymarket (Gamma + CLOB v2 + WebSocket)
- **Gamma API** (`https://gamma-api.polymarket.com`, public, no auth): `/events`, `/markets`, `/tags`, `/sports`, `/search`; offset pagination, `limit` 1–500. **Reward params exposed on the market object:** `rewardsMinSize`, `rewardsMaxSpread`, nested `clobRewards[]` (`rewardsDailyRate`, dates, `conditionId`). ← *the bot reads these to pick markets.*
- **CLOB API** (`https://clob.polymarket.com`): read (`GET /book`, `/price?side=`, midpoint, spread; batch `POST /books` etc. ≤500 tokens) is public; trade endpoints need L2 auth. Orders: `createAndPostOrder`, batch `postOrders` (≤15), `cancelOrder/cancelAll/cancelMarketOrders`, `getOrders`, **`postHeartbeat` (no heartbeat ~10s → all open orders cancelled)**. Order types GTC/GTD/FOK/FAK, **post-only** for GTC/GTD (rejected if it would cross). Tick sizes 0.1–0.0001.
- **WebSocket** (`wss://ws-subscriptions-clob.polymarket.com/ws/{market|user}`): market channel (public, by token IDs) emits `book`, `price_change`, `last_trade_price`; user channel (authed) emits `trade`/`order` events. PING every 10s.
- **Auth & signing:** **L1** = EIP-712 wallet sig (`ClobAuthDomain`, chainId 137) → `POST /auth/api-key` (or `GET /auth/derive-api-key`) returns `{apiKey, secret, passphrase}`. **L2** = per-request HMAC-SHA256 over `timestamp+method+path+body` in 5 headers (`POLY_ADDRESS/SIGNATURE/TIMESTAMP/API_KEY/PASSPHRASE`). Signature types: EOA=0, POLY_PROXY=1, **GNOSIS_SAFE=2 (most common)**. **All signing must be server-side — keys never touch the browser.**
- **SDK (⚠️ critical):** **CLOB v2 went live ~28 Apr 2026; legacy `py-clob-client` / `@polymarket/clob-client` no longer work against production.** Target `@polymarket/clob-client-v2` / `py-clob-client-v2`, or the unified `Polymarket/ts-sdk` / `py-sdk`. Testnet = Amoy (chain 80002). *Our current `docs/API_CONTRACT.md` references the old SDKs — fix when wiring.*
- **Rate limits (3rd-party, approx — flag):** CLOB `POST /order` ~3,500/10s; Gamma `/markets` ~300/10s; Cloudflare-throttled.

---

## 5. Our codebase — current state & gaps (repo audit)

**What exists:** CRA + React Router; `EclContext` factory-pattern session layer (`ecltoken` header, `sessionStorage`, `/v1/account/*`). New `/exchange` scaffold: `ExchangeClient` (factory, `USE_MOCK` switch, `Authorization: Bearer`), normalised market/runner/balance/order shapes, mock data, and UI (dashboard, market list, order-book view, order ticket, open orders). 3 mock-mode smoke tests pass.

**Gaps for *real* trading (priority-ordered):**
1. **Auth/secrets:** no Betfair cert login, no Polymarket wallet/key custody, no server-side EIP-712/HMAC signing. Two different token headers (`ecltoken` vs `Bearer`) need unifying.
2. **Lay liability:** `format.js estimateProfit` returns bare `size` for Betfair LAY — real liability `= size × (price − 1)` is not computed or displayed; no balance reservation shown.
3. **Order signing & confirmation flow:** no preview/sign/confirm step; errors dump raw JSON.
4. **Market status:** all mock markets are `OPEN`; no SUSPENDED/CLOSED/SETTLED handling or order-blocking.
5. **Real-time prices:** manual "refresh book" only; no Stream API / WebSocket bridge (MarketView already isolates fetching, so it's swappable).
6. **Platform semantics the shape can't express:** Betfair matched-vs-unmatched, persistence type, runner status; Polymarket settlement date, share/collateral semantics, `conditionId`/token IDs, reward params.
7. **History/settlement:** no order history, trade history, or payout/settlement views.
8. **SDK target:** contract references retired Polymarket SDKs (see §4).

---

## 6. Cross-platform arbitrage — why it's deprioritized

- **Overlap is narrow:** Betfair is deep on football/racing/tennis/cricket but thin on politics; Polymarket is deep on politics/crypto/novelty. Genuine same-event overlap ≈ big political binaries + headline sports only.
- **No documented Betfair↔Polymarket arb exists** (the documented ecosystem is Polymarket↔Kalshi, both USD-native).
- **Structural frictions:** fiat (GBP) vs on-chain USDC; moving capital between a wallet and a regulated Betfair account adds time, FX, on/off-ramp fees, KYC. **Capital is locked per leg until resolution** (weeks–months).
- **Resolution divergence is real, not theoretical:** Betfair's rules team vs Polymarket's UMA optimistic oracle — which **already misresolved a ~$7M market** (March 2025 "Ukraine minerals," a ~25%-voting-power governance attack). That converts a "hedged" arb into a one-sided loss.
- **Edges (~1–5% gross, often <2% net) are bot-taken in milliseconds.**

→ Treat as an opportunistic *monitor* once both venues exist, never the core thesis.

---

## 7. Legal / geo / ToS — the gating reality

- **Polymarket:** International platform (deep liquidity, USDC, UMA-resolved) is **geoblocked to US IPs** under a 2022 CFTC settlement ($1.4M). A **separate CFTC-regulated "Polymarket US" (QCX LLC) launched 3 Dec 2025** — *different order book*, mandatory KYC (ID/SSN), iOS-first, with 11+ state cease-and-desists and a Minnesota ban (challenged). "No KYC, no API access." Automated/API trading is first-party-tooled (`Polymarket/agents`).
- **Betfair:** Unavailable in the US (bar narrow racing carve-outs) and banned in several countries (France, Germany, Greece, Portugal, Turkey, China, Japan…); available UK/IE/AU/much of EU. API/bot trading explicitly permitted. Exchange winners are **not** "gubbed" (that's a sportsbook risk) — the Expert Fee is the equivalent tax.

**⟶ Open question that gates Phase 1+: which jurisdiction are we operating from, and therefore which Polymarket venue (international vs US) and is Betfair even available to us?**

---

## 8. Recommended build — phased plan (money-first, Polymarket first)

### Phase 0 — Foundations & legal gate *(no capital at risk)*
- Resolve the **jurisdiction question** (§7) — determines venue + whether Betfair is in scope at all.
- Stand up the **backend skeleton** behind the existing `ExchangeClient` contract; implement the **Polymarket read path** against live data: Gamma `/markets` + CLOB `/book`/`/price` + market WebSocket. No auth needed.
- **Validate the normalised shapes** against real Gamma/CLOB responses; extend them for `conditionId`/token IDs, tick size, and reward params (`rewardsMinSize`/`rewardsMaxSpread`).
- Update SDK target to **clob-client-v2 / unified SDK**; fix `API_CONTRACT.md`.
- *Deliverable:* live read-only Polymarket dashboard (replaces mock for the read path).

### Phase 1 — Polymarket trading (single venue, real orders)
- Backend **wallet/key custody** + signing: server-side **L1 EIP-712** → derive API creds; **L2 HMAC** per request; signature type **GNOSIS_SAFE (2)**. Keys live only server-side (vault).
- Implement `placeOrder`/`cancelOrder`/`getOrders` + **heartbeat keepalive**; map our `BACK/LAY` to buy/sell-share semantics.
- Frontend: account/wallet linking, order ticket with **fee/slippage preview + confirm**, real USDC/pUSD balance & positions, proper error states, market-status guarding.
- Test on **Amoy testnet (80002)** before mainnet.
- *Deliverable:* place/cancel real Polymarket orders end-to-end.

### Phase 2 — Market-making / liquidity-reward engine *(the money)*
- **Strategy service:** maintain two-sided **GTC post-only** quotes inside each market's `rewardsMaxSpread` of midpoint, ≥ `rewardsMinSize`; score model `S = ((v − s)/v)²`, single-sided penalty `c = 3.0`, two-sided required when midpoint ∉ [0.10, 0.90]. Re-quote on midpoint moves via WebSocket; heartbeat to avoid mass-cancel.
- **Market selection:** rank by reward pool / `rewardsDailyRate` ÷ competition & liquidity; concentrate capital where pool-per-competitor is best.
- **Risk:** inventory skew, max position, adverse-selection guard, global kill-switch, exposure limits.
- **Sim/backtest** using CLOB price-history endpoints; **monitoring dashboard** (live P&L, pUSD rewards accrued, fill rate, inventory).
- *Deliverable:* a running reward-farming/MM bot with a control panel.

### Phase 3 — Betfair venue (second platform)
- Backend: **cert login** + `X-Application`/`X-Authentication` + `keepAlive`; `listMarketCatalogue`/`listMarketBook`/`placeOrders`/`cancelOrders`/`getAccountFunds`; **Stream API** bridge for low-latency book.
- Extend shapes: **lay liability**, persistence type, runner/market status, matched-vs-unmatched.
- Frontend: full lay-liability display, commission/Expert-Fee awareness.
- Strategy: start with **value / pre-race trading** (delayed-key-tolerant) before scalping (needs live key + low latency + 2% tier).
- Decide live-key spend (£299–£499) once a strategy shows edge in sim.
- *Deliverable:* Betfair trading parity with Polymarket.

### Phase 4 — Cross-venue monitor *(optional, deprioritized)*
- Only if jurisdiction permits both. Opportunistic overlap monitor with heavy caveats (capital lock, resolution divergence). Not a core investment.

### Cross-cutting infrastructure
- **Secret management** (wallet keys, Betfair cert) server-side only.
- **Idempotent** order placement (request IDs), **rate-limit-aware** request layer, WebSocket **reconnect/resubscribe**.
- Observability, kill-switches, hard position/exposure limits, audit log of every order.

---

## 9. Key risks & open questions

1. **Jurisdiction (blocker):** which Polymarket venue; is Betfair available? — *needed before Phase 1.*
2. **Capital:** target deployable size? (drives market selection & reward-pool share.)
3. **UMA oracle resolution risk** on Polymarket (documented $7M misresolution).
4. **Time-sensitivity:** reward pools, fee schedule, and the USDC.e→USDC/pUSD migration are all in flux — the bot must read params live, not hard-code them.
5. **Betfair Expert Fee** caps the upside of a consistently winning Betfair bot at −40% above £100k/yr.
6. **CLOB v2 churn:** target the v2/unified SDK; expect further API movement.
7. **Confirm flagged figures** against primary sources before capital: Betfair live-key fee (£299 vs £499), exact taker-fee %, reward-pool sizes.

---

## 10. Sources (load-bearing)

**Polymarket:** Polymarket/agent-skills repo (authentication.md, market-data.md, order-patterns.md, websocket.md, gasless.md, SKILL.md); clob-client-v2 / py-clob-client-v2 READMEs; docs.polymarket.com (market-makers/liquidity-rewards, resolution); help.polymarket.com (trading fees, maker rebates); arXiv 2508.03474; CoinDesk/The Block (UMA Ukraine incident); CFTC PR 8478-22; regulatoryoversight.com (CFTC re-entry); theblock.co / fintechweekly (USDC migration).

**Betfair:** developer.betfair.com + betfair-developer-docs Atlassian (API-NG, Stream API, non-interactive login, data limits); betcode-org/betfair metadata.py; rdrr.io abettor bindings; betting.betfair.com + EGR + Racing Post (Expert Fee, 6 Jan 2025); caanberry.com (Expert Fee, legal countries, gubbing); gamingsoft (2025 commission); botblog.co.uk (API key).

**Cross-venue:** trevorlasn.com (Polymarket↔Kalshi arb); tradealgo.com (liquidity depth); startpolymarket.com (venue comparison, US status).

*Many primary docs (developer.betfair.com, docs.polymarket.com, help centers) return HTTP 403 to automated fetching; claims from them rest on search snippets + fetchable mirrors (GitHub repos, R/Go/Python wrappers) and are flagged inline where second-hand.*
