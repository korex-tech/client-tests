# Exchange Trading Backend — API Contract

The trading frontend (`src/ui/exchange/*`) talks to the backend through
`src/api/ExchangeClient.js`. While the backend is being built, the client runs
in **mock mode** (`USE_MOCK = true`) and returns the shapes below from
`src/api/mockData.js`. When the backend is ready, set `USE_MOCK = false` (or set
`REACT_APP_EXCHANGE_API`) and the UI works unchanged — as long as the backend
honours this contract.

## Why a backend is required

Neither platform can be called safely from the browser:

- **Betfair** — no CORS support, and certificate / non-interactive login cannot
  run client-side. The backend holds the app key + session token and proxies
  the JSON-RPC Exchange API.
- **Polymarket** — trading requires HMAC-SHA256 request signing and an EIP-712
  wallet key. These secrets must never reach the browser; the backend signs.

The backend's job is to normalise both platforms into the unified shapes below.

## Transport

- All calls are `POST` with a JSON body to `${API_BASE}${path}`
  (`API_BASE` defaults to `/api/exchange`).
- Auth: `Authorization: Bearer <sessionToken>` when a session token is set.
- Every response includes a `status` field: `"OK"` on success, otherwise an
  error code (e.g. `"NOT_FOUND"`, `"AUTH_FAILED"`, `"INSUFFICIENT_FUNDS"`).

## Normalised shapes

```jsonc
// market
{
  "id": "bf-1.234567890",
  "platform": "betfair",              // "betfair" | "polymarket"
  "eventName": "Arsenal v Chelsea",
  "marketName": "Match Odds",
  "status": "OPEN",
  "priceType": "DECIMAL_ODDS",        // "DECIMAL_ODDS" | "PROBABILITY"
  "runners": [
    {
      "id": "bf-r-47973",
      "name": "Arsenal",
      "lastTradedPrice": 2.18,
      "toBack": [ { "price": 2.18, "size": 540 } ],   // best prices to BACK
      "toLay":  [ { "price": 2.20, "size": 430 } ]    // best prices to LAY
    }
  ]
}

// balance
{ "currency": "GBP", "available": 1250.40, "exposure": 180.00 }

// order (as returned after placement)
{
  "orderId": "ord-ab12cd34",
  "status": "MATCHED",                // MATCHED | UNMATCHED | PARTIALLY_MATCHED
  "platform": "betfair",
  "marketId": "bf-1.234567890",
  "runnerId": "bf-r-47973",
  "runnerName": "Arsenal",
  "side": "BACK",                     // "BACK" | "LAY"
  "price": 2.18,
  "size": 50,
  "placedAt": "2026-06-05T12:00:00.000Z"
}
```

`side` is always `BACK` / `LAY`. The backend maps these to Polymarket
buy/sell-share semantics (BACK ≈ buy the outcome token, LAY ≈ sell it).

## Endpoints

| Path                | Request body                                                            | Response (on `OK`)            |
| ------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| `/markets/list`     | `{ platform }`                                                          | `{ status, markets: [...] }`  |
| `/markets/get`      | `{ platform, marketId }`                                                | `{ status, market }`          |
| `/account/balance`  | `{ platform }`                                                          | `{ status, balance }`         |
| `/orders/place`     | `{ platform, marketId, runnerId, runnerName, side, price, size }`       | `{ status, order }`           |
| `/orders/cancel`    | `{ platform, orderId }`                                                 | `{ status, orderId }`         |
| `/orders/open`      | `{ platform }`                                                          | `{ status, orders: [...] }`   |

## Suggested backend → platform mapping

| Unified call      | Betfair (JSON-RPC)                          | Polymarket                                  |
| ----------------- | ------------------------------------------- | ------------------------------------------- |
| `/markets/list`   | `listMarketCatalogue`                       | Gamma API `GET /markets`                    |
| `/markets/get`    | `listMarketBook`                            | CLOB `GET /book`, `GET /price`              |
| `/account/balance`| `getAccountFunds`                           | Data API positions / on-chain USDC balance  |
| `/orders/place`   | `placeOrders`                               | CLOB signed order submit                     |
| `/orders/cancel`  | `cancelOrders`                              | CLOB `cancel`                                |
| `/orders/open`    | `listCurrentOrders`                         | CLOB open orders                             |

## Future: real-time prices

Both platforms offer streaming (Betfair Exchange Stream API, Polymarket
WebSocket). A follow-up can add a WebSocket bridge on the backend and have the
client subscribe instead of polling `/markets/get`. The UI already isolates the
book in `MarketView`, so only that component needs to change.
