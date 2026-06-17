// Connects to the Polymarket CLOB market WebSocket, subscribes to a set of
// outcome tokens, and emits normalised BACK/LAY ladders per token as updates
// arrive. The socket implementation is injectable so the message handling can
// be unit-tested with a fake socket (no network).
//
// Polymarket market channel: wss://ws-subscriptions-clob.polymarket.com/ws/market
// Subscribe by sending { assets_ids: [...], type: "market" }; keep alive with a
// "PING" every ~10s or the connection is dropped.

import { createAssetBook, applyEvent, ladders } from './stream.js';

const DEFAULT_URL = process.env.POLYMARKET_WS_URL
    || 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

class PolymarketMarketStream {

    // assetIds: token ids to subscribe to
    // onUpdate(assetId, { toBack, toLay }): called when a token's book changes
    // WebSocketImpl / url / pingMs are injectable for tests
    constructor({ assetIds, onUpdate, url = DEFAULT_URL, WebSocketImpl = WebSocket, pingMs = 10000 }) {
        this.assetIds = assetIds;
        this.onUpdate = onUpdate;
        this.url = url;
        this.WebSocketImpl = WebSocketImpl;
        this.pingMs = pingMs;
        this.books = new Map(assetIds.map((id) => [ id, createAssetBook() ]));
        this.ws = null;
        this.pingTimer = null;
    }

    start() {
        this.ws = new this.WebSocketImpl(this.url);
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({ assets_ids: this.assetIds, type: 'market' }));
            this.pingTimer = setInterval(() => {
                try {
                    this.ws.send('PING');
                }
                catch (err) { /* socket closing */ }
            }, this.pingMs);
            if (this.pingTimer.unref) {
                this.pingTimer.unref();
            }
        };
        this.ws.onmessage = (evt) => this.handleMessage(evt.data);
        this.ws.onclose = () => this.clearPing();
        this.ws.onerror = () => { /* surfaced via close */ };
        return this;
    }

    // Messages may be a single event object or an array of them.
    handleMessage(data) {
        let parsed;
        try {
            parsed = JSON.parse(data);
        }
        catch (err) {
            return; // ignore non-JSON frames (e.g. "PONG")
        }
        const events = Array.isArray(parsed) ? parsed : [ parsed ];
        for (const event of events) {
            const assetId = event.asset_id || event.market;
            const book = assetId ? this.books.get(assetId) : undefined;
            if (!book) {
                continue;
            }
            const changed = applyEvent(book, event);
            if (changed) {
                this.onUpdate(assetId, ladders(book));
            }
        }
    }

    clearPing() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    close() {
        this.clearPing();
        if (this.ws) {
            try {
                this.ws.close();
            }
            catch (err) { /* already closed */ }
            this.ws = null;
        }
    }
}

export { PolymarketMarketStream, DEFAULT_URL };
