'use strict';
// Offline unit tests for the DB-free logic. No Postgres, no network.
//   node --test scripts/backfill-demo-identities/

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { buildPlan, detectCollisions, missingColumns, updateSql, CONFIG } = require('./backfill.js');

const C = (uid) => ({ uid });
const ID = (givennames, surname, email) => ({
  givennames, surname, email,
  dateofbirth: '1990-01-01', bill_postcode: 'AA1 1AA',
});

test('buildPlan pairs candidates to identities 1:1 in order', () => {
  const plan = buildPlan([C(7), C(3), C(9)], [
    ID('Aisha', 'Khan', 'a@x.com'),
    ID('Tom', 'Sullivan', 't@x.com'),
    ID('Grace', 'Edwards', 'g@x.com'),
  ]);
  assert.equal(plan.length, 3);
  assert.deepEqual(plan.map(p => p.uid), [7, 3, 9]);
  assert.equal(plan[0].name, 'Aisha Khan');
  assert.equal(plan[1].email, 't@x.com');
});

test('buildPlan truncates to the shorter list (mismatch path)', () => {
  assert.equal(buildPlan([C(1), C(2), C(3)], [ID('A', 'B', 'a@x.com')]).length, 1);
  assert.equal(buildPlan([C(1)], [ID('A', 'B', 'a@x.com'), ID('C', 'D', 'c@x.com')]).length, 1);
});

test('detectCollisions ignores rows we own, flags foreign matches', () => {
  const owned = [1, 2, 3];
  const existing = [
    { uid: 2, product_email: 'mine@x.com' },   // ours — fine
    { uid: 99, product_email: 'theirs@x.com' }, // someone else — collision
  ];
  const clashes = detectCollisions(existing, owned);
  assert.equal(clashes.length, 1);
  assert.equal(clashes[0].uid, 99);
});

test('detectCollisions compares uids as strings (uuid/int agnostic)', () => {
  assert.equal(detectCollisions([{ uid: '5', product_email: 'e' }], [5]).length, 0);
  assert.equal(detectCollisions([{ uid: 5, product_email: 'e' }], ['5']).length, 0);
});

test('missingColumns reports only absent required columns', () => {
  const present = new Set(['uid', 'givennames', 'surname']);
  assert.deepEqual(missingColumns(present, ['uid', 'surname']), []);
  assert.deepEqual(missingColumns(present, ['uid', 'product_email']), ['product_email']);
});

test('identities.json is internally consistent', () => {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'identities.json'), 'utf8')
  );
  assert.equal(raw.brand, 'korex');
  const ids = raw.identities;
  assert.equal(ids.length, 11, 'expected 11 identities for the 11 players');

  // Distinct emails (product_email is UNIQUE per brand).
  const emails = ids.map(i => i.email.toLowerCase());
  assert.equal(new Set(emails).size, ids.length, 'emails must be unique');

  // Distinct real-world identity (name+dob) so no false Account-Linkage clusters.
  const nameDob = ids.map(i => `${i.givennames}|${i.surname}|${i.dateofbirth}`.toLowerCase());
  assert.equal(new Set(nameDob).size, ids.length, 'name+dob must be distinct');

  for (const i of ids) {
    assert.match(i.dateofbirth, /^\d{4}-\d{2}-\d{2}$/, `bad dob: ${i.dateofbirth}`);
    assert.match(i.email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/, `bad email: ${i.email}`);
    assert.ok(i.givennames && i.surname && i.bill_postcode, 'name/postcode required');
    const age = (Date.now() - Date.parse(i.dateofbirth)) / (365.25 * 24 * 3600 * 1000);
    assert.ok(age >= 21, `under 21: ${i.givennames} ${i.surname}`);
  }
});

test('updateSql writes jsondets fill-only (existing keys win, never overwritten)', () => {
  const sql = updateSql();
  const j = CONFIG.COL_JSONDETS;
  // The new keys must be the LEFT operand of `||` and the existing object the
  // RIGHT, so a DOB/postcode already present wins (true idempotent fill-only).
  const buildIdx = sql.indexOf('jsonb_build_object');
  const existingIdx = sql.indexOf(`|| COALESCE(${j}`);
  assert.ok(buildIdx > -1 && existingIdx > -1, 'expected jsonb_build_object(...) || COALESCE(existing)');
  assert.ok(buildIdx < existingIdx, 'existing jsondets must be on the RIGHT of || (fill-only)');
  // Guard against regressing to the overwrite order: COALESCE(existing) || build_object.
  assert.ok(
    !new RegExp(`COALESCE\\(${j}[^)]*\\)\\s*\\|\\|\\s*jsonb_build_object`).test(sql),
    'must not place existing jsondets on the LEFT of || (that overwrites real keys)'
  );
  // The scalar columns stay fill-only too.
  assert.match(sql, /givennames\s*=\s*COALESCE\(NULLIF\(TRIM/);
});

test('CONFIG exposes the required column set used by preflight', () => {
  for (const k of ['USERS_TABLE', 'COL_UID', 'COL_BRAND', 'COL_PRODUCT_EMAIL', 'COL_JSONDETS']) {
    assert.ok(CONFIG[k], `CONFIG.${k} must be set`);
  }
});
