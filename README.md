# Threshold

Repository for a global housing acquisition product built for the Convex,
Firecrawl, AgentMail, and Codex hackathon.

The repository contains the technical foundation and working interaction
surfaces for comparing accommodation candidates, inspecting evidence, and
approving outreach. Backend and provider integrations are not connected yet.

## Foundation

- TanStack Start and React 19
- Convex database, functions, real-time sync, Agent, Workflow, and static hosting
- Effect v4 for typed integration programs and operational failures
- Firecrawl and AgentMail Convex components
- Oxlint, strict TypeScript, Prettier, Vitest, Playwright, and Knip
- Tailwind CSS v4 with the product-owned [Design System](./docs/DESIGN_SYSTEM.md)

## Commands

```sh
pnpm dev
pnpm check
pnpm test:e2e
pnpm deadcode
```

Read [`AGENTS.md`](./AGENTS.md) before making architectural changes.
