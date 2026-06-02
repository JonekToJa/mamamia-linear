# CLAUDE.md — mamamia-linear

Kanban app for managing IT work. 1.0 scope. Deployed on Railway.

This file is the contract for Claude Code sessions on this repo. Read it
before making changes.

## Project

A board/column/card Kanban with rich-text card descriptions, per-board tags,
multiple checklist sections per card, comments, and a unified activity log.
There is **no authentication** — a single seeded `User` is always treated as
the current user. Other users exist only to populate member search and owner
pickers.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Prisma** ORM + **PostgreSQL** (Railway plugin)
- **Tiptap** (StarterKit + Underline + Link with autolink) for card
  descriptions, stored as sanitized HTML
- **sanitize-html** for HTML scrubbing on write
- **zod** for input validation at API boundaries
- **Tailwind CSS** for styling (to be added with the first UI step)

No auth lib, no websocket layer, no email/SMTP, no file uploads in 1.0.

## Repo layout

```
app/                  Next.js App Router routes
  api/                Route handlers (REST-ish JSON)
  boards/[boardId]/   Main view (sidebar + board)
components/           UI components (Sidebar, BoardHeader, CardPreview, CardDrawer, ...)
lib/
  db.ts               Prisma client singleton
  currentUser.ts      Mock user resolver — single source for "who is acting"
  activity.ts         Helpers that write Activity rows in the same tx as a mutation
  sanitize.ts         sanitize-html config used for card descriptions
  position.ts         Fractional-index helpers (top/bottom/between)
prisma/
  schema.prisma       Data model
  migrations/         Generated migrations (committed)
  seed.ts             Seeds the mock user + a handful of demo users
```

## Commands

```
npm run dev          # local dev server
npm run build        # prisma generate + next build
npm run start        # production server
npm run lint
npm run typecheck
npm run db:migrate   # prisma migrate dev (local schema changes)
npm run db:deploy    # prisma migrate deploy (Railway pre-deploy step)
npm run db:seed      # tsx prisma/seed.ts
npm run db:studio    # prisma studio
```

Local Postgres options:
- Docker: `docker run -d --name mamamia-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`
- Railway-linked: `railway link` then `railway run npm run dev`

## Conventions (rules, not suggestions)

### Mock user

The "current user" comes from `lib/currentUser.ts`, which returns the `User`
row whose id matches the `MOCK_USER_ID` env var, falling back to the first
user in the table. Every write endpoint stamps `actor_user_id` /
`author_user_id` from this helper. **Do not** add login UI, session cookies,
or auth checks.

### Activity log

Every mutation that changes a card's column/board, owners, due date, tags, or
checklist state **must** write a corresponding `Activity` row inside the same
Prisma transaction as the mutation. Use the helpers in `lib/activity.ts` —
do not insert `Activity` rows ad-hoc from components or route handlers.

Activity types live in the `ActivityType` enum in `schema.prisma`. Add new
types there (and a migration) before logging them.

### Tags are board-scoped

`Tag.board_id` is required and `(board_id, name)` is unique. When attaching a
tag to a `ChecklistItem`, the tag's `board_id` must match the parent card's
board. Enforce this in `lib/` before writing.

### Positions

Use fractional `Float` positions for `Column`, `Card`, `Checklist`,
`ChecklistItem`. Helpers in `lib/position.ts`:
- top: `min(siblings.position) - 1` (or `1.0` if empty)
- bottom: `max(siblings.position) + 1`
- between: `(prev.position + next.position) / 2`

Cross-board card move ("move card to ..."): pick the target board's column
with min `position`, set the card's `columnId` to it, set `position` to top,
write `Activity { type: CARD_MOVED_BOARD, payload: { from_board_id, to_board_id } }`.

### Rich text

Card descriptions are sanitized HTML produced by Tiptap. On write, run through
`lib/sanitize.ts` (allowed tags: `b, i, em, strong, u, a, p, br, ul, ol, li`;
allowed attrs on `a`: `href, target, rel`). Tiptap extensions: `StarterKit`,
`Underline`, `Link.configure({ autolink: true, openOnClick: true, linkOnPaste: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } })`.

### Validation

All route handlers validate body/params with `zod` schemas defined next to
the handler. Reject early; never trust the client.

### Cascade deletes

The schema cascades board → column → card → checklist → checklist item, and
through all m2m join tables. Deletes do not need to be cleaned up by app code.

## Railway

- One Railway project, two services: the Next.js web service + the Postgres
  plugin.
- `DATABASE_URL` on the web service is a reference variable:
  `${{Postgres.DATABASE_URL}}`.
- `MOCK_USER_ID` is set after the first seed (the seed script prints the id).
- `railway.json` configures `preDeployCommand: npx prisma migrate deploy` so
  every deploy applies pending migrations before the new container starts.
- First-time seed: `railway run npm run db:seed` from a local checkout linked
  to the project, or run it once from the Railway service shell.

See the original plan at `/root/.claude/plans/i-want-to-build-snuggly-codd.md`
in development environments, and the README for the user-facing setup steps.

## Guardrails (do NOT do these in 1.0)

- No login/signup/session UI.
- No websockets, SSE, or live sync.
- No email sending.
- No file/image uploads on cards.
- No third-party auth providers (Google/GitHub/etc.).
- No multi-tenant scoping beyond `BoardMember` access.
