// Pure functions mapping raw Betfair Exchange API responses into the unified
// shapes the frontend expects (see docs/API_CONTRACT.md). No network here, so
// these are unit-tested against fixtures offline.
//
// Betfair splits data across two calls:
//   listMarketCatalogue -> static metadata (event/market/runner names)
//   listMarketBook      -> live prices (availableToBack/Lay, status, lastPriceTraded)
// We join them by marketId + selectionId.

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

function levels(arr, depth = 5) {
    // Betfair returns price ladders best-first already; keep that order.
    return (arr || [])
        .map((l) => ({ price: num(l.price), size: num(l.size) }))
        .filter((l) => l.price !== undefined)
        .slice(0, depth);
}

// Index a listMarketBook response's runners by selectionId.
function indexBookRunners(book) {
    const map = new Map();
    for (const r of (book && book.runners) || []) {
        map.set(r.selectionId, r);
    }
    return map;
}

// Map a catalogue market (+ optional matching book) to the unified shape.
function normalizeBetfairMarket(catalogue, book) {
    const bookRunners = indexBookRunners(book);

    const runners = (catalogue.runners || []).map((r) => {
        const b = bookRunners.get(r.selectionId);
        const ex = (b && b.ex) || {};
        return {
            id: `bf-r-${r.selectionId}`,
            selectionId: r.selectionId,
            name: r.runnerName,
            lastTradedPrice: b ? (num(b.lastPriceTraded) ?? null) : null,
            // toBack = prices you can BACK at (Betfair's availableToBack);
            // toLay  = prices you can LAY at (availableToLay).
            toBack: levels(ex.availableToBack),
            toLay: levels(ex.availableToLay),
        };
    });

    return {
        id: `bf-${catalogue.marketId}`,
        platform: 'betfair',
        marketId: catalogue.marketId,
        eventName: (catalogue.event && catalogue.event.name) || catalogue.marketName || 'Event',
        marketName: catalogue.marketName || 'Market',
        competition: (catalogue.competition && catalogue.competition.name) || null,
        status: (book && book.status) || 'OPEN',
        priceType: 'DECIMAL_ODDS',
        runners,
    };
}

// Strip our `bf-` prefix back to a raw Betfair marketId.
function toBetfairMarketId(prefixedId) {
    return prefixedId && prefixedId.startsWith('bf-')
        ? prefixedId.slice(3)
        : prefixedId;
}

export { normalizeBetfairMarket, indexBookRunners, toBetfairMarketId };
