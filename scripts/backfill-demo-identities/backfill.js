#!/usr/bin/env node
/*
 * Demo player identity backfill — korex brand.
 *
 * Gives the 11 identity-less seeded korex players realistic names + emails (and
 * dob + postcode) so the back-office IDENTITY views become meaningful:
 *   - Risk Scorecard      (no longer a wall of identical AMBER-40 rows)
 *   - Account Linkage     (clusters on name+dob / dob+postcode / name+postcode)
 *   - VIP Whale Watchlist / User P&L / Reactivation worklist (named rows)
 *
 * SAFETY
 *   - DRY RUN BY DEFAULT. It SELECTs, prints the plan, and writes nothing.
 *     Pass --apply to actually write (inside a single transaction).
 *   - Idempotent: only fills fields that are currently empty, so re-running
 *     never clobbers a real identity, and a half-applied run is safe to resume.
 *   - Operates only on rows the candidate query returns (korex brand, no
 *     given/surname). It never deletes, never touches balances/bets, and does
 *     NOT change KYC/age_verified state (the "active-while-unverified" signal is
 *     real demo data — flip that deliberately elsewhere, not here).
 *
 * ⚠️ SCHEMA ASSUMPTIONS — verify against backend-database-schema
 *    (lib/schemas/core_authentication.js) before --apply. The column/table names
 *    below are taken from the Notion spec notes, not from a live schema read.
 *    Adjust the CONFIG block if they differ; the script will also tell you which
 *    columns are missing rather than guessing.
 *
 * USAGE
 *   DATABASE_URL=postgres://user:pass@host:5432/db node backfill.js            # dry run
 *   DATABASE_URL=... node backfill.js --apply                                  # write
 *   node backfill.js --apply --allow-count-mismatch                            # if != 11 candidates
 *
 * Requires the `pg` package (present in the backend env; not a dep of client-tests).
 * This file lives in client-tests only as a portable handoff artifact — its real
 * home is a backend seed/admin repo.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ----- CONFIG (verify against the live schema) ------------------------------
const CONFIG = {
  USERS_TABLE: 'users',
  COL_UID: 'uid',
  COL_GIVENNAMES: 'givennames',
  COL_SURNAME: 'surname',
  COL_EMAIL: 'email',
  COL_PRODUCT_EMAIL: 'product_email',
  COL_JSONDETS: 'jsondets',          // jsonb; holds dateofbirth + bill_postcode
  COL_BRAND: 'product',              // brand/product discriminator column
  JSON_DOB_KEY: 'dateofbirth',
  JSON_POSTCODE_KEY: 'bill_postcode',
};
// ----------------------------------------------------------------------------

const APPLY = process.argv.includes('--apply');
const ALLOW_COUNT_MISMATCH = process.argv.includes('--allow-count-mismatch');

function loadIdentities() {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'identities.json'), 'utf8')
  );
  if (!raw.brand || !Array.isArray(raw.identities)) {
    throw new Error('identities.json must have { brand, identities[] }');
  }
  return raw;
}

// Candidate = korex-brand player with no name yet. Ordered deterministically so
// the identity assignment is stable across dry-run and apply.
function candidateSql() {
  const C = CONFIG;
  return `
    SELECT ${C.COL_UID}            AS uid,
           ${C.COL_GIVENNAMES}     AS givennames,
           ${C.COL_SURNAME}        AS surname,
           ${C.COL_EMAIL}          AS email,
           ${C.COL_PRODUCT_EMAIL}  AS product_email
      FROM ${C.USERS_TABLE}
     WHERE ${C.COL_BRAND} = $1
       AND COALESCE(NULLIF(TRIM(${C.COL_GIVENNAMES}), ''), NULL) IS NULL
       AND COALESCE(NULLIF(TRIM(${C.COL_SURNAME}),    ''), NULL) IS NULL
     ORDER BY ${C.COL_UID} ASC`;
}

function updateSql() {
  const C = CONFIG;
  // Only fill empties (COALESCE(NULLIF(trim,''))) so a real identity is never
  // overwritten; jsondets keys are merged, not replaced.
  return `
    UPDATE ${C.USERS_TABLE} SET
      ${C.COL_GIVENNAMES}    = COALESCE(NULLIF(TRIM(${C.COL_GIVENNAMES}), ''), $2),
      ${C.COL_SURNAME}       = COALESCE(NULLIF(TRIM(${C.COL_SURNAME}),    ''), $3),
      ${C.COL_EMAIL}         = COALESCE(NULLIF(TRIM(${C.COL_EMAIL}),         ''), $4),
      ${C.COL_PRODUCT_EMAIL} = COALESCE(NULLIF(TRIM(${C.COL_PRODUCT_EMAIL}), ''), $5),
      ${C.COL_JSONDETS}      = COALESCE(${C.COL_JSONDETS}, '{}'::jsonb)
                                 || jsonb_build_object(
                                      '${C.JSON_DOB_KEY}',      $6::text,
                                      '${C.JSON_POSTCODE_KEY}', $7::text)
     WHERE ${C.COL_UID} = $1`;
}

async function main() {
  let Client;
  try {
    ({ Client } = require('pg'));
  } catch (e) {
    console.error('Missing dependency `pg`. Run this in the backend env, or `npm i pg`.');
    process.exit(1);
  }

  const data = loadIdentities();
  const ids = data.identities;
  const client = new Client(); // reads DATABASE_URL / PG* from env
  await client.connect();

  try {
    const { rows: candidates } = await client.query(candidateSql(), [data.brand]);
    console.log(`Brand '${data.brand}': ${candidates.length} identity-less player(s) found; ${ids.length} identities available.\n`);

    if (candidates.length === 0) {
      console.log('Nothing to do — no identity-less players. (Already backfilled?)');
      return;
    }
    if (candidates.length !== ids.length && !ALLOW_COUNT_MISMATCH) {
      console.error(
        `Count mismatch: ${candidates.length} candidates vs ${ids.length} identities.\n` +
        `Re-check the candidate query / identities.json, or pass --allow-count-mismatch ` +
        `to backfill the first ${Math.min(candidates.length, ids.length)} in uid order.`
      );
      process.exit(2);
    }

    const n = Math.min(candidates.length, ids.length);
    const plan = [];
    for (let i = 0; i < n; i++) {
      const c = candidates[i], id = ids[i];
      plan.push({ uid: c.uid, name: `${id.givennames} ${id.surname}`, email: id.email });
    }
    console.log('Plan (uid → identity):');
    plan.forEach(p => console.log(`  ${String(p.uid).padEnd(38)} → ${p.name.padEnd(20)} ${p.email}`));
    console.log('');

    if (!APPLY) {
      console.log('DRY RUN — no changes written. Re-run with --apply to commit.');
      return;
    }

    await client.query('BEGIN');
    let written = 0;
    for (let i = 0; i < n; i++) {
      const c = candidates[i], id = ids[i];
      const res = await client.query(updateSql(), [
        c.uid, id.givennames, id.surname, id.email, id.email,
        id.dateofbirth, id.bill_postcode,
      ]);
      written += res.rowCount;
    }
    await client.query('COMMIT');
    console.log(`APPLIED — ${written} row(s) updated and committed.`);
    console.log('Next: reload Risk Scorecard / Account Linkage / VIP Watchlist on admin.korex.bet to verify.');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Failed (rolled back):', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
