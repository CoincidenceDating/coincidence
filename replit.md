# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM + Supabase (auth + storage)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Coincidence (React + Vite)
- **Path**: `artifacts/coincidence/`
- **Preview**: `/`
- **Description**: Mobile-style dating/connection app. Users swipe profiles, check into real locations via Coincidence Mode, and chat with matches. Powered by Supabase (auth, 8 data tables, Storage for photos).
- **Color scheme**: Dark purple-night (`#0D0E1A` background), pink→purple gradient accents (`#E8387D → #9B5DE5`), white text. CSS vars in `src/index.css`. Utility classes: `.gradient-text`, `.gradient-btn`.
- **Key files**:
  - `src/App.tsx` — Main app shell with dark nav bar (Discover/Places/Matches/Likes/Profile), tab management
  - `src/pages/swipe.tsx` — Discover tab with gradient "coincidence" header, swipe card, boost button
  - `src/pages/coincidence.tsx` — Places/Coincidence mode with location hot spots and match overlay
  - `src/pages/matches.tsx` — Matches list with Stars Aligned / Coincidence / Swipe sections
  - `src/pages/undecided.tsx` — Likes/maybe pile with gradient confirm buttons
  - `src/pages/profile.tsx` — User profile with photo grid, boost management, account settings
  - `src/pages/auth.tsx` — Auth page (create/login) with gradient buttons and tab switcher
  - `src/pages/setup.tsx` — First-time profile setup wizard
  - `src/pages/chat.tsx` — Chat page with animated rope SVG and auto-replies
  - `src/components/SwipeCard.tsx` — Swipe card with rope physics, NOPE/YES/MAYBE overlays, action buttons (X dark, Heart pink-gradient large, Star purple)
  - `src/lib/db.ts` — Supabase data layer (matches, threads, checkins, boost, blocked, swiped, photos)
  - `src/lib/data.ts` — Static mock profiles and locations

## Supabase Setup
- URL: `https://gbxwmvarpxvhrtjhrdkn.supabase.co`
- Anon key: `VITE_SUPABASE_ANON_KEY` env secret
- Tables: `user_profiles`, `matches`, `messages`, `check_ins`, `boost_settings`, `blocked_users`, `swiped_users`, `swipe_sessions`
- Storage bucket: `profile-photos` (photos stored as `{userId}/{filename}`)
- Column: `user_profiles.photos text[]`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Stripe Payments (Pending)
- `stripe` and `stripe-replit-sync` packages are installed at workspace root
- Stripe integration NOT yet connected — user will create a Stripe account later
- When ready: connect via Replit Integrations tab (Stripe connector) OR provide `sk_test_...` / `sk_live_...` key as a secret
- String packs are ONE-TIME purchases (not subscriptions): 1 string £3.99, 5 strings £18.99, 10 strings £34.99
- Checkout mode should be `payment` (not `subscription`)
- After payment: webhook should add strings to `user_profiles` in Supabase

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
