# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Coincidence (React + Vite)
- **Path**: `artifacts/coincidence/`
- **Preview**: `/`
- **Description**: A simple web app with two tabs — Swipe (fake profiles) and Coincidence (location-based user discovery). All data is in-memory with preloaded fake users.
- **Key files**:
  - `src/App.tsx` — Main app shell with tab navigation
  - `src/pages/swipe.tsx` — Swipe tab with fake profile cards
  - `src/pages/coincidence.tsx` — Coincidence mode with location selection
  - `src/lib/data.ts` — In-memory fake user and location data

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
