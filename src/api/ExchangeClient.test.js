import ExchangeClient from './ExchangeClient';

// These exercise the mock-mode client so the contract / shapes stay stable
// while the real backend is built.

test('lists markets for each platform', async () => {
    const client = ExchangeClient();
    const bf = await client.listMarkets('betfair');
    const pm = await client.listMarkets('polymarket');

    expect(bf.status).toBe('OK');
    expect(bf.markets.length).toBeGreaterThan(0);
    expect(bf.markets[0].platform).toBe('betfair');
    expect(bf.markets[0].priceType).toBe('DECIMAL_ODDS');

    expect(pm.markets[0].priceType).toBe('PROBABILITY');
});

test('returns a balance for a platform', async () => {
    const client = ExchangeClient();
    const res = await client.getBalance('betfair');
    expect(res.status).toBe('OK');
    expect(res.balance).toHaveProperty('currency');
    expect(res.balance).toHaveProperty('available');
});

test('place then cancel flows through open orders', async () => {
    const client = ExchangeClient();

    const placed = await client.placeOrder({
        platform: 'betfair',
        marketId: 'bf-1.234567890',
        runnerId: 'bf-r-47973',
        runnerName: 'Arsenal',
        side: 'BACK',
        price: 2.18,
        size: 50,
    });
    expect(placed.status).toBe('OK');
    expect(placed.order.orderId).toBeDefined();

    const open = await client.listOpenOrders('betfair');
    expect(open.orders.some((o) => o.orderId === placed.order.orderId)).toBe(true);

    const cancelled = await client.cancelOrder('betfair', placed.order.orderId);
    expect(cancelled.status).toBe('OK');

    const after = await client.listOpenOrders('betfair');
    expect(after.orders.some((o) => o.orderId === placed.order.orderId)).toBe(false);
});
