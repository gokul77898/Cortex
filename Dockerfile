# =============================================================================
# CORTEX CLI — Production Docker image
# =============================================================================
# Build:
#   docker build -t cortex:latest .
# Run:
#   docker run -it --rm -e OPENAI_API_KEY=sk-... cortex "hello"
# =============================================================================

FROM node:26-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    git curl ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json bun.lock* package-lock.json* ./
RUN bun install --frozen-lockfile 2>/dev/null || npm install --silent

COPY . .
RUN npm run build

# =============================================================================
# Runtime image
# =============================================================================
FROM node:26-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r cortex && useradd -r -g cortex -m -d /home/cortex cortex

RUN python3 -m venv /home/cortex/.venv
ENV PATH="/home/cortex/.venv/bin:${PATH}"
ENV VIRTUAL_ENV="/home/cortex/.venv"
COPY python/requirements.txt /tmp/requirements.txt
RUN /home/cortex/.venv/bin/pip install --quiet --upgrade pip \
 && /home/cortex/.venv/bin/pip install --quiet -r /tmp/requirements.txt uv

WORKDIR /home/cortex/app

COPY --from=builder /app/dist /home/cortex/app/dist
COPY --from=builder /app/bin /home/cortex/app/bin
COPY --from=builder /app/python /home/cortex/app/python
COPY --from=builder /app/cortex.mjs /home/cortex/app/cortex.mjs
COPY --from=builder /app/.mcp.json /home/cortex/app/.mcp.json
COPY --from=builder /app/package.json /home/cortex/app/package.json
COPY --from=builder /app/CORTEX.md /home/cortex/app/CORTEX.md
COPY --from=builder /app/src /home/cortex/app/src
COPY --from=builder /app/node_modules /home/cortex/app/node_modules

RUN chmod +x /home/cortex/app/cortex.mjs /home/cortex/app/bin/* 2>/dev/null || true
RUN chown -R cortex:cortex /home/cortex

USER cortex

# Health check — verify CLI responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node /home/cortex/app/cortex.mjs --version 2>/dev/null || exit 1

# Signal handling: pass SIGTERM to the Node process
STOPSIGNAL SIGTERM

ENTRYPOINT ["node", "/home/cortex/app/cortex.mjs"]
CMD ["--help"]
