import { describe, expect, it } from 'vitest'
import { emptyAgentSummary, normalizeAgentSummary } from './agent-summaries'

describe('agent-summaries', () => {
  it('returns empty summary for invalid payloads', () => {
    expect(normalizeAgentSummary(null)).toEqual(emptyAgentSummary())
  })

  it('normalizes arrays and limits visible items', () => {
    const result = normalizeAgentSummary({
      generated_at: '2026-04-25T12:00:00-05:00',
      highlights: [' one ', '', 'two', 'three', 'four'],
      next_actions: ['a', 'b', 'c', 'd', 'e'],
      staleness_warnings: ['warn-1', 'warn-2', 'warn-3', 'warn-4', 'warn-5'],
      health: [
        { name: 'cron', status: 'ok', detail: '2 jobs active' },
        { name: '', status: 'warn', detail: 'ignored' },
      ],
    })

    expect(result).toEqual({
      highlights24h: ['one', 'two', 'three'],
      nextActions: ['a', 'b', 'c', 'd'],
      stalenessWarnings: ['warn-1', 'warn-2', 'warn-3', 'warn-4'],
      healthChecks: [{ name: 'cron', status: 'ok', detail: '2 jobs active' }],
      lastLoopAt: '2026-04-25T12:00:00-05:00',
      lastSuccessfulLoopAt: '2026-04-25T12:00:00-05:00',
    })
  })
})
