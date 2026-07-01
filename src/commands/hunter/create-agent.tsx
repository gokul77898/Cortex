import * as React from 'react'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import type { LocalJSXCommandCall } from '../../types/command.js'

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const parts = (args || '').trim().split('\n')
  if (parts.length < 3) {
    onDone(
      `Usage: /hunter create-agent
  name: Agent Name
  description: What this agent does
  emoji: 🤖
  color: blue
  vibe: expert and precise
  tools: Browser, Filesystem, Code
  ---
  Your system prompt goes here. Describe how the agent should behave,
  what expertise it has, and how it should approach problems.`,
      { display: 'system' },
    )
    return null
  }

  try {
    const headerEnd = args.indexOf('\n---')
    if (headerEnd === -1) {
      onDone('Error: Missing "---" separator between header and body', { display: 'system' })
      return null
    }

    const header = args.slice(0, headerEnd).trim()
    const body = args.slice(headerEnd + 4).trim()

    if (!body) {
      onDone('Error: Agent system prompt body cannot be empty', { display: 'system' })
      return null
    }

    const fields: Record<string, string> = {}
    for (const line of header.split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).trim()
      const val = line.slice(colonIdx + 1).trim()
      if (key && val) fields[key] = val
    }

    if (!fields.name || !fields.description) {
      onDone('Error: "name" and "description" are required fields', { display: 'system' })
      return null
    }

    const id = fields.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'custom-agent'

    const agentsDirs = [
      join(process.cwd(), '.cortex', 'agents'),
      join(process.env.HOME || '', '.cortex', 'agents'),
    ]

    let targetDir = agentsDirs[0]
    for (const d of agentsDirs) {
      if (existsSync(d)) { targetDir = d; break }
    }
    mkdirSync(targetDir, { recursive: true })

    const filePath = join(targetDir, `${id}.md`)
    if (existsSync(filePath)) {
      onDone(`Agent "${id}" already exists at ${filePath}. Delete it first or use a different name.`, { display: 'system' })
      return null
    }

    const content = `---
name: "${fields.name}"
description: "${fields.description}"
emoji: "${fields.emoji || '🤖'}"
color: "${fields.color || 'blue'}"
vibe: "${fields.vibe || 'helpful and knowledgeable'}"
tools: "${fields.tools || 'General purpose'}"
---

${body}`

    writeFileSync(filePath, content, 'utf-8')
    onDone(`✅ Custom agent "${fields.name}" created at ${filePath}\nUse /hunter to activate hunter mode, or /more agents use ${id} to select it directly.`, { display: 'system' })
  } catch (e) {
    onDone(`Error creating agent: ${e instanceof Error ? e.message : String(e)}`, { display: 'system' })
  }

  return null
}
