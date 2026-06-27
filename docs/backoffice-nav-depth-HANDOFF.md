# Back office nav-depth — handoff (recovered after lost session)

> **Why this lives in `client-tests`:** it's a portable handoff so the work survives an
> ephemeral session. The actual work belongs in **`korex-tech/korex-backoffice-next`**,
> which the session that wrote this doc could **not** reach (GitHub scope was
> `korex-tech/client-tests` only — `get_file_contents` on bo-next returned
> *"Access denied … Allowed repositories: korex-tech/client-tests"*).
>
> **To continue, start a session scoped to `korex-tech/korex-backoffice-next`.**

## What this is

The follow-on chosen after the **back-office navigation / IA overhaul** shipped
(Notion Phase Tracker, Session 2026-06-25; bo-next **PR #43 MERGED to main**, squash
`2f205b7`, deployed + browser-verified live on admin.korex.bet). The Phase Tracker
lists the next step, marked **"(chosen — in progress)"**:

> **(b) more nav depth** — player slide-over drawer, in-page `?tab=` entity tabs, breadcrumbs

That "in progress" session was lost before landing. No bo-next branch/PR for it could be
confirmed from here (repo inaccessible) — **first action in the scoped session: check for
an existing `claude/*nav*` branch or open PR in `korex-backoffice-next` before starting
fresh**, so you don't duplicate half-done work.

## The three deliverables

All three are **pure UI / navigation** — same contract as PR #43: **no money-path, no
data-fetching, no endpoint changes.**

1. **Player slide-over drawer** — open a player's key info in a right-side drawer
   (over the current screen) instead of a full navigation away, so an operator triaging
   a list (Risk Scorecard, withdrawal queue, AML flags) can peek a player and keep their
   place. Drawer should reuse the existing **Player 360** identity header + related-records
   rail (bets / transactions / bonuses / open positions / withdrawals / balance / risk
   scorecard) built in PR #43. Deep-linkable (drawer state in the URL) so it survives refresh.

2. **In-page `?tab=` entity tabs** — entity detail pages (player, market, campaign, offer)
   get tabbed sub-sections driven by a `?tab=` query param, on top of the existing
   **`useUrlState`** hook (the URL-state primitive from the Waves 1–5 work). Tab selection
   is shareable/bookmarkable and back-button friendly.

3. **Breadcrumbs** — a breadcrumb trail under the header reflecting the
   role-workspace / department / screen / entity path, complementing the existing
   **Department SubNav** (sibling-screen tabs) and **Related-views rail** (next-screen graph).

## Infrastructure already in place to build on (from PR #43 + Waves 1–5)

- `useUrlState` hook — canonical URL ⇄ component-state primitive (use it for `?tab=` and drawer state).
- `DataTable` with honest "Showing N of M" against real server COUNTs.
- `LinkToPlayer` / `LinkToBets` / `LinkToMarket` link primitives.
- **Role workspaces** — 6-seat topbar switcher (CEO/Owner, Head of Trading & Risk,
  MLRO/Compliance, Payments/Finance, CRM/Marketing, Support).
- **Department SubNav**, **Related-views rail**, **Player 360 hub**, **12 cross-department
  handoff buttons** + 101 inline cross-links across 32 screens.

## Constraints / definition of done (carry forward from PR #43)

- Pure UI/navigation only — **do not** touch money-path, data-fetching, or endpoints.
- `tsc -b` + `vite build` must be **clean**.
- Browser-verify **as each affected role**, **0 console errors**, then deploy to the droplet.
- Deploy cache: nginx on admin.korex.bet was fixed in PR #43 (`index.html` = `no-cache`,
  `/assets/` content-hashed = `immutable`) — deploys are picked up immediately; a browser
  holding an old copy needs one hard refresh. No nginx change needed for this work.
- After verifying live: add a Phase Tracker entry in Notion (🗺️ Phase Tracker under the
  🔮 KOREX — Project Hub) and flip the PR draft → ready.

## Pointers

- Notion: **🗺️ Phase Tracker** (`36a42e10-e6b9-8105-8a89-d81119512844`), entry
  "Session 2026-06-25 — Back office navigation / IA overhaul".
- bo-next merged baseline: **PR #43**, squash commit `2f205b7`.
- Other "next options" not chosen (context, in case priorities shift): (a) Compliance
  **Case Queue** with maker-checker + audit trail; (c) **integrations phase**
  (payments / KYC / odds-feed / casino).
