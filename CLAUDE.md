# CLAUDE.md — `client-tests`

Guidance for Claude / AI agents working in this repo. (KOREX convention:
per-repo CLAUDE.md for agent onboarding.) **Single source of truth is the
Korex Notion hub** — say "Check the Korex Notion hub" to resume context.

## What this repo is
KOREX's **UI testing client** — a Create React App (React 18 + React Router +
Semantic UI). Historically a thin harness around the backend API
(`src/api/EclContext.js` → `/v1/account/*`, session via the `ecltoken` header).
It is the **public** fork in the `korex-tech` org.

## What lives here now (branch `claude/betfair-polymarket-apis-dOX8q`, PR #2)
A **prototype + blueprint** for the Betfair × Polymarket **exchange data
integration** (powering the live `/exchange` "Prediction Market"). This repo is
the *rehearsal*; the real integration ports into `backend-module-core`.

- **`docs/SCOPING_AND_PLAN.md`** — cited research + money-first phased plan.
- **`docs/API_CONTRACT.md`** — the unified backend contract (normalised
  market/runner/order shapes; per-platform mapping notes).
- **`docs/PORTING_GUIDE.md`** — how to port the prototype into
  `backend-module-core` at the `abios_market_mapper.js` seam (read this before
  porting).
- **`server/`** — dependency-free Node backend prototype (Node built-ins +
  global `fetch`, **no npm install**). Read path for **both** providers:
  - `server/src/betfair/` — `listMarketCatalogue` + `listMarketBook` → unified
    back/lay shape (JSON-RPC client + pure `normalize`).
  - `server/src/polymarket/` — Gamma + CLOB read → unified Yes/No shape, plus a
    WebSocket→SSE live order-book bridge (`stream.js`, `marketStream.js`).
  - `server/src/handlers.js` — `markets/list` + `markets/get` for both;
    balances/orders return `NOT_IMPLEMENTED` (trading is a later phase).
  - Tests: `cd server && node --test` (19 tests, offline against fixtures).
- **`src/ui/exchange/`** — a React `/exchange` trading UI. Mock by default; set
  `REACT_APP_EXCHANGE_API=/api/exchange` to drive it from `server/` (CRA dev
  proxy to `localhost:4000`).

## Key facts / gotchas
- **Network:** the dev sandbox blocks Betfair (`api.betfair.com`) and Polymarket
  (`gamma-api`/`clob`) hosts — live calls run on the KOREX stack, not here.
  Normalisation is unit-tested independently of the network.
- **Betfair auth:** needs `BETFAIR_APP_KEY` (free **delayed** key already
  generated) **and** a session token (`BETFAIR_SESSION_TOKEN` from login). Live
  use needs a **Betting Operator Licence** + £499 live key. Secrets via env only.
- **Polymarket:** read APIs are **public, no auth/account**. Trading (later)
  needs a Polygon wallet + USDC + L1/L2 signing, and is geo-blocked UK/EU/US.
- **Money rule (matches backend):** BigNumber, smallest-unit, **per-currency,
  never cross-currency**; server formats money, client renders only.

## Conventions
- Frontend: ESLint `react-app` config — **curly braces required**, **Stroustrup
  brace style** (`else` on its own line), no nested ternaries. Match existing
  files (4-space indent, trailing commas in lists).
- `server/`: ES modules, Node built-ins only, injectable clients for testing.
- Don't commit secrets. App keys/tokens go in env, never in code or docs.

## Where the real work goes
The integration's true home is **`backend-module-core`** (mapper module at the
abios seam → `markets2` → Redis `faf` broadcast) + a read endpoint in
**`backend-module-middleware`**. Follow `docs/PORTING_GUIDE.md`. The Notion spec
is **"Betfair × Polymarket — Exchange Integration Spec"** under Developer Handoff.
