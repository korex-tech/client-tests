# 🚦 KOREX — Build Backlog & Parallel-Session Coordination

**Purpose:** the shared "task board" for running multiple Claude sessions in parallel without
collisions. Each task below is sized to be **one branch = one session**. Pick an unclaimed task,
launch a session on the named repo/branch, and tick it here when the PR is open.

> Single source of truth for strategy/status is the Notion **🔮 KOREX — Project Hub → 🗺️ Phase
> Tracker**. This file is the *operational* board: what to spin up next, in which repo, and what
> blocks what. Keep them in sync; don't duplicate prose — link.

_Last synced from Phase Tracker + Exchange Spec: 2026-06-06._

---

## 🤝 How to run multiple sessions without stepping on each other

1. **One repo per session is the safe boundary** — branches in *different* repos never collide.
   Most of the work below is spread across repos precisely so it can run in parallel.
2. **Within one repo, split by module/file**, never have two sessions rewrite the same file.
3. **Claim a task** by putting your branch name in the _Owner/branch_ column before starting.
4. **Each session opens a draft PR early** so the others can see what's in flight.
5. **Respect the dependency arrows** (`⛔ blocked by`) — don't start a task whose input doesn't exist yet.
6. Sessions can't message each other live; **this file + the PR list are the coordination channel.**

---

## 🔴 BLOCKING DECISIONS (choices, not branches)

These gate large amounts of downstream code. They are *decisions for Mark*, best teed up with
`/deep-research`. Nothing in **Phase 3 (Integrations)** or "real-data wiring" can start until the
relevant one lands.

- [ ] **Odds / market-data provider** — the big one; blocks every other Phase-2 item & real bet placement.
- [ ] **Payment processor** (Paysafe already integrated in `payments2/` — option to keep).
- [ ] **KYC provider** (factory exists at `kyc/factory.js`).
- [ ] **Responsible-gambling provider** (replaces GAMSTOP).
- [ ] **Email transport** (replaces Gmail + Mailchimp).
- [ ] **CRM** — keep HubSpot or remove.

---

## 🎯 Stream A — Exchange (Betfair × Polymarket)

Mappers already **merged** into `backend-module-core` (#7). Remaining wiring:

| # | Task | Repo | Owner/branch | Blocked by |
|---|------|------|--------------|-----------|
| A1 | Attach sources to `product.system.exchange_sources`; verify real markets pull end-to-end into `markets2` (needs `BETFAIR_APP_KEY` env + runtime session token) | `backend-module-core` | _unclaimed_ | — |
| A2 | Build `/api/exchange/*` read endpoint | `backend-module-middleware` | _unclaimed_ | A1 |
| A3 | Flip `/exchange` off mock → real data | `matchpoint-client` | _unclaimed_ | A2 |
| A4 | Betfair cert-login + `keepAlive` (non-interactive bot login) | `backend-module-core` | _unclaimed_ | — |
| A5 | Decide fate of prototype **PR #2** (ported upstream; currently left as draft) | `client-tests` | this repo | — |

---

## 🏰 Stream B — The Moat (highest strategic value, ZERO external deps)

The benchmark flagged this as the single most defensible build. Auto-suspend (threshold-on-write)
is ~25% done and verified live.

| # | Task | Repo | Owner/branch | Blocked by |
|---|------|------|--------------|-----------|
| B1 | Event-sourced exposure store (beyond threshold-on-write) | `backend-module-core` | _unclaimed_ | — |
| B2 | Predictive CRM — CLV/churn models + control-group uplift harness | `backend-module-core` / new | _unclaimed_ | — |

---

## 🚀 Stream C — Deploy last-mile (Phase 5)

Backend stack is live on the DO droplet (`178.62.17.205`). Remaining:

| # | Task | Repo / Where | Owner/branch | Blocked by |
|---|------|--------------|--------------|-----------|
| C1 | Seed the `korex` brand so the API serves `korex` not just `system`; map vhost→product | droplet / config | _unclaimed_ | — |
| C2 | Let's Encrypt TLS via certbot for `api.korex.bet` | droplet | _unclaimed_ | DNS (manual) |
| C3 | Build + deploy `korex-backoffice-next` static → `admin.korex.bet` | `korex-backoffice-next` | _unclaimed_ | DNS (manual) |
| — | **Manual (Mark):** Gandi A-records `api`/`admin` → 178.62.17.205 | Gandi | Mark | — |
| — | **Manual (Mark):** point `www.korex.bet` (owned) → Vercel `cname.vercel-dns.com` so `www`→apex redirects | Gandi/Vercel | Mark | — |

---

## 📱 Stream D — Player frontend (`matchpoint-client`)

~80% to demo-ready. Independent UI tasks (can run in parallel — different pages):

| # | Task | Owner/branch | Blocked by |
|---|------|--------------|-----------|
| D1 | Casino playable launcher modal (in progress) | _unclaimed_ | — |
| D2 | Help / T&Cs / About / Responsible-Gambling content pages | _unclaimed_ | — |
| D3 | Onboarding tutorial overlay | _unclaimed_ | — |
| D4 | Pull mobile Figma frames (mobile currently falls back to interactive composition) | _unclaimed_ | — |
| D5 | Swap mock data layer → real backend RPC | _unclaimed_ | ⛔ Odds provider |

---

## 🧹 Stream E — Debt / hardening

| # | Task | Repo | Owner/branch |
|---|------|------|--------------|
| E1 | AWS SDK v2 → v3 migration | `server-modules-base` | _unclaimed_ |
| E2 | Real test suite wired to CI | umbrella / per-repo | _unclaimed_ |
| E3 | Schema migration: `UNIQUE` on `users.email` (audit #16) | `backend-database-schema` | _unclaimed_ |
| E4 | Schema migration: lift `user_type` to first-class indexed column (#17) | `backend-database-schema` | _unclaimed_ |
| E5 | Schema migration: session `expires_at`/`created_at` + cleanup (#18) | `backend-database-schema` | _unclaimed_ |

---

## 🟢 Recommended order to spin up

1. **B1/B2 (moat)** and **A1→A2→A3 (exchange)** — both have no provider blocker and are the
   strategic differentiators. Run in parallel (different repos).
2. **C1–C3 (deploy)** — gets `api.korex.bet` / `admin.korex.bet` real (after Mark's DNS records).
3. **D1–D4 (frontend polish)** — parallel, low-risk, no blockers.
4. **Decide a provider** (esp. odds) to unblock D5 + Phase 3.
