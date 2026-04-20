import { CODE_EDIT_TOOLS, GIT_READ_TOOLS, makeTierCommand, SHELL_TOOLS } from './_tierHelper.js'

export default makeTierCommand({
  name: 'migrate',
  aliases: ['migration', 'gen-migration'],
  description: 'Generate a real database migration by diffing two schema states (files, git refs, or live DB)',
  progressMessage: 'diffing schemas',
  allowedTools: [
    ...CODE_EDIT_TOOLS,
    ...GIT_READ_TOOLS,
    ...SHELL_TOOLS,
    'Bash(psql:*)',
    'Bash(sqlite3:*)',
    'Bash(mysql:*)',
    'Bash(pg_dump:*)',
    'Bash(npx prisma:*)',
    'Bash(npx drizzle-kit:*)',
    'Bash(alembic:*)',
    'Bash(python manage.py makemigrations:*)',
    'Bash(mkdir:*)',
    'Bash(date:*)',
  ],
  buildPrompt: (args) => `## Migration Generation Protocol

**Args:** ${args || '(no args: diff current working schema vs last git-committed version)'}

You generate a **safe, reversible** migration from a real diff of two schema states. **No fabricated SQL.** Every statement must correspond to an actual delta.

### 1. Identify ORM / migration tool

| Signal | Tool |
|---|---|
| \`prisma/schema.prisma\` | Prisma |
| \`drizzle.config.*\` | Drizzle |
| \`alembic.ini\` or \`migrations/env.py\` | Alembic (SQLAlchemy) |
| \`manage.py\` + Django | Django migrations |
| \`db/migrate/\` + Rails | ActiveRecord |
| \`ormconfig.*\` / TypeORM in deps | TypeORM |
| \`knexfile.*\` | Knex |
| Raw SQL only | hand-rolled |

### 2. Prefer official tooling

Run the native migration generator first — **these are guaranteed to be correct**:

- **Prisma:** \`npx prisma migrate dev --create-only --name <name>\`
- **Drizzle:** \`npx drizzle-kit generate --name <name>\`
- **Alembic:** \`alembic revision --autogenerate -m "<name>"\`
- **Django:** \`python manage.py makemigrations\`
- **Rails:** \`rails generate migration <name>\`
- **TypeORM:** \`npm run typeorm migration:generate -- -n <name>\`
- **Knex:** \`npx knex migrate:make <name>\`

If the tool succeeds, **stop** and show the generated file. Don't hand-write SQL over it.

### 3. Fallback: hand-written diff (only if no ORM tooling works)

**Obtain both schemas:**
- Two files → Read both.
- Git refs → \`git show <ref>:path/to/schema\` for each.
- Live DB → \`pg_dump --schema-only\` / \`sqlite3 <db> ".schema"\`.

**Compute diff per table:**
| Change | Forward SQL | Rollback SQL |
|---|---|---|
| Table added | CREATE TABLE | DROP TABLE |
| Table dropped | — (block, ask user) | CREATE TABLE |
| Column added (nullable) | ALTER TABLE ADD COLUMN | ALTER TABLE DROP COLUMN |
| Column added (NOT NULL) | ADD COLUMN NULL → backfill → ALTER SET NOT NULL | reverse |
| Column renamed | ALTER TABLE RENAME COLUMN (Postgres) / emulate for MySQL/SQLite | reverse |
| Column type changed | USING expression; flag for review | reverse |
| Column dropped | — (block, ask user) | ADD COLUMN |
| Index added | CREATE INDEX CONCURRENTLY (Postgres) / CREATE INDEX | DROP INDEX |
| FK added | ALTER TABLE ADD CONSTRAINT ... NOT VALID; VALIDATE | DROP CONSTRAINT |

### 4. Write the files

Path convention (detect or default):
- Prisma: \`prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql\`
- Alembic: \`alembic/versions/<rev>_<name>.py\`
- Django: \`<app>/migrations/000N_<name>.py\`
- Rails: \`db/migrate/<YYYYMMDDHHMMSS>_<name>.rb\`
- Raw SQL: \`migrations/<YYYYMMDDHHMMSS>_<name>.{up,down}.sql\`

### 5. Safety rules (hard stops — require user confirmation before writing)

- DROP TABLE / DROP COLUMN on populated tables
- ALTER COLUMN TYPE where the conversion is not implicitly safe
- SET NOT NULL without a backfill step
- Renaming PK columns
- Removing or narrowing FKs

When flagged, emit the migration but prefix the destructive statement with a comment:
\`\`\`sql
-- DESTRUCTIVE: will drop data. Confirm before running.
-- DROP TABLE legacy_users;
\`\`\`

### 6. Summary

Print:
- Tool used (Prisma / Alembic / hand-written / etc.)
- Migration file path(s)
- Count of additive vs destructive changes
- Exact command to apply: \`npx prisma migrate deploy\` / \`alembic upgrade head\` / \`python manage.py migrate\` / \`rails db:migrate\`
- Rollback command

### Rules
- **Never apply migrations automatically.** Print the command for the user.
- Always produce a rollback / down migration.
- Include a data-migration stub when a column type change affects populated data.

Proceed.`,
})
