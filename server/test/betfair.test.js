import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { normalizeBetfairMarket, toBetfairMarketId } from '../src/betfair/normalize.js';

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(join(here, '..', 'fixtures', name), 'utf8'));

const catalogue = load('betfair-catalogue.json');
const book = load('betfair-book.json');

test('normalizeBetfairMarket joins catalogue + book into the unified shape', () => {
    const m = normalizeBetfairMarket(catalogue[0], book[0]);

    assert.equal(m.id, 'bf-1.234567890');
    assert.equal(m.platform, 'betfair');
    assert.equal(m.priceType, 'DECIMAL_ODDS');
    assert.equal(m.status, 'OPEN');
    assert.equal(m.eventName, 'Arsenal v Chelsea');
    assert.equal(m.marketName, 'Match Odds');
    assert.equal(m.competition, 'English Premier League');

    assert.equal(m.runners.length, 3);
    const arsenal = m.runners[0];
    assert.equal(arsenal.id, 'bf-r-47973');
    assert.equal(arsenal.name, 'Arsenal');
    assert.equal(arsenal.lastTradedPrice, 2.18);
    // toBack/toLay preserve Betfair's best-first ordering.
    assert.deepEqual(arsenal.toBack.map((l) => l.price), [ 2.18, 2.16 ]);
    assert.deepEqual(arsenal.toLay.map((l) => l.price), [ 2.2, 2.22 ]);
});

test('normalizeBetfairMarket tolerates a missing book (catalogue only)', () => {
    const m = normalizeBetfairMarket(catalogue[1], undefined);
    assert.equal(m.id, 'bf-1.987654321');
    assert.equal(m.runners.length, 2);
    assert.equal(m.runners[0].toBack.length, 0);
    assert.equal(m.runners[0].lastTradedPrice, null);
    // Status defaults to OPEN when no book is present.
    assert.equal(m.status, 'OPEN');
});

test('toBetfairMarketId strips the bf- prefix', () => {
    assert.equal(toBetfairMarketId('bf-1.234567890'), '1.234567890');
    assert.equal(toBetfairMarketId('1.234567890'), '1.234567890');
});
