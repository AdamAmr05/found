# Vendored Effect references

These files are repository-local snapshots used to develop and review
`docs/EFFECT.md`. Reading the conventions does not require internet access.

## Snapshots

| Local file | Upstream snapshot |
| --- | --- |
| `OFFICIAL_EFFECT_GUIDE.md` | `effect@4.0.0-rc.112`, package `AGENTS.md` |
| `EFFECT_LANGUAGE_SERVICE.md` | `@effect/language-service@0.87.2`, package `README.md` |
| `.agents/skills/effect-ts/SKILL.md` | `Effect-TS/skills`, installed by `skills` |
| `.agents/skills/effect-service-design/SKILL.md` | `dmmulroy/skills` commit `8603380821fee6a77c82639f364ce8fe4f5a92be` |
| `CODING_STANDARDS.md` | `dmmulroy/skills` commit `8603380821fee6a77c82639f364ce8fe4f5a92be` |
| `opencode/*` | OpenCode `dev` commit `1cc53890dc0d902e6c85eca5b7e27cbf0a04541a` |

The source URLs are retained here only for attribution and future refreshes:

- Effect: `https://github.com/Effect-TS/effect`
- Effect skills: `https://github.com/Effect-TS/skills`
- Effect language service: `https://github.com/Effect-TS/language-service`
- Dillon Mulroy's skills: `https://github.com/dmmulroy/skills`
- OpenCode: `https://github.com/anomalyco/opencode`

The Effect, Dillon skills, and OpenCode sources are distributed under MIT
licenses. The copied source files are kept unmodified; repository-specific
decisions belong in `docs/EFFECT.md`.

## Refresh policy

Do not silently update these snapshots. When the pinned Effect release or a
reference revision changes, update the files, version or commit above, and then
review `docs/EFFECT.md` for API or architectural drift.
