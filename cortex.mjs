#!/usr/bin/env node
/**
 * CORTEX CLI Launcher
 * Loads .env, enforces Python venv, and surfaces Octogent status
 * before handing off to the main CLI.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUIET = process.env.CORTEX_QUIET === '1';
const log = (...args) => { if (!QUIET) console.error(...args); };

// ---------------------------------------------------------------------------
// 1. Python venv — auto-create if missing so AGI always runs inside venv
// ---------------------------------------------------------------------------
const __venvDir = resolve(__dirname, '.venv');
const __venvBin = resolve(__venvDir, 'bin');
const __venvPython = resolve(__venvBin, 'python3');

if (!existsSync(__venvPython)) {
  log('⚠  venv missing — bootstrapping .venv/ (one-time, ~20s)...');
  const created = spawnSync('python3', ['-m', 'venv', __venvDir], { stdio: 'inherit' });
  if (created.status === 0) {
    spawnSync(resolve(__venvBin, 'pip'), ['install', '--quiet', '--upgrade', 'pip', 'uv'], { stdio: 'inherit' });
    const reqPath = resolve(__dirname, 'python/requirements.txt');
    if (existsSync(reqPath)) {
      spawnSync(resolve(__venvBin, 'pip'), ['install', '--quiet', '-r', reqPath], { stdio: 'inherit' });
    }
    log('✓  venv created at .venv/');
  } else {
    log('✗  venv bootstrap failed — run ./install.sh manually');
  }
}

const __uvBin = resolve(process.env.HOME || '', '.local/bin');
process.env.PATH = __venvBin + ':' + __uvBin + ':' + (process.env.PATH || '');
process.env.VIRTUAL_ENV = __venvDir;

// Block ALL browser opens by injecting a fake `open` binary first in PATH
// (disabled if CORTEX_ALLOW_OPEN=1 is set)
if (process.env.CORTEX_ALLOW_OPEN !== '1') {
  const __binDir = resolve(__dirname, '.bin');
  process.env.PATH = __binDir + ':' + (process.env.PATH || '');
}

// ---------------------------------------------------------------------------
// 2. Load .env from project root
// ---------------------------------------------------------------------------
try {
  const envPath = resolve(__dirname, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
} catch { /* no .env — fine */ }

// ---------------------------------------------------------------------------
// 3. Preflight status — venv + Octogent visibility
// ---------------------------------------------------------------------------
if (!QUIET && process.env.CORTEX_NO_PREFLIGHT !== '1') {
  const venvActive = existsSync(__venvPython);
  const octogentDist = resolve(__dirname, 'apps/octogent/dist/api/cli.js');
  const octogentBuilt = existsSync(octogentDist);

  // Check if Octogent is currently running by reading its runtime metadata
  let octogentRunning = null;
  try {
    const runtimeMeta = resolve(__dirname, '.octogent/state/runtime.json');
    if (existsSync(runtimeMeta)) {
      const meta = JSON.parse(readFileSync(runtimeMeta, 'utf-8'));
      if (meta?.apiBaseUrl && meta?.pid) {
        // Verify PID is still alive
        try { process.kill(meta.pid, 0); octogentRunning = meta.apiBaseUrl; } catch {}
      }
    }
  } catch {}

  log('┌─ CORTEX preflight ──────────────────────────────────────────');
  log(`│ venv:     ${venvActive ? '✓ active' : '✗ missing'}  (${__venvDir})`);
  log(`│ octogent: ${octogentRunning ? `✓ running @ ${octogentRunning}` : octogentBuilt ? '● built (start: ./bin/cortex-octogent)' : '✗ not built (make build)'}`);
  log(`│ logs:     ${resolve(__dirname, 'logs/')} · octogent: .octogent/`);
  log('└─────────────────────────────────────────────────────────────');
}

// ---------------------------------------------------------------------------
// 4. Now load the actual CLI
// ---------------------------------------------------------------------------
await import('./dist/cli.mjs');
