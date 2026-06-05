// Pure order-book state machine for the Polymarket CLOB market WebSocket.
//
// The market channel emits:
//   - `book`           full snapshot for an asset (token)
//   - `price_change`   incremental level changes (size 0 removes a level)
//   - `last_trade_price`
//   - `tick_size_change`
//
// We keep a per-asset book (price -> size maps) and derive BACK/LAY ladders the
// same way the REST path does (BACK = asks ascending, LAY = bids descending).
// No I/O here so it can be unit-tested against canned messages.

function createAssetBook() {
    return { bids: new Map(), asks: new Map(), lastTradePrice: null };
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

// Map a Polymarket side label to our book side. Buyers sit on the bids,
// sellers on the asks. Accept a few spellings defensively.
function sideToBook(book, side) {
    const s = String(side || '').toUpperCase();
    if (s === 'BUY' || s === 'BID') {
        return book.bids;
    }
    if (s === 'SELL' || s === 'ASK') {
        return book.asks;
    }
    return null;
}

function setLevels(map, levels) {
    for (const level of levels || []) {
        const price = num(level.price);
        const size = num(level.size);
        if (price === undefined) {
            continue;
        }
        if (!size) {
            map.delete(price); // size 0 (or missing) removes the level
        }
        else {
            map.set(price, size);
        }
    }
}

// Apply one decoded message to the book. Returns true if it changed the book
// (i.e. callers should re-emit ladders).
function applyEvent(book, msg) {
    const type = msg.event_type || msg.type;
    switch (type) {
        case 'book': {
            book.bids.clear();
            book.asks.clear();
            setLevels(book.bids, msg.bids);
            setLevels(book.asks, msg.asks);
            return true;
        }
        case 'price_change': {
            for (const change of msg.changes || []) {
                const map = sideToBook(book, change.side);
                if (map) {
                    setLevels(map, [ change ]);
                }
            }
            return true;
        }
        case 'last_trade_price': {
            const p = num(msg.price);
            if (p !== undefined) {
                book.lastTradePrice = p;
            }
            return false; // doesn't change the ladders themselves
        }
        default:
            return false;
    }
}

// Derive sorted BACK/LAY ladders from a book.
function ladders(book, depth = 5) {
    const toBack = [ ...book.asks.entries() ]
        .map(([ price, size ]) => ({ price, size }))
        .sort((a, b) => a.price - b.price)
        .slice(0, depth);
    const toLay = [ ...book.bids.entries() ]
        .map(([ price, size ]) => ({ price, size }))
        .sort((a, b) => b.price - a.price)
        .slice(0, depth);
    return { toBack, toLay };
}

export { createAssetBook, applyEvent, ladders };
