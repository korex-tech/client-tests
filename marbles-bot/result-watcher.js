#!/usr/bin/env node
/*
 * Marbles result watcher (local-file source) — the recommended, tamper-
 * resistant way to determine the winner.
 *
 * Marbles On Stream writes each finished race to disk in
 *   %LOCALAPPDATA%\MarblesOnStream\Saved\SaveGames\Sessions
 * as a .sav (Unreal GVAS binary) and — after a one-time `!manualinit` in
 * chat — also as .json / .txt result files containing the placements and the
 * winning chat user.
 *
 * This watches that folder, and when a new/updated result file appears it
 * parses the winner and settles the matching round. Reading the game's own
 * output on the machine you control beats parsing public Twitch chat
 * (spoofable) or OCR of the victory overlay (fragile).
 *
 * NOTE on formats:
 *   - .json / .txt  -> parsed here directly (enable them with `!manualinit`).
 *   - .sav (binary) -> decode first with a GVAS converter (e.g. the
 *     gvas-converter used by SyrDim/MarblesOnStreamLeaderboardParser) and
 *     point WATCH_GLOB at the produced .json. This watcher does not decode
 *     the binary .sav itself.
 *
 * Config via environment variables:
 *   MARBLES_SESSIONS_DIR  folder to watch. Default:
 *       %LOCALAPPDATA%\MarblesOnStream\Saved\SaveGames\Sessions
 *   WATCH_EXT             comma list of extensions to react to. Default: json,txt
 *   WINNER_JSON_PATH      dot-path to the winner name in the .json, if the
 *                         heuristics don't find it (e.g. "results.0.username")
 *   WINNER_TXT_REGEX      regex (one capture group) for the winner in .txt.
 *                         Default matches a "1. name" / "1st: name" line.
 *   plus the shared settle vars: API_URI, ECLTOKEN, ROUND_ID, DRY_RUN
 *       (see settle.js — DRY_RUN=1 logs the parsed winner instead of settling)
 *
 * Run:  node marbles-bot/result-watcher.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadConfig, createSettler } = require('./settle');

function log(...args) {
    console.log(new Date().toISOString(), ...args);
}

function defaultSessionsDir() {
    const base = process.env.LOCALAPPDATA ||
        path.join(process.env.HOME || '.', 'AppData', 'Local');
    return path.join(base, 'MarblesOnStream', 'Saved', 'SaveGames', 'Sessions');
}

const cfg = loadConfig(process.env);
const dir = process.env.MARBLES_SESSIONS_DIR || defaultSessionsDir();
const exts = (process.env.WATCH_EXT || 'json,txt')
    .split(',').map((s) => s.trim().toLowerCase().replace(/^\./, ''));
const winnerJsonPath = process.env.WINNER_JSON_PATH || '';
const winnerTxtRegex = new RegExp(
    process.env.WINNER_TXT_REGEX || '^\\s*1(?:st|[.):])?\\s*[-:.]?\\s*([A-Za-z0-9_]+)',
    'm');

// How the winner is chosen from the results table: 'min-time' (fastest finish
// — the default for a race), 'max-time', or 'max-points'.
const winnerRule = (process.env.RESULT_WINNER_RULE || 'min-time').toLowerCase();

function requireCfg() {
    const missing = [];
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

const settle = createSettler(cfg, log);


// --- winner extraction ------------------------------------------------------

function nameOf(entry) {
    if (entry == null) return undefined;
    if (typeof entry === 'string') return entry;
    return entry.username || entry.name || entry.user ||
        entry.displayName || entry.chatName || undefined;
}

function positionOf(entry) {
    if (entry == null || typeof entry !== 'object') return Infinity;
    const p = entry.position != null ? entry.position
        : entry.place != null ? entry.place
        : entry.rank != null ? entry.rank
        : Infinity;
    return Number(p);
}

function getPath(obj, dotPath) {
    return dotPath.split('.').reduce((acc, key) => {
        if (acc == null) return undefined;
        return acc[key];
    }, obj);
}

function extractWinnerFromJson(obj) {
    // 1. explicit configured path wins.
    if (winnerJsonPath) {
        return nameOf(getPath(obj, winnerJsonPath));
    }
    // 2. explicit winner-ish fields.
    for (const k of ['winner', 'first', 'firstPlace', 'champion']) {
        if (obj[k] != null) return nameOf(obj[k]);
    }
    // 3. a placements/leaderboard array -> the position-1 entry.
    const arr = obj.placements || obj.leaderboard || obj.results ||
        obj.marbles || obj.standings;
    if (Array.isArray(arr) && arr.length > 0) {
        const sorted = arr.slice().sort((a, b) => positionOf(a) - positionOf(b));
        return nameOf(sorted[0]);
    }
    return undefined;
}

function extractWinner(file, contents) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.json') {
        try {
            return extractWinnerFromJson(JSON.parse(contents));
        }
        catch (err) {
            log('could not parse JSON', path.basename(file), '-', err.message);
            return undefined;
        }
    }
    // .txt — the game's tab-separated Player/Points/Time results table.
    const fromTable = extractWinnerFromTable(contents);
    if (fromTable) return fromTable;
    // Fallback: regex a "1. name" style line.
    const m = contents.match(winnerTxtRegex);
    return m ? m[1] : undefined;
}

// Parse the tab-separated results table the game writes / copies to clipboard:
//   Player<TAB>Points<TAB>Time
//   Giuxucbi	0	26.423367
// In a marble race the first marble to finish has the lowest time, so the
// default rule is min-time. Non-finishers (time <= 0) are ignored.
function extractWinnerFromTable(contents) {
    const rows = [];
    for (const raw of contents.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        const cols = line.split('\t').map((c) => c.trim());
        if (cols.length < 2) continue;
        const name = cols[0];
        if (!name || /^player$/i.test(name)) continue; // header row
        rows.push({
            name,
            points: parseFloat(cols[1]),
            time: parseFloat(cols[2])
        });
    }
    if (rows.length === 0) return undefined;

    let pool = rows;
    let pick;
    if (winnerRule === 'max-points') {
        pick = (best, r) => (r.points > best.points ? r : best);
    }
    else if (winnerRule === 'max-time') {
        pick = (best, r) => (r.time > best.time ? r : best);
    }
    else { // 'min-time' (default): fastest finisher wins
        const finishers = pool.filter((r) => r.time > 0);
        if (finishers.length > 0) pool = finishers;
        pick = (best, r) => (r.time < best.time ? r : best);
    }
    const winner = pool.reduce((best, r) => (best === undefined ? r : pick(best, r)),
        undefined);
    return winner ? winner.name : undefined;
}


// --- file watching ----------------------------------------------------------

const recent = new Map(); // debounce: file -> last-handled mtime

function handleFile(file) {
    let stat;
    try {
        stat = fs.statSync(file);
    }
    catch (_e) {
        return; // file vanished (temp write)
    }
    const mtime = stat.mtimeMs;
    if (recent.get(file) === mtime) return; // already handled this version
    recent.set(file, mtime);

    let contents;
    try {
        contents = fs.readFileSync(file, 'utf8');
    }
    catch (err) {
        log('read failed for', path.basename(file), '-', err.message);
        return;
    }

    const winner = extractWinner(file, contents);
    if (!winner) {
        log('no winner parsed from', path.basename(file),
            '(check WINNER_JSON_PATH / WINNER_TXT_REGEX against a real file)');
        return;
    }
    log('parsed winner', winner, 'from', path.basename(file));
    settle(winner.toLowerCase());
}

requireCfg();

if (!fs.existsSync(dir)) {
    console.error('Sessions dir does not exist: ' + dir +
        '\nSet MARBLES_SESSIONS_DIR to the game\'s SaveGames\\Sessions folder.');
    process.exit(1);
}

log('Marbles result watcher starting',
    '| dir=' + dir,
    '| ext=' + exts.join(','),
    '| round=' + cfg.roundId,
    cfg.dryRun ? '| DRY_RUN' : '');

fs.watch(dir, (eventType, filename) => {
    if (!filename) return;
    const ext = path.extname(filename).toLowerCase().replace(/^\./, '');
    if (!exts.includes(ext)) return;
    // Debounce the burst of events a single write produces.
    const full = path.join(dir, filename);
    setTimeout(() => handleFile(full), 250);
});
