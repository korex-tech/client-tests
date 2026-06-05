# Exchange backend (Phase 0)

A dependency-free Node backend implementing the unified exchange contract in
[`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md). It proxies the platform APIs
and normalises their responses into the shapes the React frontend expects.

**Phase 0 scope:** the **Polymarket read path** only —
`markets/list` and `markets/get` against the public Gamma + CLOB APIs.
Balances, orders, and Betfair return `NOT_IMPLEMENTED` until later phases.

## Run

```bash
cd server
npm start          # listens on http://localhost:4000 (PORT to override)
npm test           # node --test (offline; uses fixtures, no network)
```

No `npm install` is needed — it uses only Node built-ins (`node:http`, global
`fetch`). Requires Node ≥ 18 (developed on 22).

## Use it from the frontend

The frontend defaults to mock data. To point it at this backend:

```bash
# terminal 1
cd server && npm start

# terminal 2 (repo root)
REACT_APP_EXCHANGE_API=/api/exchange npm start
```

The CRA dev `proxy` (in the root `package.json`) forwards `/api/*` to
`localhost:4000`. With `REACT_APP_EXCHANGE_API` set, `ExchangeClient` switches
out of mock mode and calls the backend. The **Polymarket** tab then shows live
markets and order books; the **Betfair** tab shows "not available yet".

## ⚠️ Network allowlist

Polymarket's hosts (`gamma-api.polymarket.com`, `clob.polymarket.com`) must be
reachable. In a locked-down sandbox they may be blocked (`Host not in
allowlist`); run the backend somewhere those hosts are permitted (e.g. your
machine, or an environment whose network policy allows them). The
normalisation logic is unit-tested against fixtures independently of the
network, so tests pass with no connectivity.

## Layout

```
server/
  src/
    server.js              # node:http server, routing, CORS, /health
    handlers.js            # contract endpoints -> platform adapters (injectable client)
    polymarket/
      client.js            # Gamma + CLOB HTTP calls (read path)
      normalize.js         # pure response -> unified-shape mappers
      stream.js            # pure order-book delta state machine
      marketStream.js      # CLOB market WebSocket client (injectable socket)
  test/
    normalize.test.js      # unit tests for the mappers
    handlers.test.js       # endpoint tests with a fixture client (no network)
    stream.test.js         # book deltas + WebSocket client (fake socket)
    streamEndpoint.test.js # SSE endpoint test (injected fake stream)
  fixtures/                # sample Gamma market + CLOB book responses
```

## Live order-book stream (SSE)

`GET /api/exchange/stream?platform=polymarket&marketId=<id>` opens a
Server-Sent Events stream. The backend subscribes to the market's outcome
tokens on the Polymarket CLOB WebSocket, applies `book`/`price_change` deltas,
and emits `event: book` frames carrying `{ runnerId, toBack, toLay }`. The
frontend `MarketView` consumes this via `EventSource` and patches the book in
place (falling back to REST polling when streaming is unavailable).

## Next (Phase 1+)

- Polymarket trading: server-side L1 EIP-712 → L2 HMAC signing, order
  placement/cancel, balances. **Keys live only here, never in the browser.**
- Betfair adapter: cert login, JSON-RPC operations, Stream API.
