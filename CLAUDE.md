# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Paperclip is an open-source Node.js + React platform for orchestrating multiple AI agents into autonomous organizations. It uses a ticket-based task system, hierarchical agent structures, per-agent budgets, a heartbeat scheduler, and approval-based governance. Self-hosted, MIT-licensed.

## Requirements

- Node.js ≥ 20
- pnpm 9.15.4 (`corepack enable` to activate)

## Common Commands

All commands run from the repo root.

### Development

```bash
pnpm dev            # Start server + UI together (recommended)
pnpm dev:server     # Server only (port 3100)
pnpm dev:ui         # UI only (port 5173, proxies API to :3100)
pnpm storybook      # UI component explorer
```

### Testing

```bash
pnpm test           # Run all vitest tests (stable runner)
pnpm test:watch     # Vitest in watch mode
pnpm test:e2e       # Playwright end-to-end tests
pnpm test:e2e:headed  # Playwright with browser visible
```

To run tests for a single package:
```bash
pnpm --filter @paperclipai/server test
pnpm --filter @paperclipai/ui test
pnpm --filter @paperclipai/cli test
```

### Type Checking & Building

```bash
pnpm typecheck      # TypeScript across all packages
pnpm build          # Build all workspace packages
```

### Database

```bash
pnpm db:generate    # Generate Drizzle ORM migrations (packages/db)
pnpm db:migrate     # Apply migrations
pnpm db:backup      # Backup database
```

### Releases

```bash
pnpm release:canary   # Publish canary to npm
pnpm release:stable   # Publish stable to npm
pnpm build:npm        # Build CLI npm package (scripts/build-npm.sh)
```

Versioning uses calendar format: `YYYY.MDD.P` (stable) / `YYYY.MDD.P-canary.N` (canary). See `doc/PUBLISHING.md` for the full release process.

## Monorepo Structure

Managed with pnpm workspaces (`pnpm-workspace.yaml`):

```
server/          Express API server (port 3100)
ui/              React 19 frontend (port 5173 in dev)
cli/             CLI tool (Commander.js)
packages/
  shared/        Shared utilities
  db/            Drizzle ORM schema + migrations
  adapter-utils/ Shared adapter helpers
  adapters/      AI provider adapters (see below)
  plugins/       Plugin packages
```

### AI Adapters (`packages/adapters/`)

Each adapter wraps a different AI provider/tool for agent execution:
- `claude-local` — Anthropic Claude
- `codex-local` — OpenAI Codex
- `gemini-local` — Google Gemini
- `cursor-local`, `opencode-local`, `acpx-local`, `pi-local`

## Architecture Overview

### Server (`server/`)

- **Framework**: Express with 25+ route modules covering companies, projects, issues, agents, plugins, and more.
- **ORM**: Drizzle ORM against PostgreSQL (embedded via `embedded-postgres` for local dev, or external via `DATABASE_URL`).
- **Auth**: `better-auth` in two modes — `local_trusted` (no login, dev-friendly) and `authenticated` (full user accounts). Mode is set at startup.
- **Real-time**: WebSockets (`ws`) for live updates.
- **File storage**: AWS S3 client (configurable); `sharp` for image processing, `multer` for uploads.
- **Logging**: `pino`.
- **Validation**: Zod and Ajv.
- **Entry**: `server/src/index.ts` → configures DB, auth, heartbeat, plugins, then hands off to `server/src/app.ts` (Express setup).

### UI (`ui/`)

- **Stack**: React 19, TypeScript, Tailwind CSS, Vite.
- **Routing**: Company-prefixed routes with a `CloudAccessGate` auth wrapper. Public routes: `/auth`, `/board-claim`, `/cli-auth`, `/invite`.
- **State**: React Query (30-second stale time) + nested provider hierarchy.
- **Components**: Radix UI primitives, MDXEditor, Mermaid diagrams, React Markdown.
- **Dev proxy**: Vite proxies all API calls from port 5173 → 3100.

### CLI (`cli/`)

- Built with Commander.js, bundled with esbuild for npm distribution.
- Core commands: `onboard`, `doctor`, `run`, `configure`, `env`, `heartbeat`, `auth`, `db:backup`, `allowed-hostname`.
- Entry: `cli/src/index.ts`.

### Plugin System

Plugins live in `packages/plugins/` and are managed as workspace packages (except `sandbox-providers/` and the orchestration smoke example, which are excluded from the workspace to avoid lockfile churn). The server manages plugin workers and job scheduling via `server/src/app.ts`.

### Heartbeat & Scheduling

The server starts a heartbeat service at initialization that drives scheduled agent execution — this is a core mechanism for autonomous operation, not a health-check endpoint.

## Environment

Copy `.env.example` to `.env` for local development:

```
DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
PORT=3100
SERVE_UI=false
BETTER_AUTH_SECRET=paperclip-dev-secret
```

When `SERVE_UI=false`, the server serves only the API; run `pnpm dev:ui` separately. The Docker image serves the compiled UI from the server on port 3100.

## Docker

Multi-stage build (node:lts-trixie-slim). Persistent data volume at `/paperclip`. Exposes port 3100. Includes Claude Code, Codex, and OpenCode adapters in the image.

```bash
docker build -t paperclip .
docker run -p 3100:3100 -v $(pwd)/data:/paperclip paperclip
```

## Key Conventions

- **Package manager**: Always use `pnpm`. Do not use `npm` or `yarn`.
- **Filtering**: Use `pnpm --filter @paperclipai/<package> <script>` to run scripts in a single workspace package.
- **TypeScript**: Strict mode; `ES2023` target; path alias `@/*` maps to `src/*` in both `ui` and `server`.
- **Forbidden tokens check**: `pnpm check:tokens` runs before npm builds to prevent shipping secrets.
- **Test runner stability**: `pnpm test:run` uses `scripts/run-vitest-stable.mjs` (a wrapper) rather than calling vitest directly — prefer this over bare `vitest` for CI.
- **Drizzle migrations**: After schema changes in `packages/db`, always run `pnpm db:generate` and commit the generated migration files.
