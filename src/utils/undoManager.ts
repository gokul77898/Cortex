import fs from 'fs'
import path from 'path'
import os from 'os'

const UNDO_DIR = path.join(os.homedir(), '.cortex', 'undo')
const MAX_SNAPSHOTS = 50

function ensureDir(): void {
  if (!fs.existsSync(UNDO_DIR)) fs.mkdirSync(UNDO_DIR, { recursive: true })
}

function snapshotPath(filePath: string, ts: number): string {
  const safe = filePath.replace(/\//g, '__').replace(/\\/g, '__')
  return path.join(UNDO_DIR, `${ts}__${safe}`)
}

function infoPath(filePath: string): string {
  const safe = filePath.replace(/\//g, '__').replace(/\\/g, '__')
  return path.join(UNDO_DIR, `${safe}.json`)
}

export function saveSnapshot(filePath: string, content: string): void {
  ensureDir()
  const ts = Date.now()
  fs.writeFileSync(snapshotPath(filePath, ts), content, 'utf8')

  const info = getFileSnapshots(filePath)
  info.push({ ts, file: filePath })
  if (info.length > MAX_SNAPSHOTS) info.splice(0, info.length - MAX_SNAPSHOTS)
  fs.writeFileSync(infoPath(filePath), JSON.stringify(info), 'utf8')
}

export function getFileSnapshots(filePath: string): Array<{ ts: number; file: string }> {
  try {
    return JSON.parse(fs.readFileSync(infoPath(filePath), 'utf8'))
  } catch {
    return []
  }
}

export function getLastSnapshot(filePath: string): { ts: number; content: string } | null {
  const snaps = getFileSnapshots(filePath)
  if (snaps.length === 0) return null
  const last = snaps[snaps.length - 1]
  const sp = snapshotPath(last.file, last.ts)
  if (!fs.existsSync(sp)) return null
  return { ts: last.ts, content: fs.readFileSync(sp, 'utf8') }
}

export function undo(filePath: string): string | null {
  const snaps = getFileSnapshots(filePath)
  if (snaps.length === 0) return null
  const last = snaps.pop()!
  const sp = snapshotPath(last.file, last.ts)
  if (!fs.existsSync(sp)) return null
  const content = fs.readFileSync(sp, 'utf8')
  fs.writeFileSync(infoPath(filePath), JSON.stringify(snaps), 'utf8')
  fs.unlinkSync(sp)
  return content
}

export function clearSnapshots(filePath: string): void {
  const snaps = getFileSnapshots(filePath)
  for (const s of snaps) {
    try { fs.unlinkSync(snapshotPath(s.file, s.ts)) } catch {}
  }
  try { fs.unlinkSync(infoPath(filePath)) } catch {}
}
