# Animistia

Animistia is a cinematic anime streaming app with a curated catalog, authenticated viewing spaces, YouTube embeds, and a protected developer upload room.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/animistia/src/pages/` — public discovery, catalog, watch, library, auth, and developer room screens.
- `artifacts/animistia/src/components/` — the shared shell and catalog card presentation.
- `artifacts/api-server/src/routes/` — catalog, developer lock, and object-storage API routes.
- `lib/api-spec/openapi.yaml` — source of truth for API contracts and generated client hooks.
- `lib/db/src/schema/` — Drizzle schema for shows and developer lock settings.
- `artifacts/animistia/public/logo.png` and `logo.svg` — supplied Animistia mark for the app and Clerk screens.

## Architecture decisions

- Clerk provides browser authentication; API protection uses Clerk session cookies rather than manually managed bearer tokens.
- Video bytes upload directly to Replit App Storage via presigned URLs; PostgreSQL stores only show metadata and object paths.
- YouTube sources are stored as canonical URLs and converted to embed URLs only at playback time.
- The developer lock stores a salted scrypt hash and never persists the raw password.
- The landing page remains public; library and developer tools require a signed-in Clerk session.

## Product

- Browse a handpicked anime catalog by title, genre, or source.
- Watch YouTube embeds and uploaded videos in a dedicated viewing surface.
- Save titles locally to a signed-in personal library.
- Add, edit, feature, and remove catalog titles from the developer room.
- Upload MP4/WebM/MOV files through protected direct-to-storage upload flow.
- Configure and verify a second password lock for the developer room.

## User preferences

- The user wants a premium, best-looking anime streaming experience branded from the supplied Animistia logo.

## Gotchas

- The API contract must be changed before regenerating `@workspace/api-client-react` and `@workspace/api-zod`.
- Artifact workflows provide `PORT` and `BASE_PATH`; use the managed web workflow for preview rather than starting Vite manually.
- Clerk development-key warnings are expected in preview and do not indicate a broken auth setup.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
