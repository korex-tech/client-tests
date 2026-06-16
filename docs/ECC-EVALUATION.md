# ECC (Everything Claude Code) — evaluation for `client-tests`

**Date:** 2026-06-16 · **Verdict:** adopt a trimmed subset, not the full framework.

## What ECC is
[Everything Claude Code](https://github.com/affaan-m/everything-claude-code)
(Affaan Mustafa / "cogsec", MIT-licensed) is the author's personal Claude Code
harness configuration, open-sourced after winning the Anthropic × Forum Ventures
hackathon. It is **configuration, not a runtime library**: ~67 subagents, ~125
skills, ~60 slash commands, trigger hooks, language rule packs, MCP configs, and
a security scanner (`ecc-agentshield`), installed via a profile
(core / developer / security / full).

## Why not adopt it wholesale here
`@korex-tech/client-tests` is a single small Create React App used as an
AI-driven dev sandbox. The full ECC install is built for large, polyglot,
multi-repo systems and would add enormous surface area we'd never trigger
(Go/Python/Swift/PHP rule packs, dozens of agents). Our harness **already ships**
ECC's best ideas: `/code-review`, `/security-review`, `/verify`, Plan/Explore
agents, and a `session-start-hook` skill — so most of ECC would be redundant.

## What we took (now living in `.claude/`)
| Item | ECC origin | Why it earns its place here |
|---|---|---|
| `hooks/session-start.sh` | ECC "session-start" automation | Ephemeral web containers clone fresh; installs deps so `npm test`/lint work, and orients a new session. |
| `hooks/guard-secrets.js` | `ecc-agentshield` (secret scanner) | This repo touches real `DATABASE_URL` / `secrets/…`, and `.env` is **not** gitignored. Blocks AI-generated writes that embed live credentials. |
| `skills/react-test` | ECC testing skills | RTL/Jest workflow scoped to our deposit/withdrawal/auth surface. |
| `skills/handoff` | ECC workflow/skill pattern | Codifies the existing `docs/*-HANDOFF.md` practice so work survives ephemeral sessions. |

## What we deliberately skipped
The 67-agent fleet, the 125-skill firehose, language rule packs for languages we
don't use, multi-tool config generation (we're Claude-Code-only), and the
desktop dashboard.

## Would I run this permanently?
**The trimmed subset above: yes — keep it.** It's small, dependency-free (the
guard runs on Node already in the toolchain), and each piece maps to a real risk
or chore in *this* repo. **The full ECC framework: no** — for a repo this size
it's net-negative maintenance for capability we already have. Re-evaluate the
fuller profile only if this sandbox grows into a multi-language or multi-service
codebase.

## Maintenance notes
- Everything is plain bash/Node + markdown — no new dependencies, nothing to
  pin or update.
- Revisit if upstream ECC ships a materially better secret scanner we'd rather
  vendor than maintain.
