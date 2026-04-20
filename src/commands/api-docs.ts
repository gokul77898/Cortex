import { CODE_EDIT_TOOLS, makeTierCommand, PKG_TOOLS, SHELL_TOOLS } from './_tierHelper.js'

export default makeTierCommand({
  name: 'api-docs',
  aliases: ['apidocs', 'openapi'],
  description: 'Generate OpenAPI 3.1 spec + JSDoc/docstrings from your HTTP routes',
  progressMessage: 'analyzing routes',
  allowedTools: [
    ...CODE_EDIT_TOOLS,
    ...SHELL_TOOLS,
    ...PKG_TOOLS,
    'Bash(jq:*)',
    'Bash(npx:*)',
    'Bash(mkdir:*)',
  ],
  buildPrompt: (args) => `## API Documentation Generation Protocol

**Target:** ${args || '(auto-detect routes in cwd)'}

You generate accurate, **non-fabricated** OpenAPI 3.1 documentation by reading real source code. Do NOT invent endpoints.

### 1. Detect the framework
Use Glob + Read. Look for the **actual** framework in use:

| Signal | Framework |
|---|---|
| \`import { Router } from 'express'\` or \`app.get(\`, \`app.post(\` in .js/.ts | Express |
| \`@Controller\`, \`@Get\`, \`@Post\` | NestJS |
| \`createRouter\` in .ts + \`next\` in deps | Next.js App Router / Pages API |
| \`from fastapi import\` | FastAPI |
| \`from flask import\` | Flask |
| \`Rails.application.routes\` | Rails |
| \`Hono\` imports | Hono |
| \`router.HandleFunc\` / \`gin.Engine\` | Go (net/http / gin) |

If none found, stop and tell the user.

### 2. Enumerate every route

For each detected file:
- Extract HTTP method, path, handler function name.
- Extract path params (\`:id\` / \`{id}\` / \`[id]\`) and query params.
- Extract request body schema (from Zod / Pydantic / class-validator / struct tags if present).
- Extract response type (from return statement / response_model / JSON.stringify shape).
- Extract status codes actually used (\`res.status(201)\`, \`raise HTTPException(404)\`).

### 3. Build OpenAPI 3.1 spec

Write \`docs/openapi.yaml\` (or \`openapi.yaml\` at root). Fields:
\`\`\`yaml
openapi: 3.1.0
info:
  title: <from package.json name / setup.py>
  version: <from package.json version / __version__>
  description: <from README first paragraph if present>
servers:
  - url: http://localhost:<port>
paths:
  /path/{param}:
    get:
      summary: <from JSDoc/docstring if present, else handler name>
      parameters: [...]
      requestBody: {...}
      responses: {...}
components:
  schemas: { ... }  # extracted from Zod/Pydantic/TypeScript interfaces
\`\`\`

### 4. Emit inline docs

For each handler lacking docs:
- **JS/TS:** add JSDoc block (\`@param\`, \`@returns\`, \`@throws\`).
- **Python:** add Google-style docstring.
- **Go:** add \`// FuncName documentation\` comments.
- **Ruby:** add YARD \`@param\` / \`@return\` tags.

Use Edit/MultiEdit tools. **Only write documentation derived from the actual code — never invent behaviour.**

### 5. Generate a Swagger UI static site

Write \`docs/index.html\` that loads \`openapi.yaml\` via Swagger UI CDN:
\`\`\`html
<!doctype html>
<html>
<head><title>API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
<div id="swagger"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>window.ui = SwaggerUIBundle({ url: 'openapi.yaml', dom_id: '#swagger' })</script>
</body>
</html>
\`\`\`

### 6. Validate

Run \`npx @redocly/cli lint docs/openapi.yaml\` if available. Report any validation errors.

### 7. Summary

Print:
- Number of endpoints documented
- Number of handlers updated with inline docs
- Path to \`docs/openapi.yaml\`
- How to preview: \`npx http-server docs\` or \`python3 -m http.server 8000 -d docs\`

### Rules
- **Never fabricate.** If a field's type is unclear, mark it as \`{}\` / \`any\` and flag it in the summary.
- Skip files that aren't actual route definitions (tests, examples, node_modules).
- Preserve existing OpenAPI file — merge rather than overwrite if one exists.

Proceed.`,
})
