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
  // Fill-only everywhere so a real identity is never overwritten: the scalar
  // columns use COALESCE(NULLIF(trim,'')); the jsondets keys put the existing
  // object on the RIGHT of `||` so any DOB/postcode already present WINS (and all
  // other jsondets keys are preserved). New keys only land where absent — making
  // a re-run / half-applied resume genuinely idempotent for jsondets too.
  return `
    UPDATE ${C.USERS_TABLE} SET
      ${C.COL_GIVENNAMES}    = COALESCE(NULLIF(TRIM(${C.COL_GIVENNAMES}), ''), $2),
      ${C.COL_SURNAME}       = COALESCE(NULLIF(TRIM(${C.COL_SURNAME}),    ''), $3),
      ${C.COL_EMAIL}         = COALESCE(NULLIF(TRIM(${C.COL_EMAIL}),         ''), $4),
      ${C.COL_PRODUCT_EMAIL} = COALESCE(NULLIF(TRIM(${C.COL_PRODUCT_EMAIL}), ''), $5),
      ${C.COL_JSONDETS}      = jsonb_build_object(
                                      '${C.JSON_DOB_KEY}',      $6::text,
                                      '${C.JSON_POSTCODE_KEY}', $7::text)
                                 || COALESCE(${C.COL_JSONDETS}, '{}'::jsonb)
     WHERE ${C.COL_UID} = $1`;
}

// ----- Pure logic (DB-free, unit-tested in backfill.test.js) ----------------

// Which required columns are absent from the set the DB reported.
function missingColumns(presentSet, required) {
  return required.filter(c => !presentSet.has(c));
}

// Pair each identity-less candidate (already ordered) with an identity, 1:1 in
// order, up to the shorter of the two lists. Pure — no DB, no side effects.
function buildPlan(candidates, ids) {
  const n = Math.min(candidates.length, ids.length);
  const plan = [];
  for (let i = 0; i < n; i++) {
    const c = candidates[i], id = ids[i];
    plan.push({
      uid: c.uid,
      givennames: id.givennames, surname: id.surname, email: id.email,
      dateofbirth: id.dateofbirth, bill_postcode: id.bill_postcode,
      name: `${id.givennames} ${id.surname}`,
    });
  }
  return plan;
}

// Rows whose product_email matches a new email but which are NOT one of the
// accounts we're backfilling → a real UNIQUE-constraint collision.
function detectCollisions(existingRows, ownedUids) {
  const owned = new Set(ownedUids.map(String));
  return existingRows.filter(r => !owned.has(String(r.uid)));
}

// Preflight: confirm the configured table + columns actually exist before we
// trust any of the CONFIG guesses. Fails loud (with the columns it DID find, so
// you can fix CONFIG) rather than erroring mid-write on a bad column name.
async function verifySchema(client) {
  const C = CONFIG;
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [C.USERS_TABLE]
  );
  if (rows.length === 0) {
    throw new Error(`Table '${C.USERS_TABLE}' not found — fix CONFIG.USERS_TABLE.`);
  }
  const present = new Set(rows.map(r => r.column_name));
  const required = [
    C.COL_UID, C.COL_GIVENNAMES, C.COL_SURNAME, C.COL_EMAIL,
    C.COL_PRODUCT_EMAIL, C.COL_JSONDETS, C.COL_BRAND,
  ];
  const missing = missingColumns(present, required);
  if (missing.length) {
    // Offer likely alternatives so CONFIG is a quick fix, not a guessing game.
    const hint = (names) => names.filter(n => present.has(n));
    throw new Error(
      `Missing column(s) on '${C.USERS_TABLE}': ${missing.join(', ')}.\n` +
      `  brand-like columns present: ${hint(['product','brand','product_id','product_name','site']).join(', ') || '(none)'}\n` +
      `  Columns on table: ${[...present].sort().join(', ')}\n` +
      `Fix the CONFIG block to match, then re-run.`
    );
  }
  console.log(`Schema OK — '${C.USERS_TABLE}' has all ${required.length} required columns.\n`);
}

// Guard the product_email UNIQUE (per-brand) constraint: refuse to apply if any
// new email already exists on a DIFFERENT account in this brand.
async function checkEmailCollisions(client, brand, ids, candidateUids) {
  const C = CONFIG;
  const emails = ids.map(i => i.email);
  const { rows } = await client.query(
    `SELECT ${C.COL_UID} AS uid, ${C.COL_PRODUCT_EMAIL} AS product_email
       FROM ${C.USERS_TABLE}
      WHERE ${C.COL_BRAND} = $1 AND ${C.COL_PRODUCT_EMAIL} = ANY($2::text[])`,
    [brand, emails]
  );
  const clashes = detectCollisions(rows, candidateUids);
  if (clashes.length) {
    throw new Error(
      `product_email collision — these emails already belong to other ${brand} accounts:\n` +
      clashes.map(c => `  ${c.product_email} (uid ${c.uid})`).join('\n') +
      `\nEdit identities.json to use unique emails, then re-run.`
    );
  }
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
    await verifySchema(client);
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
    const plan = buildPlan(candidates, ids);
    console.log('Plan (uid → identity):');
    plan.forEach(p => console.log(`  ${String(p.uid).padEnd(38)} → ${p.name.padEnd(20)} ${p.email}`));
    console.log('');

    const usedUids = plan.map(p => p.uid);
    await checkEmailCollisions(client, data.brand, ids.slice(0, n), usedUids);

    if (!APPLY) {
      console.log('Preflight passed (schema + email uniqueness).');
      console.log('DRY RUN — no changes written. Re-run with --apply to commit.');
      return;
    }

    await client.query('BEGIN');
    let written = 0;
    for (const p of plan) {
      const res = await client.query(updateSql(), [
        p.uid, p.givennames, p.surname, p.email, p.email,
        p.dateofbirth, p.bill_postcode,
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

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { buildPlan, detectCollisions, missingColumns, updateSql, CONFIG };
