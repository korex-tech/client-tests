// Thin JSON-RPC client for the Betfair Exchange API (read path).
//
// Betfair has no CORS and uses certificate/session auth, so this must run
// server-side. Credentials come from env (the app key + a session token from
// the cert-login flow). Base URL is overridable for tests.
//
// ⚠️ Commercial use of the Betfair API requires an operator/odds data licence
// (a personal app key is "personal use only"). See the Notion integration spec.
// ⚠️ These hosts may be blocked by a network allowlist; the normalisation layer
// is unit-tested independently of the network.

const API_BASE = process.env.BETFAIR_API_BASE || 'https://api.betfair.com';
const APP_KEY = process.env.BETFAIR_APP_KEY;
const SESSION_TOKEN = process.env.BETFAIR_SESSION_TOKEN;
const TIMEOUT_MS = Number(process.env.BETFAIR_TIMEOUT_MS || 12000);
const RPC_URL = `${API_BASE}/exchange/betting/json-rpc/v1`;

async function rpc(method, params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Application': APP_KEY || '',
                'X-Authentication': SESSION_TOKEN || '',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: `SportsAPING/v1.0/${method}`,
                params,
                id: 1,
            }),
            signal: controller.signal,
        });
        if (!res.ok) {
            const err = new Error(`Betfair request failed: ${res.status}`);
            err.statusCode = res.status;
            throw err;
        }
        const body = await res.json();
        if (body.error) {
            const err = new Error(`Betfair RPC error: ${JSON.stringify(body.error)}`);
            err.statusCode = 502;
            throw err;
        }
        return body.result;
    }
    finally {
        clearTimeout(timer);
    }
}

// Static market metadata. Pass { marketIds } to fetch specific markets, or
// { eventTypeIds } (e.g. ["1"] = Soccer) to browse.
async function fetchCatalogue({ marketIds, eventTypeIds = [ '1' ], maxResults = 25 } = {}) {
    const filter = marketIds ? { marketIds } : { eventTypeIds };
    return rpc('listMarketCatalogue', {
        filter,
        marketProjection: [ 'EVENT', 'COMPETITION', 'RUNNER_DESCRIPTION', 'MARKET_START_TIME' ],
        sort: 'MAXIMUM_TRADED',
        maxResults,
    });
}

// Live prices for a set of markets (best back/lay offers).
async function fetchMarketBook(marketIds) {
    return rpc('listMarketBook', {
        marketIds,
        priceProjection: { priceData: [ 'EX_BEST_OFFERS' ] },
    });
}

export { fetchCatalogue, fetchMarketBook, RPC_URL };
