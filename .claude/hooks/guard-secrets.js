#!/usr/bin/env node
/*
 * guard-secrets — a lightweight stand-in for ECC's `ecc-agentshield`.
 *
 * Runs as a PreToolUse hook on Edit/MultiEdit/Write. It scans the *incoming*
 * content for high-confidence secret material and blocks the write (exit 2) so
 * an AI-generated edit can't commit live credentials into source. This repo has
 * real exposure here: its history references DATABASE_URL and
 * secrets/korex_dev_secrets.json, and `.env` itself is NOT gitignored
 * (only .env.*.local is) — so a plain `.env` write would otherwise be tracked.
 *
 * Conservative on purpose: only patterns that are almost never legitimate in
 * source trigger a block, to avoid nagging on ordinary edits.
 */
'use strict';

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload = {};
  try { payload = JSON.parse(raw || '{}'); } catch { process.exit(0); }

  const input = payload.tool_input || {};
  const filePath = input.file_path || input.path || '';

  // Collect every chunk of text this tool is about to write.
  const parts = [];
  if (typeof input.content === 'string') parts.push(input.content);
  if (typeof input.new_string === 'string') parts.push(input.new_string);
  if (Array.isArray(input.edits)) {
    for (const e of input.edits) if (e && typeof e.new_string === 'string') parts.push(e.new_string);
  }
  const text = parts.join('\n');
  if (!text) process.exit(0);

  const findings = [];
  const checks = [
    [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, 'private key block'],
    [/postgres(?:ql)?:\/\/[^\s:@/]+:[^\s:@/]+@/i, 'Postgres connection string with embedded password'],
    [/\b(?:DATABASE_URL|DB_PASSWORD|DB_PASS)\s*[:=]\s*['"]?\S{6,}/, 'database credential assignment'],
    [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
    [/\bsk-(?:ant-)?[A-Za-z0-9_-]{16,}/, 'API secret key (sk-…)'],
    [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/, 'GitHub token'],
    [/\b(?:api[_-]?key|secret|token|passwd|password)\s*[:=]\s*['"][A-Za-z0-9+/_=-]{20,}['"]/i, 'hardcoded secret-like literal'],
  ];
  for (const [re, label] of checks) if (re.test(text)) findings.push(label);

  if (findings.length) {
    console.error(
      `⛔ guard-secrets blocked a write to ${filePath || '(unknown file)'}:\n` +
      findings.map((f) => `  - ${f}`).join('\n') +
      `\nIf this is intentional, put it in an untracked file (.env.local, secrets/),\n` +
      `reference it via process.env, and re-run. Never commit live credentials.`
    );
    process.exit(2); // exit 2 => block the tool call, feed stderr back to the model
  }
  process.exit(0);
});
