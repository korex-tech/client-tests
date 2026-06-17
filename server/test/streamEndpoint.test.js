import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createServer } from '../src/server.js';

const here = dirname(fileURLToPath(import.meta.url));
const gammaMarkets = JSON.parse(
    readFileSync(join(here, '..', 'fixtures', 'gamma-markets.json'), 'utf8'),
);

test('GET /api/exchange/stream emits SSE book events', async () => {
    const firstToken = JSON.parse(gammaMarkets[0].clobTokenIds)[0];

    const fakeClient = { fetchMarkets: async () => gammaMarkets };

    // Fake stream: as soon as the endpoint wires up onUpdate, push one update.
    const streamFactory = ({ assetIds, onUpdate }) => {
        setImmediate(() => {
            onUpdate(assetIds[0], {
                toBack: [ { price: 0.32, size: 1850 } ],
                toLay: [ { price: 0.31, size: 8800 } ],
            });
        });
        return { close() {} };
    };

    const server = createServer({ client: fakeClient, streamFactory });
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();

    try {
        const res = await fetch(
            `http://localhost:${port}/api/exchange/stream?platform=polymarket&marketId=pm-0xdef456abc`,
        );
        assert.equal(res.status, 200);
        assert.match(res.headers.get('content-type'), /text\/event-stream/);

        // Read until we see a complete `event: book` frame.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let payload;
        const deadline = Date.now() + 3000;
        while (Date.now() < deadline) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const match = buffer.match(/event: book\ndata: (.+)\n\n/);
            if (match) {
                payload = JSON.parse(match[1]);
                break;
            }
        }
        await reader.cancel();

        assert.ok(payload, 'expected a book event');
        assert.equal(payload.runnerId, firstToken);
        assert.equal(payload.toBack[0].price, 0.32);
        assert.equal(payload.toLay[0].price, 0.31);
    }
    finally {
        server.close();
    }
});
