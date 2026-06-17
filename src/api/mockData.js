
// Mock data for the exchange trading frontend.
//
// This data mirrors the *normalised* shapes that the backend is expected to
// return (see docs/API_CONTRACT.md). Both Betfair and Polymarket markets are
// flattened into a single shape so the UI can render them uniformly:
//
//   market = {
//     id, platform, eventName, marketName, status, priceType,
//     runners: [
//       {
//         id, name, lastTradedPrice,
//         toBack: [ { price, size }, ... ],   // best prices available to BACK
//         toLay:  [ { price, size }, ... ],   // best prices available to LAY
//       }
//     ]
//   }
//
// priceType is 'DECIMAL_ODDS' (Betfair) or 'PROBABILITY' (Polymarket, 0..1).

const betfairMarkets = [
    {
        id: 'bf-1.234567890',
        platform: 'betfair',
        eventName: 'Arsenal v Chelsea',
        marketName: 'Match Odds',
        status: 'OPEN',
        priceType: 'DECIMAL_ODDS',
        runners: [
            {
                id: 'bf-r-47973',
                name: 'Arsenal',
                lastTradedPrice: 2.18,
                toBack: [ { price: 2.18, size: 540 }, { price: 2.16, size: 1200 } ],
                toLay:  [ { price: 2.20, size: 430 }, { price: 2.22, size: 980 } ],
            },
            {
                id: 'bf-r-58805',
                name: 'Chelsea',
                lastTradedPrice: 3.65,
                toBack: [ { price: 3.65, size: 320 }, { price: 3.60, size: 760 } ],
                toLay:  [ { price: 3.70, size: 280 }, { price: 3.75, size: 610 } ],
            },
            {
                id: 'bf-r-58806',
                name: 'The Draw',
                lastTradedPrice: 3.40,
                toBack: [ { price: 3.40, size: 410 }, { price: 3.35, size: 890 } ],
                toLay:  [ { price: 3.45, size: 350 }, { price: 3.50, size: 720 } ],
            },
        ],
    },
    {
        id: 'bf-1.987654321',
        platform: 'betfair',
        eventName: 'Djokovic v Alcaraz',
        marketName: 'Match Odds',
        status: 'OPEN',
        priceType: 'DECIMAL_ODDS',
        runners: [
            {
                id: 'bf-r-11001',
                name: 'N. Djokovic',
                lastTradedPrice: 2.02,
                toBack: [ { price: 2.02, size: 1100 }, { price: 2.00, size: 2300 } ],
                toLay:  [ { price: 2.04, size: 950 }, { price: 2.06, size: 1800 } ],
            },
            {
                id: 'bf-r-11002',
                name: 'C. Alcaraz',
                lastTradedPrice: 1.98,
                toBack: [ { price: 1.98, size: 1250 }, { price: 1.96, size: 2600 } ],
                toLay:  [ { price: 2.00, size: 1050 }, { price: 2.02, size: 2100 } ],
            },
        ],
    },
];

const polymarketMarkets = [
    {
        id: 'pm-0xabc123',
        platform: 'polymarket',
        eventName: 'US Election 2028',
        marketName: 'Will the Democratic nominee win the popular vote?',
        status: 'OPEN',
        priceType: 'PROBABILITY',
        runners: [
            {
                id: 'pm-tok-yes-1',
                name: 'Yes',
                lastTradedPrice: 0.54,
                toBack: [ { price: 0.54, size: 8200 }, { price: 0.53, size: 15400 } ],
                toLay:  [ { price: 0.55, size: 6100 }, { price: 0.56, size: 12000 } ],
            },
            {
                id: 'pm-tok-no-1',
                name: 'No',
                lastTradedPrice: 0.46,
                toBack: [ { price: 0.46, size: 7400 }, { price: 0.45, size: 13800 } ],
                toLay:  [ { price: 0.47, size: 5900 }, { price: 0.48, size: 11200 } ],
            },
        ],
    },
    {
        id: 'pm-0xdef456',
        platform: 'polymarket',
        eventName: 'Crypto',
        marketName: 'Will BTC close above $150k in 2026?',
        status: 'OPEN',
        priceType: 'PROBABILITY',
        runners: [
            {
                id: 'pm-tok-yes-2',
                name: 'Yes',
                lastTradedPrice: 0.31,
                toBack: [ { price: 0.31, size: 22000 }, { price: 0.30, size: 41000 } ],
                toLay:  [ { price: 0.32, size: 18500 }, { price: 0.33, size: 35000 } ],
            },
            {
                id: 'pm-tok-no-2',
                name: 'No',
                lastTradedPrice: 0.69,
                toBack: [ { price: 0.69, size: 19000 }, { price: 0.68, size: 38000 } ],
                toLay:  [ { price: 0.70, size: 16000 }, { price: 0.71, size: 30000 } ],
            },
        ],
    },
];

// Per-platform account balances (normalised shape).
const balances = {
    betfair: { currency: 'GBP', available: 1250.40, exposure: 180.00 },
    polymarket: { currency: 'USDC', available: 4820.75, exposure: 0 },
};

export function getMockMarkets(platform) {
    if (platform === 'betfair') {
        return betfairMarkets;
    }
    if (platform === 'polymarket') {
        return polymarketMarkets;
    }
    return [ ...betfairMarkets, ...polymarketMarkets ];
}

export function getMockMarket(platform, marketId) {
    return getMockMarkets(platform).find((m) => m.id === marketId);
}

export function getMockBalance(platform) {
    return balances[platform];
}
