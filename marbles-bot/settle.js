'use strict';

/*
 * Shared settle helper used by every result source (chat bot, file watcher).
 *
 * Calls POST /api/v1/marbles/settleround once per round. Idempotent: a second
 * call is ignored; a failed call is allowed to retry (so a later signal can
 * still settle).
 */

function loadConfig(env) {
    return {
        apiUri: env.API_URI || '',
        eclToken: env.ECLTOKEN || '',
        roundId: env.ROUND_ID || '',
        dryRun: env.DRY_RUN === '1'
    };
}

// Returns an async settle(winningMarbleId) bound to the given config.
function createSettler(cfg, log) {
    let settled = false;

    return async function settle(winningMarbleId) {
        if (settled) {
            log('already settled; ignoring duplicate winner', winningMarbleId);
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
            log('settleRound FAILED, will retry on next signal:', err.message);
        }
    };
}

module.exports = { loadConfig, createSettler };
