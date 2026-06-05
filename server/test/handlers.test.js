import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createHandlers } from '../src/handlers.js';

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(join(here, '..', 'fixtures', name), 'utf8'));

const gammaMarkets = load('gamma-markets.json');
const clobBook = load('clob-book.json');

// A fake Polymarket client that serves fixtures instead of hitting the network.
function fakeClient() {
    return {
        fetchMarkets: async () => gammaMarkets,
        fetchMarketById: async () => undefined, // force the list-and-match path
        fetchBook: async (tokenId) => {
            // Only the first market's first token has a book in our fixtures.
            const firstToken = JSON.parse(gammaMarkets[0].clobTokenIds)[0];
            if (tokenId === firstToken) {
                return clobBook;
            }
            throw new Error('no book');
        },
    };
}

test('markets/list returns normalised Polymarket markets', async () => {
    const handlers = createHandlers({ client: fakeClient() });
    const res = await handlers['markets/list']({ platform: 'polymarket' });

    assert.equal(res.status, 'OK');
    assert.equal(res.markets.length, 2);
    assert.equal(res.markets[0].id, 'pm-0xdef456abc');
    assert.equal(res.markets[0].priceType, 'PROBABILITY');
});

test('markets/list returns NOT_IMPLEMENTED for betfair', async () => {
    const handlers = createHandlers({ client: fakeClient() });
    const res = await handlers['markets/list']({ platform: 'betfair' });
    assert.equal(res.status, 'NOT_IMPLEMENTED');
});

test('markets/get merges the order book into the matched market', async () => {
    const handlers = createHandlers({ client: fakeClient() });
    const res = await handlers['markets/get']({
        platform: 'polymarket',
        marketId: 'pm-0xdef456abc',
    });

    assert.equal(res.status, 'OK');
    assert.equal(res.market.id, 'pm-0xdef456abc');
    // The first runner's ladder came from the CLOB book fixture.
    assert.equal(res.market.runners[0].toBack[0].price, 0.32);
    assert.equal(res.market.runners[0].toLay[0].price, 0.31);
});

test('markets/get returns NOT_FOUND for an unknown id', async () => {
    const handlers = createHandlers({ client: fakeClient() });
    const res = await handlers['markets/get']({
        platform: 'polymarket',
        marketId: 'pm-does-not-exist',
    });
    assert.equal(res.status, 'NOT_FOUND');
});

test('orders and balance are NOT_IMPLEMENTED in Phase 0', async () => {
    const handlers = createHandlers({ client: fakeClient() });
    for (const route of [ 'account/balance', 'orders/place', 'orders/cancel', 'orders/open' ]) {
        const res = await handlers[route]({ platform: 'polymarket' });
        assert.equal(res.status, 'NOT_IMPLEMENTED', route);
    }
});
