---
name: handoff
description: >
  Produce a durable handoff doc under docs/<task>-HANDOFF.md so work survives an
  ephemeral web session. Use when a task can't be completed in-session (needs a
  backend-scoped run, live DB/secrets, or another environment), or when asked to
  "write a handoff", "park this", or "make this survive the session".
---

# handoff

This sandbox is ephemeral and structurally can't reach the korex backend/DB.
Anything that needs a privileged environment must be left as a self-contained
runbook, following the existing `docs/demo-player-identity-backfill-HANDOFF.md`
pattern. Keep the doc and the code artifact separate — link, don't duplicate.

## A handoff doc must contain
1. **Status line** — what's built/verified vs. what is NOT yet applied, and the
   exact environment required to finish (e.g. "backend-scoped session with
   korex `DATABASE_URL`").
2. **Canonical artifact** — link the PR/branch and pin the commit SHA the runbook
   was verified against. The doc points at the code; it does not re-paste it.
3. **What it does** — plain-language effect, and precisely which tables/fields or
   files it touches.
4. **Verified (offline)** — the exact commands run here and their result
   (e.g. `node --test '…/*.test.js'` → N/N pass), plus any logic review notes.
5. **Pre-apply checks / risks** — schema assumptions to confirm, idempotency /
   dry-run defaults, rollback behaviour, and anything a wrong guess would break.

## Rules
- Never put live secrets in the doc (guard-secrets will block it). Reference
  where they come from (`secrets/…`, env vars) instead.
- Default any destructive script to dry-run; require an explicit `--apply`.
- State assumptions you could not verify in-session, loudly.
