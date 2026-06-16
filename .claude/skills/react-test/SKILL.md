---
name: react-test
description: >
  Write or extend tests for this Create React App client (React Testing Library
  + Jest). Use when adding/changing a component in src/ui or an api wrapper in
  src/api and a test should accompany it, or when asked to "add a test",
  "test this component", or verify UI behaviour.
---

# react-test

Scoped to `@korex-tech/client-tests` — a CRA app using React Testing Library
(`@testing-library/react`, `@testing-library/jest-dom`, `user-event`).

## Workflow

1. **Locate the unit.** Components live in `src/ui/*.js`, the API/context wrapper
   in `src/api/EclContext.js`. Co-locate the test next to it as `<Name>.test.js`.
2. **Test behaviour, not implementation.** Query by role/label/text the way a
   user would (`getByRole`, `getByLabelText`, `findByText`) — not by class or
   internal state. Drive interaction with `user-event`, not raw fires.
3. **Mock the network boundary.** These components talk to a backend via
   `EclContext`/fetch. Stub that boundary; never hit a live endpoint or embed
   real credentials (the guard-secrets hook will block that anyway).
4. **Cover the money/auth paths deliberately.** Deposit, withdrawal, login and
   promotions flows are the sensitive surface — assert both the success path and
   at least one failure/validation path.
5. **Run it:** `npm test -- --watchAll=false <file>`. Tests must pass before you
   hand off. Don't leave `.only`/`.skip` behind.

## House style
- One behaviour per `it`, described from the user's point of view.
- Prefer `findBy*`/`waitFor` for anything async over arbitrary timeouts.
- Keep fixtures inline and minimal; no shared mutable test state.
