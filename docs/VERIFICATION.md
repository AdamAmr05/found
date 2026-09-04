# Verifying the app

## Start here

```sh
pnpm install
pnpm exec playwright install chromium # first time on a machine
pnpm verify:setup
```

`verify:setup` creates a password account through the real UI on the first
run and reuses it thereafter. It verifies authenticated access to the composer,
session persistence after reload, sign-out persistence, and password login in
a fresh browser context. It does not send a prompt or call paid search providers.

The command uses the existing development backend from `.env.local`. It requires
`CONVEX_DEPLOYMENT=dev:…` and a matching `VITE_CONVEX_URL`. It starts its own Vite
server on `http://127.0.0.1:3100` and stops it when finished. Keep that port free.
It does not deploy backend code. If backend changes need syncing, run `pnpm dev`
against the development deployment first.

## Browse as the test account

Run `pnpm dev`, or reuse the app if it is already running, then open
`http://127.0.0.1:3000`. Read `.cache/verification/account.json` locally and use
its `username` and `password` in the sign-in form. Use this same origin consistently;
`localhost` and `127.0.0.1` have separate browser sessions.

The account has a generated `test-account-…` username and a random password.
Credentials are stored in a gitignored file with owner-only permissions. They
are ordinary development credentials, with no special permissions or auth bypass.
The account is tied to the backend recorded in that file. If switching dev
deployments, move the credential file aside and run setup again. Moving or deleting
the file does not delete the old backend account or its data.

Use **New thread** for a clean manual scenario. This account's data persists, so
inspect existing state before assuming the workspace is empty. Do not use the
shared account for parallel automated tests; `tests/e2e/auth.ts` creates isolated
accounts for those runs.

## Verification surfaces and evidence

- `/`: real authentication and durable conversation surface. Sending a message
  can invoke the model and provider integrations; only do so for a relevant task.
- `/playground`: fixture-based accommodation interaction study.
- `/lab`: fixture-based representation and interaction studies. Success here
  does not prove backend search or artifact persistence works.
- `/playground/materials/ascii`: isolated visual material study.

After setup, `.cache/verification/signed-in.png` shows the signed-in state.
Failures from setup save evidence under `.cache/verification/results/`.
The regular E2E suite saves failures in `test-results/` and its HTML report in
`playwright-report/`. Traces are retained even on the first failed local run:

```sh
pnpm exec playwright show-trace path/to/trace.zip
pnpm exec playwright show-report
```

Treat credentials, traces, and screenshots as local artifacts: traces can contain
password submissions and authenticated data. Do not commit or publish them.

Run `pnpm check` after meaningful changes and `pnpm test:e2e` for interaction
flows. The E2E thread test sends a real message to the configured backend. Before
running it, verify that `.env.local` targets the intended development deployment.
Report the scenario exercised and what actually persisted, not just that a page
rendered. Provider-backed searches and outreach need their own task-specific
verification; account setup does not certify those flows.
