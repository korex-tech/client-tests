# `.claude/` — local Claude Code harness config

A deliberately small, ECC-inspired setup for this repo. See
[`docs/ECC-EVALUATION.md`](../docs/ECC-EVALUATION.md) for the rationale and what
was intentionally left out.

```
.claude/
├── settings.json            # wires the hooks below
├── hooks/
│   ├── session-start.sh      # SessionStart: install deps + orient (fresh containers)
│   └── guard-secrets.js      # PreToolUse(Edit|Write): block writes that embed live secrets
└── skills/
    ├── react-test/SKILL.md   # RTL/Jest workflow for src/ui + src/api
    └── handoff/SKILL.md       # durable docs/*-HANDOFF.md runbooks
```

- **Hooks** are project-scoped and run automatically once this directory is
  present. `guard-secrets.js` exits 2 to block a write containing private keys,
  DB connection strings, cloud/API tokens, etc. — conservative patterns only.
- **Skills** are invoked automatically when a task matches their `description`,
  or explicitly via `/react-test` and `/handoff`.

Nothing here adds a dependency: it's bash, Node (already in the toolchain), and
markdown.
