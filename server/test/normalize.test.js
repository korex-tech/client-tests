import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
    parseMaybeJsonArray,
    normalizeGammaMarket,
    normalizeBook,
    mergeBook,
} from '../src/polymarket/normalize.js';

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(join(here, '..', 'fixtures', name), 'utf8'));

const gammaMarkets = load('gamma-markets.json');
const clobBook = load('clob-book.json');

test('parseMaybeJsonArray handles JSON strings, arrays, and junk', () => {
    assert.deepEqual(parseMaybeJsonArray('["Yes", "No"]'), [ 'Yes', 'No' ]);
    assert.deepEqual(parseMaybeJsonArray([ 'a', 'b' ]), [ 'a', 'b' ]);
    assert.deepEqual(parseMaybeJsonArray('not json'), []);
    assert.deepEqual(parseMaybeJsonArray(undefined), []);
});

test('normalizeGammaMarket maps a Gamma market to the unified shape', () => {
    const m = normalizeGammaMarket(gammaMarkets[0]);

    assert.equal(m.platform, 'polymarket');
    assert.equal(m.id, 'pm-0xdef456abc');
    assert.equal(m.gammaId, '516710');
    assert.equal(m.conditionId, '0xdef456abc');
    assert.equal(m.priceType, 'PROBABILITY');
    assert.equal(m.status, 'OPEN');
    assert.equal(m.eventName, 'Crypto prices 2026');
    assert.equal(m.marketName, 'Will BTC close above $150k in 2026?');

    // Reward params are surfaced for the Phase 2 market-making strategy.
    assert.equal(m.rewards.minSize, 200);
    assert.equal(m.rewards.maxSpread, 3.5);

    // Two outcomes, parsed prices, token ids carried through.
    assert.equal(m.runners.length, 2);
    assert.equal(m.runners[0].name, 'Yes');
    assert.equal(m.runners[0].lastTradedPrice, 0.31);
    assert.ok(m.runners[0].tokenId.startsWith('7132104'));
    assert.equal(m.runners[1].name, 'No');
    assert.equal(m.runners[1].lastTradedPrice, 0.69);
});

test('gamma status reflects active/closed flags', () => {
    assert.equal(normalizeGammaMarket({ ...gammaMarkets[0], closed: true }).status, 'CLOSED');
    assert.equal(normalizeGammaMarket({ ...gammaMarkets[0], active: false }).status, 'SUSPENDED');
});

test('normalizeBook sorts BACK ascending (asks) and LAY descending (bids)', () => {
    const { toBack, toLay } = normalizeBook(clobBook);

    // BACK = asks, best (lowest) first.
    assert.deepEqual(toBack.map((l) => l.price), [ 0.32, 0.33 ]);
    assert.equal(toBack[0].size, 1850);

    // LAY = bids, best (highest) first.
    assert.deepEqual(toLay.map((l) => l.price), [ 0.31, 0.30, 0.29 ]);
    assert.equal(toLay[0].size, 8800);
});

test('mergeBook fills ladders for the matching runner only', () => {
    const market = normalizeGammaMarket(gammaMarkets[0]);
    const tokenId = market.runners[0].tokenId;
    const merged = mergeBook(market, { [tokenId]: clobBook });

    // Runner 0 (matching token) gets the full ladder...
    assert.equal(merged.runners[0].toBack.length, 2);
    assert.equal(merged.runners[0].toBack[0].price, 0.32);
    // ...runner 1 (no book provided) keeps its single indicative level.
    assert.equal(merged.runners[1].toBack.length, 1);
    assert.equal(merged.runners[1].toBack[0].price, 0.69);
});
