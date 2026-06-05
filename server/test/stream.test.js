import test from 'node:test';
import assert from 'node:assert/strict';

import { createAssetBook, applyEvent, ladders } from '../src/polymarket/stream.js';
import { PolymarketMarketStream } from '../src/polymarket/marketStream.js';

test('book snapshot then ladders sort BACK asc / LAY desc', () => {
    const book = createAssetBook();
    const changed = applyEvent(book, {
        event_type: 'book',
        asset_id: 'tok1',
        bids: [ { price: '0.29', size: '100' }, { price: '0.31', size: '300' } ],
        asks: [ { price: '0.33', size: '50' }, { price: '0.32', size: '80' } ],
    });
    assert.equal(changed, true);

    const { toBack, toLay } = ladders(book);
    assert.deepEqual(toBack.map((l) => l.price), [ 0.32, 0.33 ]);
    assert.deepEqual(toLay.map((l) => l.price), [ 0.31, 0.29 ]);
});

test('price_change applies deltas and size 0 removes a level', () => {
    const book = createAssetBook();
    applyEvent(book, {
        event_type: 'book', asset_id: 'tok1',
        bids: [ { price: '0.30', size: '100' } ],
        asks: [ { price: '0.34', size: '40' } ],
    });

    // Buyer improves the bid, seller adds a new ask level.
    applyEvent(book, {
        event_type: 'price_change',
        asset_id: 'tok1',
        changes: [
            { price: '0.31', side: 'BUY', size: '250' },
            { price: '0.33', side: 'SELL', size: '60' },
        ],
    });
    let { toBack, toLay } = ladders(book);
    assert.equal(toLay[0].price, 0.31);
    assert.equal(toLay[0].size, 250);
    assert.equal(toBack[0].price, 0.33);

    // Size 0 removes the 0.31 bid, leaving 0.30 as best.
    applyEvent(book, {
        event_type: 'price_change',
        asset_id: 'tok1',
        changes: [ { price: '0.31', side: 'BUY', size: '0' } ],
    });
    ({ toBack, toLay } = ladders(book));
    assert.equal(toLay[0].price, 0.30);
});

test('last_trade_price updates state but does not change ladders', () => {
    const book = createAssetBook();
    const changed = applyEvent(book, { event_type: 'last_trade_price', asset_id: 'tok1', price: '0.42' });
    assert.equal(changed, false);
    assert.equal(book.lastTradePrice, 0.42);
});

// A minimal fake WebSocket: records sent frames and lets the test drive events.
class FakeSocket {
    constructor(url) {
        this.url = url;
        this.sent = [];
        this.readyState = 1;
    }
    send(data) {
        this.sent.push(data);
    }
    close() {
        this.readyState = 3;
        if (this.onclose) {
            this.onclose();
        }
    }
    // test helpers
    open() {
        if (this.onopen) {
            this.onopen();
        }
    }
    emit(obj) {
        if (this.onmessage) {
            this.onmessage({ data: typeof obj === 'string' ? obj : JSON.stringify(obj) });
        }
    }
}

test('PolymarketMarketStream subscribes on open and emits ladders on book events', () => {
    let lastSocket;
    const updates = [];
    const stream = new PolymarketMarketStream({
        assetIds: [ 'tokA', 'tokB' ],
        onUpdate: (assetId, lad) => updates.push({ assetId, lad }),
        WebSocketImpl: class extends FakeSocket { constructor(u) { super(u); lastSocket = this; } },
        pingMs: 60000,
    });
    stream.start();
    lastSocket.open();

    // Subscribe frame sent with both token ids.
    const sub = JSON.parse(lastSocket.sent[0]);
    assert.deepEqual(sub, { assets_ids: [ 'tokA', 'tokB' ], type: 'market' });

    // A book event for tokA produces a normalised update.
    lastSocket.emit({
        event_type: 'book', asset_id: 'tokA',
        bids: [ { price: '0.40', size: '10' } ],
        asks: [ { price: '0.45', size: '20' } ],
    });
    assert.equal(updates.length, 1);
    assert.equal(updates[0].assetId, 'tokA');
    assert.equal(updates[0].lad.toBack[0].price, 0.45);
    assert.equal(updates[0].lad.toLay[0].price, 0.40);

    // Events for unknown assets are ignored.
    lastSocket.emit({ event_type: 'book', asset_id: 'unknown', bids: [], asks: [] });
    assert.equal(updates.length, 1);

    stream.close();
    assert.equal(lastSocket.readyState, 3);
});
