import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type AgentHealthCheck = {
  name: string
  status: 'ok' | 'warn' | 'error' | string
  detail: string
}

export type AgentSummary = {
  highlights24h: string[]
  nextActions: string[]
  stalenessWarnings: string[]
  healthChecks: AgentHealthCheck[]
  lastLoopAt: string | null
  lastSuccessfulLoopAt: string | null
}

function normalizeStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit)
}

function normalizeHealthChecks(value: unknown): AgentHealthCheck[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const name = typeof row.name === 'string' ? row.name.trim() : ''
      const status = typeof row.status === 'string' ? row.status.trim() : 'warn'
      const detail = typeof row.detail === 'string' ? row.detail.trim() : ''
      if (!name || !detail) return null
      return { name, status, detail }
    })
    .filter((item): item is AgentHealthCheck => item !== null)
    .slice(0, 6)
}

export function emptyAgentSummary(): AgentSummary {
  return {
    highlights24h: [],
    nextActions: [],
    stalenessWarnings: [],
    healthChecks: [],
    lastLoopAt: null,
    lastSuccessfulLoopAt: null,
  }
}

export function normalizeAgentSummary(raw: unknown): AgentSummary {
  if (!raw || typeof raw !== 'object') return emptyAgentSummary()
  const summary = raw as Record<string, unknown>
  const generatedAt = typeof summary.generated_at === 'string' ? summary.generated_at : null
  const lastLoopAt = typeof summary.last_loop_at === 'string' ? summary.last_loop_at : generatedAt
  const lastSuccessfulLoopAt = typeof summary.last_successful_loop_at === 'string'
    ? summary.last_successful_loop_at
    : generatedAt

  return {
    highlights24h: normalizeStringArray(summary.highlights, 3),
    nextActions: normalizeStringArray(summary.next_actions, 4),
    stalenessWarnings: normalizeStringArray(summary.staleness_warnings, 4),
    healthChecks: normalizeHealthChecks(summary.health),
    lastLoopAt,
    lastSuccessfulLoopAt,
  }
}

export function getAgentSummaryPath(profilePath: string | null): string {
  const base = join(homedir(), '.hermes')
  return profilePath ? join(base, 'profiles', profilePath, 'agent-summary.json') : join(base, 'agent-summary.json')
}

export function readAgentSummary(profilePath: string | null): AgentSummary {
  const summaryPath = getAgentSummaryPath(profilePath)
  if (!existsSync(summaryPath)) return emptyAgentSummary()

  try {
    const raw = JSON.parse(readFileSync(summaryPath, 'utf-8')) as unknown
    return normalizeAgentSummary(raw)
  } catch {
    return emptyAgentSummary()
  }
}
