// Maps the unified backend contract (docs/API_CONTRACT.md) onto platform
// adapters. Phase 0 implements the Polymarket READ path only:
//   /markets/list, /markets/get  -> live Polymarket data
// Everything else (Betfair, balances, orders) returns NOT_IMPLEMENTED so the
// frontend degrades gracefully until later phases.
//
// Dependencies (the Polymarket client) are injected so handlers can be unit
// tested with fixtures and no network.

import * as defaultClient from './polymarket/client.js';
import { normalizeGammaMarket, mergeBook } from './polymarket/normalize.js';

const NOT_IMPLEMENTED = (platform, what) => ({
    status: 'NOT_IMPLEMENTED',
    message: `${what} is not implemented yet for ${platform} (see docs/SCOPING_AND_PLAN.md).`,
});

function createHandlers({ client = defaultClient } = {}) {

    async function listMarkets({ platform }) {
        if (platform !== 'polymarket') {
            return NOT_IMPLEMENTED(platform, 'listMarkets');
        }
        const raw = await client.fetchMarkets({ limit: 25 });
        const markets = raw
            .map(normalizeGammaMarket)
            // Drop degenerate markets with no priced outcomes.
            .filter((m) => m.runners.length > 0);
        return { status: 'OK', markets };
    }

    async function getMarket({ platform, marketId }) {
        if (platform !== 'polymarket') {
            return NOT_IMPLEMENTED(platform, 'getMarket');
        }
        // Our ids are prefixed with the conditionId; the Gamma lookup needs the
        // numeric gamma id, so we re-list and match. (A later optimisation can
        // cache the id mapping or use the by-id endpoint with the gamma id.)
        const gammaId = stripGammaId(marketId);
        const rawMarket = gammaId
            ? await client.fetchMarketById(gammaId)
            : await findMarketByPrefixedId(client, marketId);
        if (!rawMarket) {
            return { status: 'NOT_FOUND' };
        }
        let market = normalizeGammaMarket(rawMarket);

        // Fetch each runner's order book and merge in the BACK/LAY ladders.
        const booksByTokenId = {};
        await Promise.all(market.runners.map(async (runner) => {
            if (!runner.tokenId) {
                return;
            }
            try {
                booksByTokenId[runner.tokenId] = await client.fetchBook(runner.tokenId);
            }
            catch (err) {
                // A missing/failed book just leaves the indicative price in place.
            }
        }));
        market = mergeBook(market, booksByTokenId);
        return { status: 'OK', market };
    }

    function getBalance({ platform }) {
        return Promise.resolve(NOT_IMPLEMENTED(platform, 'getBalance'));
    }
    function placeOrder({ platform }) {
        return Promise.resolve(NOT_IMPLEMENTED(platform, 'placeOrder'));
    }
    function cancelOrder({ platform }) {
        return Promise.resolve(NOT_IMPLEMENTED(platform, 'cancelOrder'));
    }
    function listOpenOrders({ platform }) {
        return Promise.resolve(NOT_IMPLEMENTED(platform, 'listOpenOrders'));
    }

    return {
        'markets/list': listMarkets,
        'markets/get': getMarket,
        'account/balance': getBalance,
        'orders/place': placeOrder,
        'orders/cancel': cancelOrder,
        'orders/open': listOpenOrders,
    };
}

// Our market id looks like `pm-<conditionId>`. We don't carry the gamma id in
// it, so we can't derive the numeric id directly — return null to signal the
// caller should fall back to a list-and-match lookup.
function stripGammaId(marketId) {
    return null; // reserved for a future id scheme that embeds the gamma id
}

async function findMarketByPrefixedId(client, marketId) {
    const raw = await client.fetchMarkets({ limit: 100 });
    return raw.find((m) => `pm-${m.conditionId || m.id}` === marketId);
}

// Resolve a market id to its outcome tokens so the stream can subscribe.
// Returns [{ runnerId, tokenId, name }] or null if the market isn't found.
async function resolveMarketTokens(client, marketId) {
    const raw = await findMarketByPrefixedId(client, marketId);
    if (!raw) {
        return null;
    }
    const market = normalizeGammaMarket(raw);
    return market.runners
        .filter((r) => r.tokenId)
        .map((r) => ({ runnerId: r.id, tokenId: r.tokenId, name: r.name }));
}

export { createHandlers, resolveMarketTokens };
