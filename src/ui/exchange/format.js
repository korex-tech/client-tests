
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

// Estimate the potential profit/liability of a bet for display in the ticket.
// BACK at decimal odds: profit = size * (price - 1).
// BACK on probability markets: shares = size / price, profit = shares - size.
export function estimateProfit(side, price, size, priceType) {
    const p = Number(price);
    const s = Number(size);
    if (!p || !s) {
        return 0;
    }
    if (priceType === 'PROBABILITY') {
        // Shares bought for stake s at price p; each winning share pays 1.
        return side === 'BACK' ? (s / p) - s : s;
    }
    if (side === 'BACK') {
        return s * (p - 1);
    }
    // LAY: the stake represents backer's stake; liability shown elsewhere.
    return s;
}
