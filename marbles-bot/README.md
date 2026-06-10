# Marbles result bot

Determines the winner of a *Marbles On Stream* race and settles the matching
betting round.

## Why a bot (and not an API call)

Marbles On Stream has **no outbound API**. It only *reads* Twitch chat so
viewers can join a race with `!play`. There is no endpoint to ask "who won."
So we do the inverse: connect to the same channel's chat, read the game's own
**winner announcement**, and settle on that.

```
game posts result into chat ─▶ this bot reads chat ─▶ POST /api/v1/marbles/settleround
viewers !play ─────────────────▶ this bot tracks entrants (the bettable marbles)
```

The bot connects to Twitch IRC **anonymously** (read-only — no OAuth, no
account needed), so it's runnable immediately for a play-money test.

## Run

```sh
TWITCH_CHANNEL=korexmarbles \
GAME_BOT_ACCOUNT=marblesonstream \
ROUND_ID=<open round id> \
API_URI=http://localhost:8080 \
ECLTOKEN=<token> \
node marbles-bot/bot.js
```

To watch a real channel and see parsing without moving money, use `DRY_RUN=1`
(then `API_URI`/`ECLTOKEN` aren't required):

```sh
DRY_RUN=1 TWITCH_CHANNEL=somechannel GAME_BOT_ACCOUNT=marblesonstream \
ROUND_ID=test node marbles-bot/bot.js
```

## Config

| Env | Required | Purpose |
| --- | --- | --- |
| `TWITCH_CHANNEL` | yes | Channel to watch (no `#`). |
| `GAME_BOT_ACCOUNT` | yes | The chat account the game posts results from — winner lines are only trusted from this account. |
| `ROUND_ID` | yes | The open round entrants/result map to. |
| `API_URI` | yes (unless `DRY_RUN`) | Backend base, e.g. `https://api.korex.bet`. |
| `ECLTOKEN` | yes (unless `DRY_RUN`) | Auth token for the settle call. |
| `WINNER_REGEX` | no | Regex with one capture group for the winner. Default `winner[:\s]+([a-z0-9_]+)`. |
| `DRY_RUN` | no | `1` = log the parsed winner instead of settling. |

## Known limits (read before real money)

- **It's a scrape, not a contract.** The winner line is matched by regex; if
  the game changes its wording, update `WINNER_REGEX`. Verify the exact format
  against a live race.
- **Chat is spoofable.** We only trust messages from `GAME_BOT_ACCOUNT`, but a
  compromised/mis-set account is still a trust assumption, not a guarantee.
- **For real money, don't auto-settle.** Insert an operator-confirmation or
  dispute window between "parsed a winner" and the settle call. This bot
  settles directly, which is appropriate for **play-money** only.
- One round at a time per process (`ROUND_ID`). Run one instance per active
  round, or extend it to resolve the open round via `/v1/marbles/activeround`.
