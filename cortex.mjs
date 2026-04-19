#!/usr/bin/env node
/**
 * CORTEX CLI Launcher
 * Loads .env, enforces Python venv, and surfaces Octogent status
 * before handing off to the main CLI.
 */
import { readFileSync, existsSync, mkdirSync, openSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync, spawn } from 'child_process';
import { homedir } from 'os';

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
// 3. Preflight — check venv, auto-launch Octogent in background, open browser
// ---------------------------------------------------------------------------
const detectRunningOctogent = () => {
  // Octogent writes runtime.json into ~/.octogent/projects/<id>/state/runtime.json
  // We scan them all and pick one whose PID is alive.
  const root = join(homedir(), '.octogent', 'projects');
  if (!existsSync(root)) return null;
  try {
    for (const entry of readdirSync(root)) {
      const metaPath = join(root, entry, 'state', 'runtime.json');
      if (!existsSync(metaPath)) continue;
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        if (meta?.apiBaseUrl && meta?.pid) {
          try { process.kill(meta.pid, 0); return meta.apiBaseUrl; } catch {}
        }
      } catch {}
    }
  } catch {}
  return null;
};

const autoLaunchOctogent = () => {
  const octogentLauncher = resolve(__dirname, 'bin/cortex-octogent');
  const octogentDist = resolve(__dirname, 'apps/octogent/dist/api/cli.js');
  if (!existsSync(octogentLauncher) || !existsSync(octogentDist)) return null;

  const logsDir = resolve(__dirname, 'logs');
  try { mkdirSync(logsDir, { recursive: true }); } catch {}
  const outLog = openSync(join(logsDir, 'octogent.out.log'), 'a');
  const errLog = openSync(join(logsDir, 'octogent.err.log'), 'a');

  // IMPORTANT: strip the browser-blocking `.bin` shim from PATH so Octogent
  // can actually call `open`/`xdg-open`. venv bin stays prepended.
  const blockedBin = resolve(__dirname, '.bin');
  const cleanPath = (process.env.PATH || '')
    .split(':')
    .filter((p) => p && p !== blockedBin)
    .join(':');

  const child = spawn('node', [octogentLauncher], {
    cwd: __dirname,
    detached: true,
    stdio: ['ignore', outLog, errLog],
    env: {
      ...process.env,
      PATH: cleanPath,
      CORTEX_ALLOW_OPEN: '1',
    },
  });
  child.unref();
  return child.pid;
};

if (!QUIET && process.env.CORTEX_NO_PREFLIGHT !== '1') {
  const venvActive = existsSync(__venvPython);
  const octogentDist = resolve(__dirname, 'apps/octogent/dist/api/cli.js');
  const octogentBuilt = existsSync(octogentDist);

  let octogentRunning = detectRunningOctogent();
  let octogentStatus;

  if (octogentRunning) {
    octogentStatus = `✓ running @ ${octogentRunning}`;
  } else if (!octogentBuilt) {
    octogentStatus = '✗ not built (run: make build)';
  } else if (process.env.CORTEX_NO_OCTOGENT === '1') {
    octogentStatus = '● built (auto-launch disabled: CORTEX_NO_OCTOGENT=1)';
  } else {
    const pid = autoLaunchOctogent();
    octogentStatus = pid
      ? `🚀 launching in background (pid ${pid}) — UI will auto-open`
      : '✗ failed to launch';
  }

  log('┌─ CORTEX preflight ──────────────────────────────────────────');
  log(`│ venv:     ${venvActive ? '✓ active' : '✗ missing'}  (${__venvDir})`);
  log(`│ octogent: ${octogentStatus}`);
  log(`│ logs:     ${resolve(__dirname, 'logs/')} (cortex + octogent.out.log)`);
  log('└─────────────────────────────────────────────────────────────');
}

// ---------------------------------------------------------------------------
// 4. Now load the actual CLI
// ---------------------------------------------------------------------------
await import('./dist/cli.mjs');
