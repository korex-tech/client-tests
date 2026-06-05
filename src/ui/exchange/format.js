
// Small formatting helpers shared by the exchange UI.

// Format a price according to the market's priceType.
// DECIMAL_ODDS -> "2.18", PROBABILITY -> "54%".
export function formatPrice(price, priceType) {
    if (price === undefined || price === null) {
        return '-';
    }
    if (priceType === 'PROBABILITY') {
        return Math.round(price * 100) + '%';
    }
    return Number(price).toFixed(2);
}

// Format a money amount with a currency code.
export function formatMoney(amount, currency) {
    if (amount === undefined || amount === null) {
        return '-';
    }
    return Number(amount).toFixed(2) + ' ' + (currency || '');
}

// Estimate the side-appropriate figure shown in the order ticket:
//   BACK -> potential profit if the selection wins
//   LAY  -> liability (the amount put at risk to win the backer's stake)
//
// DECIMAL_ODDS (Betfair): stake s at odds p.
//   BACK profit    = s * (p - 1)
//   LAY  liability = s * (p - 1)   <- risk (p-1) per 1 staked to win s
//
// PROBABILITY (Polymarket): stake s (in USDC) at price p (0..1).
//   BACK profit    = s/p - s       (buy s/p shares, each winning share pays 1)
//   LAY  liability = s * (1 - p)    (approx; sell/collateral semantics to be
//                                    confirmed against the backend — see
//                                    docs/SCOPING_AND_PLAN.md gap list)
export function estimateProfit(side, price, size, priceType) {
    const p = Number(price);
    const s = Number(size);
    if (!p || !s) {
        return 0;
    }
    if (priceType === 'PROBABILITY') {
        return side === 'BACK' ? (s / p) - s : s * (1 - p);
    }
    // DECIMAL_ODDS: profit on a back and liability on a lay are both s * (p - 1).
    return s * (p - 1);
}
