# Repository Guidelines

## Project Structure & Module Organization
This pnpm monorepo groups runtime, nodes, and UI work under `packages/`. `packages/cli` hosts the executable CLI and REST API served via `packages/cli/bin/n8n`. Shared execution logic lives in `packages/core`, while `packages/@n8n/db` owns database models and migrations. Integration nodes ship from `packages/nodes-base`, and reusable tooling resides in `packages/@n8n/*`. The Vue editor and design system sit in `packages/frontend`, with static resources under `/assets`. End-to-end specs and QA helpers live in `/cypress` and `packages/testing`, and automation utilities stay in `/scripts`.

## Build, Test, and Development Commands
Install dependencies with `pnpm install` (Node ≥22.16 required). `pnpm dev` launches the linked backend/frontend workspace; use `pnpm dev:be` or `pnpm dev:fe` to isolate stacks. Create production bundles via `pnpm build` or `pnpm build:n8n` when testing the packaged app. Run the CLI locally with `pnpm start` or `pnpm start:tunnel` for webhook testing. Linting and formatting are handled by `pnpm lint`, `pnpm lint:styles`, `pnpm format`, and `pnpm format:check`.

## Coding Style & Naming Conventions
TypeScript and Vue sources follow Biome defaults (`biome.jsonc`): tabs (width 2) and 100-character lines. `.vue` formatting runs through `scripts/format.mjs` and the design system stylelint config. Prefer `PascalCase` for classes, `camelCase` for functions and variables, and `SCREAMING_SNAKE_CASE` for environment keys; keep package or file names kebab-cased to match existing modules. Always run `pnpm lint` plus `pnpm format` before committing—Lefthook mirrors these checks pre-push.

## Testing Guidelines
Unit and integration suites use Jest/Vitest colocated under `packages/**/__tests__` and `packages/**/test`. Execute the full matrix with `pnpm test`; limit scope with `pnpm test:ci:frontend` or `pnpm test:ci:backend`. For Playwright-based regression, bootstrap Docker and run `pnpm test:with:docker`, then inspect reports via `pnpm test:show:report`. Add coverage beside the affected code, naming files `*.test.ts` and snapshots `__snapshots__/*.snap`.

## Commit & Pull Request Guidelines
Follow the conventional commit style (`feat(scope): summary`) visible in the Git history, keeping subject lines imperative and English even for localized features. Reference issue IDs or Jira tickets in footers when relevant. Pull requests should summarize scope, list verification steps, and attach UI screenshots or API samples. Link supporting docs (e.g., `CHANGELOG.md`, `SECURITY.md`) and flag configuration changes so reviewers can reproduce locally.

## Security & Configuration Tips
Secrets and tenant settings belong in your `.env`; never commit credentials. Review the `docker/` templates for hardened deployment defaults and keep dependency upgrades aligned with `renovate.json`. Security issues must follow the responsible-disclosure process documented in `SECURITY.md`.
