# Porting Guide — Betfair & Polymarket mappers → `backend-module-core`

This maps the validated prototype in this repo onto the real KOREX backend, so
the port is a fast, low-ambiguity job once `backend-module-core` (+
`backend-module-middleware`) are in a Claude session.

> Status: the prototype (this repo) is complete and offline-tested. The steps
> below are the actual port. New backend modules are **TypeScript** (KOREX
> modernization rule), even though `backend-module-core` is otherwise JS.

## Source (prototype, this repo — `server/`)
| File | What it is |
|---|---|
| `server/src/betfair/normalize.js` | pure `listMarketCatalogue` + `listMarketBook` → unified shape |
| `server/src/betfair/client.js` | JSON-RPC read client (`X-Application`/`X-Authentication`) |
| `server/src/polymarket/normalize.js` | pure Gamma + CLOB → unified shape |
| `server/src/polymarket/client.js` | Gamma + CLOB read client |
| `server/src/polymarket/stream.js` | pure order-book delta state machine |
| `server/src/polymarket/marketStream.js` | CLOB WebSocket client (injectable socket) |
| `server/src/handlers.js` | unified contract glue (markets/list, markets/get) |
| `server/fixtures/*`, `server/test/*` | sample responses + offline tests |

## Target (`backend-module-core`)
- **The seam:** `lib/services/markets/abios_market_mapper.js` is the pattern to
  sit alongside / replace. Per the Tech Stack audit it polls a source, maps to
  markets, **broadcasts updates on the Redis `faf` channel**, and feeds the
  `markets2_*` engine. New files:
  `lib/services/markets/betfair_market_mapper.ts`,
  `lib/services/markets/polymarket_market_mapper.ts`.

## What ports **unchanged** (pure, already tested)
The `normalize.js` functions and `stream.js` delta logic are side-effect-free
and fully covered by the offline tests. Convert JS→TS (add the unified-shape
types below); **the logic is identical** — re-add the fixture tests as TS.

## What must be **adapted** to backend-module-core internals
1. **HTTP client** — optionally swap the prototype's global `fetch` for the
   platform request util (`backend-utils` `request/request.js` / axios). Keep
   timeouts + the error→`statusCode` mapping.
2. **Secrets** — read from the platform secret store / env, never hardcoded:
   - Betfair: `BETFAIR_APP_KEY` (delayed key already generated), session token
     from login (interactive `/api/login` or cert login + `keepAlive`).
     Headers: `X-Application`, `X-Authentication`.
   - Polymarket read path: no auth (Gamma/CLOB read are public).
3. **Output (the key change)** — instead of returning JSON over the prototype's
   HTTP/SSE, each mapper should:
   - **Upsert** markets/runners into the `markets2` data model the same way
     `abios_market_mapper.js` does, **and**
   - **Broadcast** price/status updates on the Redis **`faf`** channel, matching
     the abios mapper's message shape.
4. **Scheduling / push** — use the `scheduler_abstract` pattern for polling
   cadence, or push: Betfair **Exchange Stream API** and Polymarket
   **WebSocket** — the prototype's `stream.js` delta logic ports directly to the
   Polymarket push path.
5. **Money** — prices as **BigNumber, smallest-unit, per-currency** (markets2
   convention); apply per-currency tick sizes (issue #101). Matched/unmatched
   liability then projects into the existing **Live Exposure** + **Net-Liability
   Heat Map** backoffice views for free.

## Unified shape (TypeScript interfaces to add)
```ts
type PriceType = 'DECIMAL_ODDS' | 'PROBABILITY';
type Side = 'BACK' | 'LAY';
interface Level { price: number; size: number | null; }
interface Runner {
  id: string;            // bf-r-<selectionId> | <polymarket tokenId>
  name: string;
  lastTradedPrice: number | null;
  toBack: Level[];       // prices available to BACK
  toLay: Level[];        // prices available to LAY
  // platform extras: selectionId? tokenId?
}
interface Market {
  id: string;            // bf-<marketId> | pm-<conditionId>
  platform: 'betfair' | 'polymarket';
  eventName: string;
  marketName: string;
  status: 'OPEN' | 'SUSPENDED' | 'CLOSED';
  priceType: PriceType;
  runners: Runner[];
  // platform extras: competition? conditionId? rewards?
}
```

## Step-by-step (run inside the `backend-module-core` session)
1. **Read** `abios_market_mapper.js` to learn the exact `markets2` upsert call
   + the Redis `faf` broadcast message shape (the two integration points).
2. Add the unified-shape **types** (above).
3. **Port the `normalize` + `stream` logic to TS verbatim**; bring the fixtures
   and tests across.
4. Implement **`betfair_market_mapper.ts`**: fetch (`listMarketCatalogue` +
   `listMarketBook`) or Exchange Stream → normalize → upsert + broadcast.
5. Implement **`polymarket_market_mapper.ts`**: Gamma + CLOB (+ WebSocket) →
   normalize → upsert + broadcast.
6. (If needed) add a read endpoint in **`backend-module-middleware`**, or rely
   on the existing `markets2` endpoints once markets are upserted.
7. **ChatGPT security review** on the money-touching paths (KOREX process).
8. Wire Betfair creds as env and test against the **delayed key** on the local
   stack.

## Caveats carried from the prototype
- **Network:** Betfair (`api.betfair.com`) and Polymarket (`gamma-api`/`clob`)
  hosts must be reachable where this runs — they were blocked in the prototype
  sandbox, so live validation happens on the KOREX local/hosted stack.
- **Licence:** live Betfair needs the **Betting Operator Licence** + the **£499
  Live App Key**; the free **Delayed App Key** is fine for development.
- **Scope:** balances + order placement are deliberately out of this read-path
  port (later trading phase).
