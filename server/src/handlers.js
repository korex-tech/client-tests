// Maps the unified backend contract (docs/API_CONTRACT.md) onto platform
// adapters. Phase 0 implements the READ path for BOTH providers:
//   /markets/list, /markets/get  -> live Polymarket + Betfair data
// Balances and orders still return NOT_IMPLEMENTED so the frontend degrades
// gracefully until the trading phases.
//
// Both platform clients are injected so handlers can be unit tested with
// fixtures and no network.

import * as defaultPolymarket from './polymarket/client.js';
import * as defaultBetfair from './betfair/client.js';
import { normalizeGammaMarket, mergeBook } from './polymarket/normalize.js';
import { normalizeBetfairMarket, toBetfairMarketId } from './betfair/normalize.js';

const NOT_IMPLEMENTED = (platform, what) => ({
    status: 'NOT_IMPLEMENTED',
    message: `${what} is not implemented yet for ${platform} (see docs/SCOPING_AND_PLAN.md).`,
});

function createHandlers({ client = defaultPolymarket, betfair = defaultBetfair } = {}) {

    async function listMarkets({ platform }) {
        if (platform === 'polymarket') {
            const raw = await client.fetchMarkets({ limit: 25 });
            const markets = raw
                .map(normalizeGammaMarket)
                // Drop degenerate markets with no priced outcomes.
                .filter((m) => m.runners.length > 0);
            return { status: 'OK', markets };
        }
        if (platform === 'betfair') {
            const catalogue = await betfair.fetchCatalogue({ maxResults: 25 });
            const ids = catalogue.map((m) => m.marketId);
            const books = ids.length ? await betfair.fetchMarketBook(ids) : [];
            const bookById = new Map(books.map((b) => [ b.marketId, b ]));
            const markets = catalogue.map((m) => normalizeBetfairMarket(m, bookById.get(m.marketId)));
            return { status: 'OK', markets };
        }
        return NOT_IMPLEMENTED(platform, 'listMarkets');
    }

    async function getMarket({ platform, marketId }) {
        if (platform === 'polymarket') {
            // Our ids are prefixed with the conditionId; the Gamma lookup needs
            // the numeric gamma id, so we re-list and match. (A later
            // optimisation can cache the id mapping or use the by-id endpoint.)
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
                    // A missing/failed book leaves the indicative price in place.
                }
            }));
            market = mergeBook(market, booksByTokenId);
            return { status: 'OK', market };
        }
        if (platform === 'betfair') {
            const id = toBetfairMarketId(marketId);
            const catalogue = await betfair.fetchCatalogue({ marketIds: [ id ] });
            if (!catalogue || catalogue.length === 0) {
                return { status: 'NOT_FOUND' };
            }
            const books = await betfair.fetchMarketBook([ id ]);
            const market = normalizeBetfairMarket(catalogue[0], (books || [])[0]);
            return { status: 'OK', market };
        }
        return NOT_IMPLEMENTED(platform, 'getMarket');
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
