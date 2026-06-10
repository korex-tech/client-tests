# Marbles result bot

Determines the winner of a *Marbles On Stream* race and settles the matching
betting round. There are two result sources; **prefer the file watcher.**

## Why a watcher (and not an API call)

Marbles On Stream has **no outbound API** to ask "who won." But it does write
each finished race to disk, and it reads/writes Twitch chat. So we have two
ways to learn the winner, in order of trustworthiness:

| Source | Script | Trust | Notes |
| --- | --- | --- | --- |
| **Local result file** | `result-watcher.js` | ✅ best | The game's own authoritative output, on a machine you control. Structured. |
| Twitch chat | `bot.js` | ⚠️ weak | Parses the game's chat announcement. Public chat is spoofable. |
| Screen capture / OCR | — | ⚠️ fragile | The winner shows on the Victory overlay, but font/effects vary per winner. Last resort. |

Both scripts call the same `POST /api/v1/marbles/settleround` (see `settle.js`).
Use `DRY_RUN=1` to log the parsed winner instead of moving money.

## Recommended: local file watcher

Marbles On Stream saves each race to
`%LOCALAPPDATA%\MarblesOnStream\Saved\SaveGames\Sessions` as a `.sav`
(Unreal GVAS binary) and — after a one-time `!manualinit` in chat — also as
`.json` / `.txt` files with the placements and winning user. Run the game host
and watch that folder:

```sh
# point at the game's Sessions folder; .json/.txt enabled via !manualinit
MARBLES_SESSIONS_DIR="C:\\Users\\you\\AppData\\Local\\MarblesOnStream\\Saved\\SaveGames\\Sessions" \
ROUND_ID=<open round id> API_URI=http://localhost:8080 ECLTOKEN=<token> \
node marbles-bot/result-watcher.js

# safe live test — log the parsed winner, move no money:
DRY_RUN=1 MARBLES_SESSIONS_DIR="…\\Sessions" ROUND_ID=test \
node marbles-bot/result-watcher.js
```

`.sav` is binary — to use it, decode it first with a GVAS converter (e.g. the
one in `SyrDim/MarblesOnStreamLeaderboardParser`) and point `WATCH_EXT`/the
folder at the produced `.json`. The watcher parses `.json`/`.txt` directly.

**Confirm the field names against a real result file.** The JSON parser tries
common shapes (a `winner`/`first` field, or a `placements`/`leaderboard` array
sorted to position 1); if your file differs, set `WINNER_JSON_PATH` (e.g.
`results.0.username`) or `WINNER_TXT_REGEX`.

### File-watcher config

| Env | Required | Purpose |
| --- | --- | --- |
| `MARBLES_SESSIONS_DIR` | no | Folder to watch. Defaults to the `%LOCALAPPDATA%` path above. |
| `WATCH_EXT` | no | Extensions to react to. Default `json,txt`. |
| `WINNER_JSON_PATH` | no | Dot-path to the winner name if heuristics miss it. |
| `WINNER_TXT_REGEX` | no | Regex (one capture group) for the winner in `.txt`. |
| `ROUND_ID` | yes | The open round the result maps to. |
| `API_URI` | yes (unless `DRY_RUN`) | Backend base, e.g. `https://api.korex.bet`. |
| `ECLTOKEN` | yes (unless `DRY_RUN`) | Auth token for the settle call. |
| `DRY_RUN` | no | `1` = log the parsed winner instead of settling. |

## Fallback: Twitch chat reader

Connects to Twitch IRC **anonymously** (read-only, no OAuth), tracks `!play`
entrants, and parses the game bot's "Winner: …" line.

```sh
TWITCH_CHANNEL=korexmarbles GAME_BOT_ACCOUNT=marblesonstream \
ROUND_ID=<open round id> API_URI=http://localhost:8080 ECLTOKEN=<token> \
node marbles-bot/bot.js
```

| Env | Required | Purpose |
| --- | --- | --- |
| `TWITCH_CHANNEL` | yes | Channel to watch (no `#`). |
| `GAME_BOT_ACCOUNT` | yes | The chat account the game posts results from — winner lines are only trusted from this account. |
| `WINNER_REGEX` | no | Regex with one capture group. Default `winner[:\s]+([a-z0-9_]+)`. |
| `ROUND_ID` / `API_URI` / `ECLTOKEN` / `DRY_RUN` | as above | Shared settle config. |

## Read before real money

- **For real money, don't auto-settle from a single signal.** Insert an
  operator-confirmation or dispute window between "parsed a winner" and the
  settle call. The current scripts settle directly, which is appropriate for
  **play-money** testing. The file watcher's trust model (your own game host)
  is much stronger than chat, but whoever runs the host can still influence the
  game — settle from a source you control and consider a second confirmation.
- One round at a time per process (`ROUND_ID`). Run one instance per active
  round, or extend it to resolve the open round via `/v1/marbles/activeround`.
