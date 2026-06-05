
// Client for the unified exchange trading backend (Betfair + Polymarket).
//
// This follows the same factory-function pattern as EclContext.js: it returns
// an object of async methods that POST JSON to the backend. While the backend
// is still being built, USE_MOCK routes every call to an in-memory mock that
// returns the same shapes the real backend is expected to return, with a small
// simulated latency. Flip USE_MOCK to false (or wire REACT_APP_EXCHANGE_API)
// once the backend is live and the UI should work unchanged.
//
// Backend contract: see docs/API_CONTRACT.md

import {
    getMockMarkets,
    getMockMarket,
    getMockBalance,
} from './mockData';

// Toggle this off when the real backend is available.
const USE_MOCK = true;

// Base URL of the backend trading proxy. The backend is responsible for the
// platform-specific auth that cannot live in the browser (Betfair cert login
// + CORS, Polymarket HMAC signing + wallet key handling).
const DEFAULT_API_BASE = '/api/exchange';

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function newOrderId() {
    return 'ord-' + Math.random().toString(36).slice(2, 10);
}

function ExchangeClient(options = {}) {

    const apiBase =
        options.apiBase ||
        process.env.REACT_APP_EXCHANGE_API ||
        DEFAULT_API_BASE;

    let sessionToken = options.sessionToken;

    // In-memory store of open orders, keyed by platform. Mock mode only.
    const mockOpenOrders = { betfair: [], polymarket: [] };

    async function jsonPost(path, params) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };
        if (sessionToken !== undefined) {
            headers.Authorization = 'Bearer ' + sessionToken;
        }
        const res = await fetch(apiBase + path, {
            headers,
            method: 'POST',
            body: JSON.stringify(params),
        });
        if (!res.ok) {
            console.error(res);
            throw Error('Exchange API error: ' + res.status);
        }
        return res.json();
    }

    // --- Markets -----------------------------------------------------------

    async function listMarkets(platform) {
        if (USE_MOCK) {
            await delay(180);
            return { status: 'OK', markets: getMockMarkets(platform) };
        }
        return jsonPost('/markets/list', { platform });
    }

    async function getMarket(platform, marketId) {
        if (USE_MOCK) {
            await delay(150);
            const market = getMockMarket(platform, marketId);
            return market
                ? { status: 'OK', market }
                : { status: 'NOT_FOUND' };
        }
        return jsonPost('/markets/get', { platform, marketId });
    }

    // --- Account -----------------------------------------------------------

    async function getBalance(platform) {
        if (USE_MOCK) {
            await delay(120);
            return { status: 'OK', balance: getMockBalance(platform) };
        }
        return jsonPost('/account/balance', { platform });
    }

    // --- Orders ------------------------------------------------------------

    // order = { platform, marketId, runnerId, runnerName, side, price, size }
    // side is 'BACK' or 'LAY' (mapped to buy/sell on Polymarket by the backend).
    async function placeOrder(order) {
        if (USE_MOCK) {
            await delay(300);
            const placed = {
                orderId: newOrderId(),
                status: 'MATCHED',
                placedAt: new Date().toISOString(),
                ...order,
            };
            mockOpenOrders[order.platform] =
                [ placed, ...(mockOpenOrders[order.platform] || []) ];
            return { status: 'OK', order: placed };
        }
        return jsonPost('/orders/place', order);
    }

    async function cancelOrder(platform, orderId) {
        if (USE_MOCK) {
            await delay(200);
            mockOpenOrders[platform] =
                (mockOpenOrders[platform] || [])
                    .filter((o) => o.orderId !== orderId);
            return { status: 'OK', orderId };
        }
        return jsonPost('/orders/cancel', { platform, orderId });
    }

    async function listOpenOrders(platform) {
        if (USE_MOCK) {
            await delay(120);
            return { status: 'OK', orders: mockOpenOrders[platform] || [] };
        }
        return jsonPost('/orders/open', { platform });
    }

    function setSessionToken(token) {
        sessionToken = token;
    }

    return {
        isMock: () => USE_MOCK,
        getApiBase: () => apiBase,
        setSessionToken,

        listMarkets,
        getMarket,
        getBalance,

        placeOrder,
        cancelOrder,
        listOpenOrders,
    };
}

export default ExchangeClient;
