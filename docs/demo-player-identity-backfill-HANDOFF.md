# Demo-player identity backfill (korex) — apply handoff

**Status:** artifact built + verified offline; **NOT yet applied to the live DB.**
The apply must run from a **backend-scoped session** with the korex `DATABASE_URL`
(from `secrets/korex_dev_secrets.json`). This `client-tests` sandbox structurally
cannot reach the korex Postgres, so the script is parked here as a portable handoff.

- **Canonical artifact:** PR
  [#4](https://github.com/korex-tech/client-tests/pull/4) — branch
  `claude/demo-player-identity-backfill-fbosH`,
  `scripts/backfill-demo-identities/` (`identities.json` + `backfill.js` +
  `backfill.test.js` + `README.md`), pinned at commit `f7f8c4b`.
- This doc is the **runbook + Notion handoff** so the work survives an ephemeral
  session. It deliberately does **not** duplicate the script — grab that from PR #4.

## What it does

Fills the **11 identity-less seeded `korex` players** with realistic names + emails
(+ DOB + postcode) so the IDENTITY back-office views stop being blank/uniform:

- **Risk Scorecard** — no longer a flat wall of identical `AMBER 40` rows
- **Account Linkage** — can cluster on `name+dob` / `dob+postcode` / `name+postcode`
- **VIP Whale Watchlist · User P&L · Reactivation worklist** — named rows, not blanks

Writes only `users.{givennames,surname,email,product_email}` and
`jsondets.{dateofbirth,bill_postcode}` for `product='korex'` rows with no name.

## Verified (offline, in client-tests)

- `node --test 'scripts/backfill-demo-identities/*.test.js'` → **7/7 pass**
  (pairing, count-mismatch truncation, `product_email` collision filter,
  missing-column detector, `identities.json` consistency: 11 unique, distinct
  name+dob, all 21+).
- Logic review: dry-run default, single `BEGIN/COMMIT` (`ROLLBACK` on error),
  idempotent `COALESCE(NULLIF())` fills, `information_schema` preflight,
  `product_email` UNIQUE guard.
- **Count corroborated independently:** the Notion Phase Tracker records the
  Risk Scorecard shipped live with **"11 players"** — matches the 11 candidates
  the backfill expects.

## ⚠️ Schema check before `--apply`

CONFIG in `backfill.js` assumes
`users.{uid,givennames,surname,email,product_email,jsondets,product}` and
`jsondets.{dateofbirth,bill_postcode}`. The brand-discriminator column is assumed
to be **`product`** — this is *supported* by the Developer Handoff notes
(`products.kyc_provider`, `product.<name>.affiliate` config) but **not confirmed
against the schema**. Before applying, eyeball it against
`backend-database-schema/lib/schemas/core_authentication.js`, or just let the
script's preflight tell you — it reads `information_schema` live and fails loud,
listing the columns it actually found (incl. brand-like candidates) so a wrong
guess is a one-line CONFIG fix, not a mid-write error.

## Runbook (backend-scoped session)

```bash
# 1. Get the script from PR #4
git fetch origin claude/demo-player-identity-backfill-fbosH
git checkout origin/claude/demo-player-identity-backfill-fbosH -- scripts/backfill-demo-identities/
cd scripts/backfill-demo-identities
# pg is present in the backend env; otherwise: npm i pg

# 2. DRY RUN — prints uid→identity plan, writes nothing
DATABASE_URL=<korex pg> node backfill.js
#    → MUST report exactly 11 identity-less korex players + clean plan + preflight OK.
#    → If it is NOT 11: STOP and report why (candidate query / `product` column).
#      Do not pass --allow-count-mismatch blindly.

# 3. APPLY — one transaction
DATABASE_URL=<korex pg> node backfill.js --apply
```

## Verify live (admin.korex.bet)

- **Risk Scorecard** — no longer a flat AMBER-40 wall; 11 named rows / spread scores
- **Account Linkage** — 11 named players, no false clusters (all distinct)
- **VIP Whale Watchlist** — named rows instead of blanks
- Note anything that doesn't light up as expected.

## Constraints (carry forward)

- Dry-run before **every** `--apply`.
- Do **not** change `age_verified`/KYC — the active-while-unverified signal is real
  demo data.
- Do **not** touch balances/bets — identity fields only. Per-currency money is out
  of scope here (this task writes none).
- All 11 stay **mutually distinct** (no deliberate Account-Linkage cluster) unless
  the owner explicitly asks for a linked pair.

## After verified live

1. Paste the Phase Tracker entry below (it's a **new** entry — there is no existing
   2026-06-07 backfill note to edit; the page's last edit predates PR #4).
2. Flip PR #4 **draft → ready**, noting it's verified live.

### Phase Tracker entry — paste once verified (fill the `«…»` placeholders)

```markdown
## ✅ Session 2026-06-07 (c) — Demo-player identity backfill APPLIED + LIVE (identity views now meaningful)
Backfilled the 11 identity-less seeded `korex` players with realistic names + emails
(+ DOB + postcode), so every IDENTITY-driven back-office view stops being blank/uniform.
Ran from a backend-scoped session against the live `korex` DB; artifact is client-tests PR #4.

What it does: fills users.{givennames,surname,email,product_email} + jsondets.{dateofbirth,
bill_postcode} for the 11 product='korex' rows with no name. Dry-run-first, single transaction,
idempotent (only fills empties), product_email UNIQUE-guarded. Did NOT touch age_verified/KYC
or balances/bets.

Schema check: CONFIG verified against backend-database-schema/lib/schemas/core_authentication.js
before apply — brand column = «product / actual»; columns «matched / CONFIG adjusted: …».

Dry-run: reported exactly 11 identity-less players, clean plan, preflight passed.
Applied: «11» row(s) updated + committed.

Verified live (2026-06-07) on admin.korex.bet:
- Risk Scorecard — «no longer a flat AMBER-40 wall; 11 named rows / scores spread»
- Account Linkage — «11 named players; no false clusters (all distinct name+dob+postcode)»
- VIP Whale Watchlist — «named rows instead of blanks»
- «Anything that didn't light up as expected: …»

PR: client-tests #4 — flipped draft → ready, verified live. Offline tests 7/7.
```
