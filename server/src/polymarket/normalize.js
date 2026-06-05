// Pure functions that map raw Polymarket API responses into the unified shapes
// the frontend expects (see docs/API_CONTRACT.md). No network here — these are
// kept side-effect-free so they can be unit-tested against fixtures offline.

// Gamma encodes several array fields as JSON strings, e.g.
//   outcomes: '["Yes", "No"]'
// Parse defensively: accept already-parsed arrays, JSON strings, or undefined.
function parseMaybeJsonArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string' && value.length > 0) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch (err) {
            return [];
        }
    }
    return [];
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

// Derive our market status from Gamma's active/closed flags.
function gammaStatus(market) {
    if (market.closed === true) {
        return 'CLOSED';
    }
    if (market.active === false) {
        return 'SUSPENDED';
    }
    return 'OPEN';
}

// A human event name: prefer the parent event title, fall back to group/question.
function gammaEventName(market) {
    if (Array.isArray(market.events) && market.events.length > 0 && market.events[0].title) {
        return market.events[0].title;
    }
    return market.groupItemTitle || market.question || 'Unknown event';
}

// Map a single Gamma market object to our normalised market.
// At list level we only have a single indicative price per outcome
// (outcomePrices); order-book ladders are filled later by mergeBook().
function normalizeGammaMarket(market) {
    const outcomes = parseMaybeJsonArray(market.outcomes);
    const prices = parseMaybeJsonArray(market.outcomePrices);
    const tokenIds = parseMaybeJsonArray(market.clobTokenIds);

    const runners = outcomes.map((name, i) => {
        const price = toNumber(prices[i]);
        const tokenId = tokenIds[i];
        const level = price === undefined ? [] : [ { price, size: null } ];
        return {
            id: tokenId || `${market.id}-${i}`,
            tokenId: tokenId || null,
            name,
            lastTradedPrice: price === undefined ? null : price,
            toBack: level,   // best prices available to BACK (buy this outcome)
            toLay: level,    // best prices available to LAY  (sell this outcome)
        };
    });

    return {
        id: `pm-${market.conditionId || market.id}`,
        platform: 'polymarket',
        // Keep the source ids so /markets/get can fetch the book and trade later.
        gammaId: String(market.id),
        conditionId: market.conditionId || null,
        eventName: gammaEventName(market),
        marketName: market.question || market.groupItemTitle || 'Market',
        status: gammaStatus(market),
        priceType: 'PROBABILITY',
        // Maker-reward parameters the market-making strategy keys off (Phase 2).
        rewards: {
            minSize: toNumber(market.rewardsMinSize) ?? null,
            maxSpread: toNumber(market.rewardsMaxSpread) ?? null,
        },
        runners,
    };
}

// Map a CLOB order-book response for one token into BACK/LAY ladders.
//   To BACK (buy the token) you take the asks  -> sorted ascending (best = lowest).
//   To LAY  (sell the token) you hit the bids  -> sorted descending (best = highest).
function normalizeBook(book, depth = 5) {
    const asks = (book.asks || [])
        .map((l) => ({ price: toNumber(l.price), size: toNumber(l.size) }))
        .filter((l) => l.price !== undefined)
        .sort((a, b) => a.price - b.price)
        .slice(0, depth);
    const bids = (book.bids || [])
        .map((l) => ({ price: toNumber(l.price), size: toNumber(l.size) }))
        .filter((l) => l.price !== undefined)
        .sort((a, b) => b.price - a.price)
        .slice(0, depth);
    return { toBack: asks, toLay: bids };
}

// Merge per-token order books into a normalised market's runners.
// booksByTokenId: { [tokenId]: clobBookResponse }
function mergeBook(market, booksByTokenId) {
    const runners = market.runners.map((runner) => {
        const book = runner.tokenId ? booksByTokenId[runner.tokenId] : undefined;
        if (!book) {
            return runner;
        }
        const { toBack, toLay } = normalizeBook(book);
        return { ...runner, toBack, toLay };
    });
    return { ...market, runners };
}

export {
    parseMaybeJsonArray,
    normalizeGammaMarket,
    normalizeBook,
    mergeBook,
};
