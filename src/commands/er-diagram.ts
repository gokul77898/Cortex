import { CODE_EDIT_TOOLS, makeTierCommand, SHELL_TOOLS } from './_tierHelper.js'

export default makeTierCommand({
  name: 'er-diagram',
  aliases: ['er', 'erd', 'schema-diagram'],
  description: 'Introspect a database / ORM schema and emit a Mermaid ER diagram',
  progressMessage: 'introspecting schema',
  allowedTools: [
    ...CODE_EDIT_TOOLS,
    ...SHELL_TOOLS,
    'Bash(psql:*)',
    'Bash(sqlite3:*)',
    'Bash(mysql:*)',
    'Bash(mysqldump:*)',
    'Bash(pg_dump:*)',
    'Bash(npx prisma:*)',
    'Bash(mkdir:*)',
  ],
  buildPrompt: (args) => `## ER Diagram Generation Protocol

**Source:** ${args || '(auto-detect: prisma, drizzle, sqlalchemy, typeorm, django models, active record, or DATABASE_URL)'}

You produce a **faithful** Mermaid \`erDiagram\` from a real schema source. Never fabricate tables or columns — every entity must come from the introspected source.

### 1. Detect the schema source

Check in this order:
1. **Prisma** — \`prisma/schema.prisma\` exists.
2. **Drizzle** — \`drizzle.config.*\` or \`**/schema.ts\` with \`pgTable\`/\`sqliteTable\`/\`mysqlTable\`.
3. **SQLAlchemy** — \`**/models.py\` with \`class X(Base)\` and \`Column(\`.
4. **Django** — \`**/models.py\` with \`models.Model\`.
5. **TypeORM** — \`@Entity()\` decorators.
6. **Rails** — \`db/schema.rb\`.
7. **Raw SQL** — \`**/schema.sql\` / \`**/migrations/*.sql\`.
8. **Live DB** — \`DATABASE_URL\` / \`POSTGRES_CONNECTION_STRING\` in .env.

### 2. Extract entities

For each source type, use the documented introspection method:

- **Prisma:** parse \`schema.prisma\` models; fields use \`@id\`, \`@relation\`.
- **Drizzle:** parse \`pgTable('name', { col: type() })\` calls.
- **SQLAlchemy:** parse \`__tablename__\` + \`Column\` calls + \`relationship()\`.
- **Django:** parse \`class Model\` + \`models.ForeignKey\` / \`ManyToManyField\`.
- **Rails schema.rb:** parse \`create_table\` blocks + \`add_foreign_key\`.
- **Raw SQL:** read CREATE TABLE + FOREIGN KEY statements.
- **Live Postgres:**
  \`\`\`sql
  SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema='public' ORDER BY table_name, ordinal_position;

  SELECT tc.table_name AS src, kcu.column_name AS src_col,
         ccu.table_name AS dst, ccu.column_name AS dst_col
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu USING(constraint_name)
  JOIN information_schema.constraint_column_usage ccu USING(constraint_name)
  WHERE tc.constraint_type='FOREIGN KEY';
  \`\`\`
- **Live SQLite:** \`sqlite3 <db> ".schema"\` then parse.

### 3. Emit Mermaid

Write to \`docs/er-diagram.md\`:

\`\`\`markdown
# ER Diagram

> Generated from: <source type + path>
> Date: <today>

\\\`\\\`\\\`mermaid
erDiagram
    USER {
        int id PK
        string email "unique, not null"
        string name
        timestamp created_at
    }
    POST {
        int id PK
        int user_id FK
        string title
        text body
        timestamp created_at
    }
    USER ||--o{ POST : "authors"
\\\`\\\`\\\`
\`\`\`

Relationship cardinalities:
- \`||--o{\` one-to-many
- \`}o--o{\` many-to-many (via join table)
- \`||--||\` one-to-one
- \`||--o|\` one-to-zero-or-one

### 4. Also emit a plain PlantUML version

Write \`docs/er-diagram.puml\` as a fallback for tools that don't speak Mermaid.

### 5. Summary

Print:
- Source detected
- Number of entities
- Number of relationships
- Path to the diagram files
- A one-line preview command: \`cat docs/er-diagram.md\`

### Rules
- **Never guess a relationship** without a FK / @relation marker.
- PK/FK/unique markers must reflect the real schema.
- Skip Prisma implicit m-n relation tables (\`_AtoB\`) unless user asks for raw.
- If no schema source is found, stop with a clear message.

Proceed.`,
})
