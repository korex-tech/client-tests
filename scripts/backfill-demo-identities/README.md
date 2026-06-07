# Demo player identity backfill (korex brand)

Gives the **11 identity-less seeded `korex` players** realistic names + emails
(+ DOB + postcode) so the back-office **identity views** become meaningful:

- **Risk Scorecard** — stops being a wall of identical `AMBER 40` rows
- **Account Linkage** — can cluster on `name+dob` / `dob+postcode` / `name+postcode`
- **VIP Whale Watchlist · User P&L · Reactivation worklist** — named rows instead of blanks

## ⚠️ Status: unverified artifact, parked here for portability

This was written from a `client-tests`-scoped session that **cannot reach the
backend**. Its real home is a backend seed/admin repo (e.g.
`backend-module-middleware` or the `korex-platform` umbrella). It has **not** been
run against a live DB. Before applying:

1. **Verify the schema.** The `CONFIG` block in `backfill.js` assumes
   `users.{givennames,surname,email,product_email,jsondets,product}` with
   `jsondets.dateofbirth` / `jsondets.bill_postcode`, taken from the Notion spec
   notes — confirm against `backend-database-schema/lib/schemas/core_authentication.js`
   and fix any column/table names that differ.
2. **Dry-run first** (default). It SELECTs, prints the `uid → identity` plan, and
   writes nothing.

## Run

```bash
# dry run — prints the plan, writes nothing
DATABASE_URL=postgres://USER:PASS@HOST:5432/DB node backfill.js

# apply — writes inside one transaction
DATABASE_URL=... node backfill.js --apply

# only if the candidate count != 11 (backfills first N in uid order)
DATABASE_URL=... node backfill.js --apply --allow-count-mismatch
```

Requires the `pg` package (present in the backend env).

## Tests (offline, no DB)

```bash
node --test 'scripts/backfill-demo-identities/*.test.js'
```

Covers the DB-free logic — candidate↔identity pairing, the count-mismatch
truncation, the `product_email` collision filter (uuid/int-agnostic), the
missing-column detector — and asserts `identities.json` is internally consistent
(11 entries, unique emails, distinct name+dob, valid dates, all 21+). 7/7 pass.

## Design notes / safety

- **Self-verifying preflight** (runs in dry-run too): checks the `users` table +
  every configured column exists via `information_schema` and **fails loud** —
  listing the columns it *did* find and any brand-like column — if a `CONFIG`
  guess is wrong, instead of erroring mid-write. Also refuses to apply if any new
  email already belongs to a different account in the brand (`product_email`
  UNIQUE guard). So a wrong schema assumption stops the run cleanly rather than
  corrupting data.
- **Dry-run by default**; `--apply` wraps all writes in a single `BEGIN/COMMIT`
  and `ROLLBACK`s on any error.
- **Idempotent** — only fills fields that are currently empty (`COALESCE(NULLIF(...))`),
  so a real identity is never clobbered and a half-applied run is safe to resume.
- **Narrow blast radius** — touches only korex-brand rows with no name. Never
  deletes; never touches balances/bets; **does not change `age_verified`/KYC**
  (the "active-while-unverified" state is real demo signal — flip it deliberately
  elsewhere, not here).
- `product_email` is set to the same value as `email` (the per-brand unique key).
- The 11 identities in `identities.json` are **mutually distinct** (distinct
  name + dob + postcode) so they do **not** create false Account-Linkage clusters
  and keep the verified `Demo Punter` / `Claude Verify` test rings clean. To demo
  a cluster instead, edit two rows to share a `surname+dateofbirth` (or
  `dateofbirth+bill_postcode`) pair.

## Editing the identities

`identities.json` → `{ brand, identities[] }`, each:
`{ givennames, surname, dateofbirth (YYYY-MM-DD), bill_postcode, email }`.
Assignment is by ascending `uid` order, stable across dry-run and apply.
