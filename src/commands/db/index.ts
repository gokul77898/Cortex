import type { Command } from '../../commands.js'
import { executeShellCommandsInPrompt } from '../../utils/promptShellExecution.js'

const ALLOWED_TOOLS = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
]

const DB_PROMPT = (args: string) => {
  const subcommand = args.split(' ')[0] || 'help'
  const rest = args.split(' ').slice(1).join(' ')

  const prompts: Record<string, string> = {
    query: `## Database Query Assistant

You are an expert database engineer. The user wants to run a database query.

### Instructions:
1. Detect the database type in the project by scanning for:
   - \`package.json\` dependencies (pg, mysql2, mongoose, better-sqlite3, prisma, drizzle, knex, sequelize, typeorm)
   - Config files: \`prisma/schema.prisma\`, \`drizzle.config.ts\`, \`knexfile.js\`, \`.sequelizerc\`
   - Environment variables: DATABASE_URL, POSTGRES_*, MYSQL_*, MONGO_*
   - Docker compose files for database services

2. If a query is provided, analyze it for:
   - SQL injection risks
   - Performance issues (missing indexes, full table scans)
   - Suggest optimized version

3. Execute the query safely using the project's database client or CLI tool

User request: ${rest || 'Show me the database setup and available tables/collections'}

### Safety Rules:
- NEVER run DROP, TRUNCATE, or DELETE without explicit confirmation
- NEVER expose connection strings or credentials in output
- Always use parameterized queries when possible
- Warn about queries that could be expensive on large tables`,

    migrate: `## Database Migration Generator

You are an expert database migration engineer.

### Instructions:
1. Detect the ORM/migration tool in use:
   - Prisma: Look for \`prisma/schema.prisma\`
   - Drizzle: Look for \`drizzle.config.ts\` or \`drizzle/\`
   - Knex: Look for \`knexfile.js\` or \`migrations/\`
   - Sequelize: Look for \`.sequelizerc\` or \`migrations/\`
   - TypeORM: Look for \`ormconfig.*\` or \`data-source.ts\`
   - Raw SQL: Look for \`migrations/\` directory with .sql files

2. Based on the user's request, generate a migration:
   - Follow the project's existing migration naming convention
   - Include both UP and DOWN migrations
   - Add proper types and constraints
   - Handle nullable fields correctly
   - Add indexes for foreign keys and frequently queried columns

3. Create the migration file in the correct directory

User request: ${rest || 'Show current schema and suggest what migrations might be needed'}

### Rules:
- Follow existing migration patterns in the project
- Always include rollback (down) migration
- Add comments explaining complex changes
- Validate foreign key references exist`,

    optimize: `## Database Optimization Advisor

You are a senior database performance engineer.

### Project Analysis:
- Package dependencies: !\`cat package.json 2>/dev/null | grep -E "(pg|mysql|mongo|sqlite|prisma|drizzle|knex|sequelize|typeorm)" || echo "No package.json found"\`
- Schema files: !\`find . -maxdepth 4 -name "schema.prisma" -o -name "drizzle.config.*" -o -name "knexfile.*" -o -name "*.schema.ts" 2>/dev/null | head -10\`
- Migration files: !\`find . -path "*/migrations/*" -name "*.ts" -o -path "*/migrations/*" -name "*.sql" 2>/dev/null | head -10\`
- Model files: !\`find . -path "*/models/*" -name "*.ts" -o -path "*/models/*" -name "*.js" 2>/dev/null | head -10\`

### Instructions:
1. **Schema Analysis**: Read schema/model files and identify:
   - Missing indexes on foreign keys
   - Missing composite indexes for common query patterns
   - Improper data types (e.g., VARCHAR(255) for UUIDs)
   - Missing NOT NULL constraints
   - N+1 query patterns in the codebase

2. **Query Analysis**: Scan codebase for:
   - Raw SQL queries without parameterization
   - SELECT * queries (should select specific columns)
   - Missing pagination on list endpoints
   - Unbounded queries without LIMIT
   - Missing WHERE clauses on UPDATE/DELETE

3. **Connection Pool Analysis**: Check for:
   - Connection pool configuration
   - Connection leak risks
   - Proper connection cleanup

4. **Output a detailed report** with:
   - 🔴 Critical issues (data loss risk, injection, no indexes)
   - 🟡 Performance issues (N+1, missing indexes, full scans)
   - 🔵 Suggestions (better types, caching, read replicas)
   - Specific file:line references
   - Concrete fix recommendations with code examples

${rest ? `Focus on: ${rest}` : ''}`,

    schema: `## Database Schema Analyzer

You are an expert data architect.

### Instructions:
1. Find and read ALL schema/model definitions in the project
2. Generate a comprehensive schema map showing:
   - All tables/collections
   - Columns with types
   - Relationships (1:1, 1:N, N:M)
   - Indexes
   - Constraints

3. Visualize as ASCII diagram

4. Identify potential issues:
   - Circular references
   - Missing foreign key constraints
   - Orphan tables
   - Normalization issues

${rest ? `Focus on: ${rest}` : 'Show the complete schema'}`,

    help: `## Database Commands

Available database subcommands:

- \`/db query <sql or description>\` — Run or analyze a database query
- \`/db migrate <description>\` — Generate a database migration
- \`/db optimize [area]\` — Analyze and suggest database optimizations
- \`/db schema [table]\` — Visualize and analyze database schema

Examples:
  /db query show all users with their orders
  /db migrate add email_verified column to users table
  /db optimize indexes
  /db schema

Supported ORMs: Prisma, Drizzle, Knex, Sequelize, TypeORM, raw SQL
Supported databases: PostgreSQL, MySQL, SQLite, MongoDB

Please specify a subcommand.`,
  }

  return prompts[subcommand] || prompts['help']!
}

const db: Command = {
  type: 'prompt',
  name: 'db',
  aliases: ['database'],
  description: 'Database tools: query, migrate, optimize, schema analysis',
  allowedTools: ALLOWED_TOOLS,
  contentLength: 0,
  progressMessage: 'analyzing database',
  source: 'builtin',
  async getPromptForCommand(args, context) {
    const promptContent = DB_PROMPT(args)
    const finalContent = await executeShellCommandsInPrompt(
      promptContent,
      {
        ...context,
        getAppState() {
          const appState = context.getAppState()
          return {
            ...appState,
            toolPermissionContext: {
              ...appState.toolPermissionContext,
              alwaysAllowRules: {
                ...appState.toolPermissionContext.alwaysAllowRules,
                command: ALLOWED_TOOLS,
              },
            },
          }
        },
      },
      '/db',
    )
    return [{ type: 'text', text: finalContent }]
  },
}

export default db
