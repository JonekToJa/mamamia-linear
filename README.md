# mamamia-linear

Kanban app for managing IT work. Single mocked user, no auth. Deployed on Railway.

See [`CLAUDE.md`](./CLAUDE.md) for the working conventions, stack details, and
data model rules. This README is the human setup guide.

## Local development

1. **Install deps**
   ```
   npm install
   ```
2. **Start Postgres** (Docker example):
   ```
   docker run -d --name mamamia-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
   ```
3. **Configure env**
   ```
   cp .env.example .env
   # edit DATABASE_URL if needed
   ```
4. **Migrate + seed**
   ```
   npm run db:migrate
   npm run db:seed
   # copy the printed MOCK_USER_ID into .env
   ```
5. **Run**
   ```
   npm run dev
   ```

## Railway setup

1. Push the repo to GitHub.
2. railway.com → **New Project** → **Deploy from GitHub repo** → select this
   repo and branch.
3. In the new project, **+ New** → **Database** → **PostgreSQL**.
4. On the web service → **Variables**:
   - `DATABASE_URL = ${{Postgres.DATABASE_URL}}` (reference variable)
   - `MOCK_USER_ID =` (leave blank for now)
5. The repo's [`railway.json`](./railway.json) already configures the build,
   the pre-deploy migration (`npx prisma migrate deploy`), and the start
   command. The first deploy will create the tables.
6. Seed the database. Either:
   - **Locally, against production:** `railway link` to the project, then
     `railway run npm run db:seed`. Copy the printed `MOCK_USER_ID` into the
     Railway variable.
   - **From Railway shell:** open the web service → **Shell** → run
     `npm run db:seed`.
7. Redeploy so the service picks up `MOCK_USER_ID`.

## What's here right now

Only the foundations: Prisma schema, seed script, Railway config, and
`CLAUDE.md`. There is **no UI yet** — that's the next step.
