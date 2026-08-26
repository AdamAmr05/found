# Threshold

Temporary working repository for a global housing acquisition product built for
the Convex, Firecrawl, AgentMail, and Codex hackathon.

The product model is intentionally not committed yet. The repository currently
contains the agreed technical foundation and architecture invariants.

## Foundation

- TanStack Start and React 19
- Convex database, functions, real-time sync, Agent, Workflow, and static hosting
- Effect v4 for typed integration programs and operational failures
- Firecrawl and AgentMail Convex components
- Oxlint, strict TypeScript, Prettier, Vitest, Playwright, and Knip
- Tailwind CSS v4 with the repository [Design System](./docs/DESIGN_SYSTEM.md),
  vendored from its [upstream source](https://github.com/firecrawl/open-scouts/blob/main/DESIGN_SYSTEM.md)

## Commands

```sh
pnpm dev
pnpm check
pnpm test:e2e
pnpm deadcode
```

Read [`AGENTS.md`](./AGENTS.md) before making architectural changes.
