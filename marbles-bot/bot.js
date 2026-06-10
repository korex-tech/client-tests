#!/usr/bin/env node
/*
 * Marbles result bot.
 *
 * Marbles On Stream has no outbound API — it only *reads* Twitch chat so
 * viewers can join a race. So we determine the winner by doing the opposite:
 * we read the same channel's chat and parse the game's own winner
 * announcement, then settle the round.
 *
 * This connects to Twitch IRC anonymously (read-only, no OAuth needed),
 * watches one channel, and:
 *   - tracks `!play` entrants  -> the set of valid marbles for a round
 *   - parses the game bot's "Winner: <name>" message -> settles the round
 *
 * It talks to the backend over the same /api/v1/marbles/* contract the client
 * uses. For a play-money test it can settle directly; for real money you would
 * insert an operator-confirmation / dispute step before calling settle.
 *
 * Config via environment variables:
 *   TWITCH_CHANNEL    channel to watch (no '#'), e.g. korexmarbles   [required]
 *   GAME_BOT_ACCOUNT  the chat account the game posts results from    [required]
 *   WINNER_REGEX      regex with one capture group for the winner
 *                     (default: /winner[:\s]+([a-z0-9_]+)/i)
 *   API_URI           backend base, e.g. https://api.korex.bet       [required]
 *   ECLTOKEN          auth token for the settle call                 [required]
 *   ROUND_ID          the open round these entrants/result map to    [required]
 *   DRY_RUN           '1' to log instead of calling settle           [optional]
 *
 * Run:  node marbles-bot/bot.js
 */

'use strict';

const net = require('net');

const TWITCH_IRC_HOST = 'irc.chat.twitch.tv';
const TWITCH_IRC_PORT = 6667;

const cfg = {
    channel: (process.env.TWITCH_CHANNEL || '').toLowerCase().replace(/^#/, ''),
    gameBot: (process.env.GAME_BOT_ACCOUNT || '').toLowerCase(),
    winnerRegex: new RegExp(
        process.env.WINNER_REGEX || 'winner[:\\s]+([a-z0-9_]+)', 'i'),
    apiUri: process.env.API_URI || '',
    eclToken: process.env.ECLTOKEN || '',
    roundId: process.env.ROUND_ID || '',
    dryRun: process.env.DRY_RUN === '1'
};

function requireCfg() {
    const missing = [];
    if (!cfg.channel) missing.push('TWITCH_CHANNEL');
    if (!cfg.gameBot) missing.push('GAME_BOT_ACCOUNT');
    if (!cfg.roundId) missing.push('ROUND_ID');
    if (!cfg.dryRun) {
        if (!cfg.apiUri) missing.push('API_URI');
        if (!cfg.eclToken) missing.push('ECLTOKEN');
    }
    if (missing.length > 0) {
        console.error('Missing required env: ' + missing.join(', '));
        process.exit(1);
    }
}

function log(...args) {
    console.log(new Date().toISOString(), ...args);
}

// Entrants we have seen `!play` from this round (the bettable marbles).
const entrants = new Set();

// Guard so we settle a round at most once.
let settled = false;


// Call the backend to settle the round against the winning marble.
async function settleRound(winningMarbleId) {
    if (settled) {
        log('Already settled; ignoring duplicate winner', winningMarbleId);
        return;
    }
    settled = true;

    if (cfg.dryRun) {
        log('[DRY_RUN] would settle round', cfg.roundId,
            'winner=', winningMarbleId);
        return;
    }

    try {
        const res = await fetch(
            cfg.apiUri + '/api/v1/marbles/settleround',
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'ecltoken': cfg.eclToken
                },
                body: JSON.stringify({
                    round_id: cfg.roundId,
                    winning_marble_id: winningMarbleId
                })
            }
        );
        const data = await res.json().catch(() => ({}));
        log('settleRound ->', res.status, JSON.stringify(data));
    }
    catch (err) {
        // Don't lose the round on a transient failure — allow a retry.
        settled = false;
        log('settleRound FAILED, will retry on next winner line:', err.message);
    }
}


// Parse a single IRC line. We only care about PRIVMSG (chat messages) and
// PING (keepalive).
function handleLine(socket, line) {
    if (line.startsWith('PING')) {
        socket.write('PONG :tmi.twitch.tv\r\n');
        return;
    }

    // Format: :nick!user@host PRIVMSG #channel :message text
    const m = line.match(/^:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.*)$/);
    if (!m) {
        return;
    }
    const fromUser = m[1].toLowerCase();
    const text = m[2];

    // Track race entrants from viewer `!play` commands.
    if (/^!play\b/i.test(text)) {
        if (!entrants.has(fromUser)) {
            entrants.add(fromUser);
            log('entrant joined:', fromUser, '(', entrants.size, 'total )');
        }
        return;
    }

    // Only trust winner announcements from the configured game account.
    if (fromUser !== cfg.gameBot) {
        return;
    }
    const w = text.match(cfg.winnerRegex);
    if (!w) {
        return;
    }
    const winner = w[1].toLowerCase();
    log('parsed winner from', fromUser, '->', winner, '| raw:', text);

    // Sanity check: the winner should be an entrant we saw. Warn but still
    // settle (chat may have been missed / bot started mid-round).
    if (entrants.size > 0 && !entrants.has(winner)) {
        log('WARNING: winner not in tracked entrants; settling anyway.');
    }
    settleRound(winner);
}


function connect() {
    const socket = net.connect(TWITCH_IRC_PORT, TWITCH_IRC_HOST, () => {
        log('connected to Twitch IRC; joining #' + cfg.channel);
        // Anonymous read-only login: any justinfan<NNN> nick, no password.
        const anon = 'justinfan' + Math.floor(Math.random() * 80000 + 1000);
        socket.write('NICK ' + anon + '\r\n');
        socket.write('JOIN #' + cfg.channel + '\r\n');
    });

    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\r\n')) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            if (line.length > 0) {
                handleLine(socket, line);
            }
        }
    });

    socket.on('error', (err) => log('socket error:', err.message));
    socket.on('close', () => {
        log('connection closed; reconnecting in 5s');
        setTimeout(connect, 5000);
    });
}


requireCfg();
log('Marbles result bot starting',
    '| channel=' + cfg.channel,
    '| gameBot=' + cfg.gameBot,
    '| round=' + cfg.roundId,
    cfg.dryRun ? '| DRY_RUN' : '');
connect();
