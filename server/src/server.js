// Dependency-free HTTP server exposing the unified exchange contract
// (docs/API_CONTRACT.md). Phase 0: Polymarket read path.
//
// Run:  node server/src/server.js   (PORT defaults to 4000)
// The CRA dev proxy forwards /api/* here when REACT_APP_EXCHANGE_API=/api/exchange.

import http from 'node:http';
import * as defaultClient from './polymarket/client.js';
import { createHandlers, resolveMarketTokens } from './handlers.js';
import { PolymarketMarketStream } from './polymarket/marketStream.js';

const PORT = Number(process.env.PORT || 4000);
const API_PREFIX = '/api/exchange/';
const STREAM_PATH = '/api/exchange/stream';

function sendJson(res, statusCode, body) {
    const payload = JSON.stringify(body);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        // Permissive CORS for local dev; tighten before any real deployment.
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(payload);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > 1_000_000) { // 1 MB guard
                reject(new Error('Request body too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(raw));
            }
            catch (err) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

// Server-Sent Events endpoint: streams live BACK/LAY ladder updates for a
// market's runners. The browser subscribes via EventSource (see MarketView).
async function handleStream(req, res, { client, streamFactory }) {
    const url = new URL(req.url, 'http://localhost');
    const platform = url.searchParams.get('platform');
    const marketId = url.searchParams.get('marketId');

    if (platform !== 'polymarket' || !marketId) {
        sendJson(res, 400, { status: 'ERROR', message: 'platform=polymarket and marketId required' });
        return;
    }

    const tokens = await resolveMarketTokens(client, marketId);
    if (!tokens || tokens.length === 0) {
        sendJson(res, 404, { status: 'NOT_FOUND' });
        return;
    }
    const runnerByToken = new Map(tokens.map((t) => [ t.tokenId, t.runnerId ]));

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n'); // open the stream immediately

    const stream = streamFactory({
        assetIds: tokens.map((t) => t.tokenId),
        onUpdate: (assetId, lad) => {
            const runnerId = runnerByToken.get(assetId);
            if (!runnerId) {
                return;
            }
            res.write('event: book\n');
            res.write(`data: ${JSON.stringify({ runnerId, ...lad })}\n\n`);
        },
    });

    req.on('close', () => {
        if (stream && stream.close) {
            stream.close();
        }
    });
}

// Default factory: a live Polymarket WebSocket stream. Injectable for tests.
function defaultStreamFactory({ assetIds, onUpdate }) {
    return new PolymarketMarketStream({ assetIds, onUpdate }).start();
}

function createServer(deps = {}) {
    const handlers = createHandlers(deps);
    const client = deps.client || defaultClient;
    const streamFactory = deps.streamFactory || defaultStreamFactory;

    return http.createServer(async (req, res) => {
        try {
            if (req.method === 'OPTIONS') {
                sendJson(res, 204, {});
                return;
            }
            if (req.method === 'GET' && req.url === '/health') {
                sendJson(res, 200, { status: 'OK', service: 'exchange-backend' });
                return;
            }
            if (req.method === 'GET' && req.url.startsWith(STREAM_PATH)) {
                await handleStream(req, res, { client, streamFactory });
                return;
            }
            if (req.method !== 'POST' || !req.url.startsWith(API_PREFIX)) {
                sendJson(res, 404, { status: 'NOT_FOUND', message: 'Unknown route' });
                return;
            }

            const route = req.url.slice(API_PREFIX.length).split('?')[0];
            const handler = handlers[route];
            if (!handler) {
                sendJson(res, 404, { status: 'NOT_FOUND', message: `Unknown route: ${route}` });
                return;
            }

            const body = await readBody(req);
            const result = await handler(body);
            sendJson(res, 200, result);
        }
        catch (err) {
            // Surface upstream (Polymarket) failures as a clear gateway error.
            const statusCode = err.statusCode ? 502 : 500;
            sendJson(res, statusCode, {
                status: 'ERROR',
                message: err.message || 'Internal error',
            });
        }
    });
}

// Start only when run directly (not when imported by tests).
const isMain = process.argv[1] && process.argv[1].endsWith('server.js');
if (isMain) {
    createServer().listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`exchange-backend listening on http://localhost:${PORT}`);
    });
}

export { createServer };
