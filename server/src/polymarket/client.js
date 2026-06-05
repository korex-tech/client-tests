// Thin HTTP client for Polymarket's public read APIs (Gamma + CLOB).
//
// Only the read path is needed for Phase 0 (market discovery + order books),
// so none of these calls require auth. Base URLs are overridable via env so
// tests can point at a local fixture server, and so the host can be swapped if
// Polymarket changes domains.
//
// NOTE: in a locked-down network these hosts may be blocked ("Host not in
// allowlist"); the normalisation layer is unit-tested independently of network.

const GAMMA_BASE = process.env.POLYMARKET_GAMMA_BASE || 'https://gamma-api.polymarket.com';
const CLOB_BASE = process.env.POLYMARKET_CLOB_BASE || 'https://clob.polymarket.com';
const DEFAULT_TIMEOUT_MS = Number(process.env.POLYMARKET_TIMEOUT_MS || 12000);

async function getJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });
        if (!res.ok) {
            const err = new Error(`Polymarket request failed: ${res.status} ${url}`);
            err.statusCode = res.status;
            throw err;
        }
        return await res.json();
    }
    finally {
        clearTimeout(timer);
    }
}

// Gamma /markets returns either a bare array or a paginated wrapper depending
// on the call; normalise to an array.
function asArray(json) {
    if (Array.isArray(json)) {
        return json;
    }
    if (json && Array.isArray(json.data)) {
        return json.data;
    }
    if (json && Array.isArray(json.markets)) {
        return json.markets;
    }
    return [];
}

// List active, open markets ordered by recent volume.
async function fetchMarkets({ limit = 25 } = {}) {
    const qs = new URLSearchParams({
        active: 'true',
        closed: 'false',
        order: 'volume24hr',
        ascending: 'false',
        limit: String(limit),
    });
    const json = await getJson(`${GAMMA_BASE}/markets?${qs.toString()}`);
    return asArray(json);
}

// Fetch a single Gamma market by its numeric id.
async function fetchMarketById(gammaId) {
    const json = await getJson(`${GAMMA_BASE}/markets/${encodeURIComponent(gammaId)}`);
    // Endpoint may return the object directly or wrapped in an array.
    if (Array.isArray(json)) {
        return json[0];
    }
    return json;
}

// Fetch the CLOB order book for a single outcome token.
async function fetchBook(tokenId) {
    const qs = new URLSearchParams({ token_id: String(tokenId) });
    return getJson(`${CLOB_BASE}/book?${qs.toString()}`);
}

export {
    GAMMA_BASE,
    CLOB_BASE,
    fetchMarkets,
    fetchMarketById,
    fetchBook,
};
