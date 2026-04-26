import { describe, expect, it } from 'vitest'
import { parseAgentSoul } from './agent-metadata'

describe('agent-metadata', () => {
  it('extracts display name, role, identity, and primary goal from a standard SOUL', () => {
    const result = parseAgentSoul(
      `Scribe — SOUL
Founding charter.

Who I am
I am Scribe — Wilson's knowledge compounder. I turn scattered notes into durable structure.

Primary goal
Make Wilson's second brain more retrievable every day.
`,
      'scribe',
    )

    expect(result).toEqual({
      displayName: 'Scribe',
      role: "Wilson's knowledge compounder",
      identity: "I am Scribe — Wilson's knowledge compounder. I turn scattered notes into durable structure.",
      primaryGoal: "Make Wilson's second brain more retrievable every day.",
    })
  })

  it('falls back cleanly for heading-only profile charters', () => {
    const result = parseAgentSoul('# pfbox-mini-searcher\n\nMission lane text', 'pfbox-mini-searcher')

    expect(result.displayName).toBe('pfbox-mini-searcher')
    expect(result.role).toBe('Profile')
    expect(result.identity).toBeNull()
    expect(result.primaryGoal).toBeNull()
  })

  it('names the default SOUL as Reddington when the first line is generic', () => {
    const result = parseAgentSoul('Core identity. Human edited only.\n\nWho I am\nI am Reddington — Wilson\'s top-level operational intelligence.', 'default', 'Primary profile')

    expect(result.displayName).toBe('Reddington')
    expect(result.role).toBe("Wilson's top-level operational intelligence")
  })

  it('does not confuse hyphenated words with identity em dashes', () => {
    const result = parseAgentSoul(
      `# Hermes — Soul (overnight Codex-swarm profile, v2)

I am Hermes, the captain of Wilson Furr's Past & Future Box treasure-hunt
swarm. My identity in this profile is swarm coordinator, not a serial executor.
`,
      'pfbox-codex-overnight',
    )

    expect(result.role).toBe("the captain of Wilson Furr's Past & Future Box treasure-hunt swarm")
    expect(result.identity).toContain('treasure-hunt swarm')
  })
})
