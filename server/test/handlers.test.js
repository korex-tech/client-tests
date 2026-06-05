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
const betfairCatalogue = load('betfair-catalogue.json');
const betfairBook = load('betfair-book.json');

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

// A fake Betfair client serving catalogue + book fixtures.
function fakeBetfair() {
    return {
        fetchCatalogue: async ({ marketIds } = {}) => (
            marketIds
                ? betfairCatalogue.filter((m) => marketIds.includes(m.marketId))
                : betfairCatalogue
        ),
        fetchMarketBook: async (marketIds) => (
            betfairBook.filter((b) => marketIds.includes(b.marketId))
        ),
    };
}

const deps = () => ({ client: fakeClient(), betfair: fakeBetfair() });

test('markets/list returns normalised Polymarket markets', async () => {
    const handlers = createHandlers(deps());
    const res = await handlers['markets/list']({ platform: 'polymarket' });

    assert.equal(res.status, 'OK');
    assert.equal(res.markets.length, 2);
    assert.equal(res.markets[0].id, 'pm-0xdef456abc');
    assert.equal(res.markets[0].priceType, 'PROBABILITY');
});

test('markets/list returns normalised Betfair markets', async () => {
    const handlers = createHandlers(deps());
    const res = await handlers['markets/list']({ platform: 'betfair' });

    assert.equal(res.status, 'OK');
    assert.equal(res.markets.length, 2);
    assert.equal(res.markets[0].id, 'bf-1.234567890');
    assert.equal(res.markets[0].priceType, 'DECIMAL_ODDS');
    assert.equal(res.markets[0].eventName, 'Arsenal v Chelsea');
    // First market has a book fixture → ladders populated; second has none.
    assert.equal(res.markets[0].runners[0].toBack[0].price, 2.18);
    assert.equal(res.markets[1].runners[0].toBack.length, 0);
});

test('markets/get merges the order book into the matched Polymarket market', async () => {
    const handlers = createHandlers(deps());
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

test('markets/get returns a Betfair market with back/lay ladders', async () => {
    const handlers = createHandlers(deps());
    const res = await handlers['markets/get']({
        platform: 'betfair',
        marketId: 'bf-1.234567890',
    });

    assert.equal(res.status, 'OK');
    assert.equal(res.market.platform, 'betfair');
    assert.equal(res.market.runners.length, 3);
    assert.equal(res.market.runners[0].name, 'Arsenal');
    assert.equal(res.market.runners[0].toBack[0].price, 2.18);
    assert.equal(res.market.runners[0].toLay[0].price, 2.2);
});

test('markets/get returns NOT_FOUND for an unknown id', async () => {
    const handlers = createHandlers(deps());
    const res = await handlers['markets/get']({
        platform: 'polymarket',
        marketId: 'pm-does-not-exist',
    });
    assert.equal(res.status, 'NOT_FOUND');
});

test('orders and balance are NOT_IMPLEMENTED', async () => {
    const handlers = createHandlers(deps());
    for (const route of [ 'account/balance', 'orders/place', 'orders/cancel', 'orders/open' ]) {
        const res = await handlers[route]({ platform: 'polymarket' });
        assert.equal(res.status, 'NOT_IMPLEMENTED', route);
    }
});
