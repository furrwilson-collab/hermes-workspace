import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type AgentMetadata = {
  displayName: string
  role: string
  identity: string | null
  primaryGoal: string | null
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function firstHeadingName(lines: Array<string>, fallbackName: string): string {
  const first = lines.find(Boolean)
  if (!first) return titleCase(fallbackName)

  const cleaned = first
    .replace(/^#+\s*/, '')
    .replace(/\s+[—-]\s+SOUL(?:\.md)?$/i, '')
    .replace(/\s+[—-]\s+Soul\b.*$/i, '')
    .replace(/\s+—\s+SOUL$/i, '')
    .trim()

  if (!cleaned || /^founding charter\b/i.test(cleaned) || /^core identity\b/i.test(cleaned)) {
    return fallbackName === 'default' ? 'Reddington' : titleCase(fallbackName)
  }

  return cleaned
}

function isLikelySectionBoundary(line: string): boolean {
  return /^#+\s+/.test(line) || /^(Who I serve|The mission|Topology I manage|What I value|What I do|How I talk|Boundaries|Primary goal)$/i.test(line)
}

function extractIdentity(lines: Array<string>): string | null {
  const directIdx = lines.findIndex((line) => /^I am\s+/i.test(line))
  if (directIdx >= 0) {
    const paragraph: Array<string> = []
    for (const line of lines.slice(directIdx)) {
      if (paragraph.length > 0 && isLikelySectionBoundary(line)) break
      paragraph.push(line)
      if (/[.!?]$/.test(line)) break
    }
    return normalizeLine(paragraph.join(' '))
  }

  const idx = lines.findIndex((line) => /^Who I am$/i.test(line))
  if (idx >= 0) {
    const next = lines.slice(idx + 1).find(Boolean)
    if (next) return normalizeLine(next)
  }

  return null
}

function roleFromIdentity(identity: string | null, fallbackRole: string): string {
  if (!identity) return fallbackRole

  const dashMatch = identity.match(/I am\s+[^—-]+\s+[—-]\s*([^.]*)\.?/i)
  if (dashMatch?.[1]?.trim()) return dashMatch[1].trim()

  const commaMatch = identity.match(/I am\s+[^,]+,\s*([^.]*)\.?/i)
  if (commaMatch?.[1]?.trim()) return commaMatch[1].trim()

  return fallbackRole
}

function extractPrimaryGoal(lines: Array<string>): string | null {
  const idx = lines.findIndex((line) => /^Primary goal$/i.test(line))
  if (idx < 0) return null
  const next = lines.slice(idx + 1).find(Boolean)
  return next ? normalizeLine(next) : null
}

export function parseAgentSoul(raw: string, fallbackName: string, fallbackRole = 'Profile'): AgentMetadata {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const displayName = firstHeadingName(lines, fallbackName)
  const identity = extractIdentity(lines)
  const role = roleFromIdentity(identity, fallbackRole)
  const primaryGoal = extractPrimaryGoal(lines)

  return { displayName, role, identity, primaryGoal }
}

export function readAgentMetadata(hermesHome: string, fallbackName: string, fallbackRole = 'Profile'): AgentMetadata {
  const soulPath = join(hermesHome, 'SOUL.md')
  if (!existsSync(soulPath)) {
    return {
      displayName: fallbackName === 'default' ? 'Reddington' : titleCase(fallbackName),
      role: fallbackRole,
      identity: null,
      primaryGoal: null,
    }
  }

  try {
    return parseAgentSoul(readFileSync(soulPath, 'utf-8'), fallbackName, fallbackRole)
  } catch {
    return {
      displayName: fallbackName === 'default' ? 'Reddington' : titleCase(fallbackName),
      role: fallbackRole,
      identity: null,
      primaryGoal: null,
    }
  }
}
