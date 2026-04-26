'use client'

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CheckListIcon,
  Clock01Icon,
  RefreshIcon,
  Wifi01Icon,
  WifiOffIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import {
  useCrewStatus,
  getOnlineStatus,
  type CrewMember,
  type CrewOnlineStatus,
} from '@/hooks/use-crew-status'

// ── Helpers ─────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatCost(n: number | null): string {
  if (n === null) return '—'
  return `$${n.toFixed(2)}`
}

function formatRelativeTime(unixSeconds: number | null): string {
  if (!unixSeconds) return 'Never'
  const diffMs = Date.now() - unixSeconds * 1000
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function formatUpdatedAgo(fetchedAt: number | null): string {
  if (!fetchedAt) return ''
  const diffSec = Math.floor((Date.now() - fetchedAt) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  return `${Math.floor(diffSec / 60)}m ago`
}

function statusTone(status: string): string {
  if (status === 'ok') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  if (status === 'error') return 'border-red-500/20 bg-red-500/10 text-red-300'
  return 'border-amber-500/20 bg-amber-500/10 text-amber-200'
}

function BulletList({
  title,
  items,
  emptyLabel,
}: {
  title: string
  items: string[]
  emptyLabel: string
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-muted)]">
        {title}
      </div>
      {items.length ? (
        <ul className="space-y-1.5 text-[11px] text-[var(--theme-text)]">
          {items.map((item) => (
            <li key={item} className="flex gap-2 leading-5">
              <span className="mt-[7px] size-1 rounded-full bg-[#B87333]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] italic text-[var(--theme-muted)]">{emptyLabel}</p>
      )}
    </div>
  )
}

function HealthSection({ member }: { member: CrewMember }) {
  const visibleChecks = member.healthChecks.slice(0, 3)
  const visibleWarnings = member.stalenessWarnings.slice(0, 2)

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-muted)]">
        Health
      </div>
      {visibleChecks.length ? (
        <div className="flex flex-wrap gap-1.5">
          {visibleChecks.map((check) => (
            <span
              key={`${check.name}-${check.detail}`}
              className={cn(
                'rounded-full border px-2 py-1 text-[10px] font-medium',
                statusTone(check.status),
              )}
              title={check.detail}
            >
              {check.name}: {check.detail}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] italic text-[var(--theme-muted)]">No health artifact yet.</p>
      )}
      {visibleWarnings.length ? (
        <div className="space-y-1">
          {visibleWarnings.map((warning) => (
            <div
              key={warning}
              className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100"
            >
              {warning}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── Status dot ──────────────────────────────────────────────────────

function StatusDot({ status }: { status: CrewOnlineStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'inline-block size-2 rounded-full',
          status === 'online'  && 'bg-green-500',
          status === 'offline' && 'bg-red-500',
          status === 'unknown' && 'bg-gray-500',
        )}
      />
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-widest',
          status === 'online'  && 'text-green-400',
          status === 'offline' && 'text-red-400',
          status === 'unknown' && 'text-gray-500',
        )}
      >
        {status}
      </span>
    </div>
  )
}

// ── Skeleton card ───────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] overflow-hidden animate-pulse">
      <div className="border-l-[3px] border-l-[#B87333] p-4 h-full">
        <div className="flex justify-between mb-3">
          <div className="h-2.5 bg-[var(--theme-hover)] rounded w-16" />
          <div className="h-4 bg-[var(--theme-hover)] rounded w-20" />
        </div>
        <div className="h-7 bg-[var(--theme-hover)] rounded w-28 mb-1" />
        <div className="h-3 bg-[var(--theme-hover)] rounded w-36 mb-4" />
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[0,1,2].map(i => (
            <div key={i} className="rounded border border-[var(--theme-border)] bg-[var(--theme-hover)] h-14" />
          ))}
        </div>
        <div className="flex justify-between">
          <div className="h-3 bg-[var(--theme-hover)] rounded w-20" />
          <div className="h-3 bg-[var(--theme-hover)] rounded w-20" />
        </div>
      </div>
    </div>
  )
}

// ── Agent card ──────────────────────────────────────────────────────

function AgentCard({ member }: { member: CrewMember }) {
  const navigate = useNavigate()
  const status = getOnlineStatus(member)
  const telegramPlatform = member.platforms.telegram

  const borderColor =
    status === 'online'  ? '#B87333' :
    status === 'offline' ? '#ef4444' :
    '#6b7280'

  const handleViewTasks = () => {
    void navigate({ to: '/tasks', search: { assignee: member.id } })
  }

  const handleViewJobs = () => {
    void navigate({ to: '/jobs', search: { agent: member.id } })
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] overflow-hidden',
        'transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)]',
        status === 'offline' && 'opacity-70',
      )}
    >
      <div
        className="border-l-[3px] p-4 h-full flex flex-col gap-3"
        style={{ borderLeftColor: borderColor }}
      >
        {/* Top row: status dot + role */}
        <div className="flex items-start justify-between gap-2">
          <StatusDot status={status} />
          <span className="text-[9px] font-medium text-[var(--theme-muted)] uppercase tracking-wider text-right bg-[var(--theme-hover)] border border-[var(--theme-border)] px-1.5 py-0.5 rounded-sm">
            {member.role}
          </span>
        </div>
        {/* Agent name + model */}
        <div>
          <h3 className="text-xl font-bold tracking-tight" style={{ color: '#f59e0b' }}>
            {member.displayName || member.id}
          </h3>
          <p className="text-xs text-[var(--theme-muted)] mt-0.5">
            {member.model} · {member.provider}
          </p>
          {member.primaryGoal && (
            <p className="mt-2 text-[11px] leading-5 text-[var(--theme-text)]/85">
              {member.primaryGoal}
            </p>
          )}
          {telegramPlatform && (
            <div className="flex items-center gap-1 mt-1">
              <HugeiconsIcon
                icon={telegramPlatform.state === 'connected' ? Wifi01Icon : WifiOffIcon}
                size={10}
                className={cn(
                  telegramPlatform.state === 'connected' ? 'text-green-400' : 'text-gray-500',
                )}
              />
              <span className="text-[10px] text-[var(--theme-muted)]">
                Telegram: {telegramPlatform.state}
              </span>
            </div>
          )}
        </div>

        {/* Last active */}
        <div>
          <p className="text-[11px] text-[var(--theme-muted)]">
            Last active: <span className="text-[var(--theme-text)]">{formatRelativeTime(member.lastSessionAt)}</span>
          </p>
          {member.lastSessionTitle && (
            <p className="text-[11px] text-[var(--theme-muted)] italic truncate mt-0.5">
              "{member.lastSessionTitle}"
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sessions', value: formatNumber(member.sessionCount) },
            { label: 'Messages', value: formatNumber(member.messageCount) },
            { label: 'Tools',    value: formatNumber(member.toolCallCount) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded border border-[var(--theme-border)] bg-[var(--theme-hover)] px-2 py-2 text-center"
            >
              <div className="text-sm font-bold" style={{ color: '#f59e0b' }}>{value}</div>
              <div className="text-[9px] text-[var(--theme-muted)] uppercase tracking-widest mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tokens + cost */}
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--theme-muted)]">
            Tokens: <span className="text-[var(--theme-text)]">{formatTokens(member.totalTokens)}</span>
          </span>
          <span className="text-[var(--theme-muted)]">
            Est. cost: <span className="text-[var(--theme-text)]">{formatCost(member.estimatedCostUsd)}</span>
          </span>
        </div>

        {/* Cron + tasks */}
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--theme-muted)]">
            Crons: <span className="text-[var(--theme-text)]">{member.cronJobCount}</span>
          </span>
          <span className="text-[var(--theme-muted)]">
            Tasks: <span className="text-[var(--theme-text)]">{member.assignedTaskCount} assigned</span>
          </span>
        </div>

        {/* Summary layer */}
        <div className="grid gap-3">
          <BulletList
            title="24h highlights"
            items={member.highlights24h.slice(0, 3)}
            emptyLabel="No 24h highlights recorded yet."
          />
          <BulletList
            title="Next 4"
            items={member.nextActions.slice(0, 4)}
            emptyLabel="No queued improvement actions yet."
          />
          <HealthSection member={member} />
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--theme-border)]" />

        {/* Footer actions */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleViewTasks}
            className="flex items-center gap-1 text-[11px] text-[var(--theme-muted)] hover:text-[#B87333] hover:bg-[var(--theme-hover)] px-2 py-1 rounded transition-colors -ml-2"
          >
            <HugeiconsIcon icon={CheckListIcon} size={12} />
            Tasks
          </button>
          <button
            type="button"
            onClick={handleViewJobs}
            className="flex items-center gap-1 text-[11px] text-[var(--theme-muted)] hover:text-[#B87333] hover:bg-[var(--theme-hover)] px-2 py-1 rounded transition-colors -mr-2"
          >
            <HugeiconsIcon icon={Clock01Icon} size={12} />
            Cron Jobs
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ticker for "Updated X ago" ───────────────────────────────────────

function useUpdatedAgo(fetchedAt: number | null): string {
  const [label, setLabel] = useState(formatUpdatedAgo(fetchedAt))

  useEffect(() => {
    setLabel(formatUpdatedAgo(fetchedAt))
    const interval = setInterval(() => {
      setLabel(formatUpdatedAgo(fetchedAt))
    }, 5_000)
    return () => clearInterval(interval)
  }, [fetchedAt])

  return label
}

// ── Main screen ─────────────────────────────────────────────────────

export function CrewScreen() {
  const { crew, lastUpdated, isLoading, isError, refetch } = useCrewStatus()
  const updatedAgo = useUpdatedAgo(lastUpdated)

  const displayCrew = [...crew].sort((a, b) => {
    const rank = (member: CrewMember) => {
      const status = getOnlineStatus(member)
      if (status === 'online') return 0
      if (status === 'offline') return 1
      return 2
    }
    const rankDiff = rank(a) - rank(b)
    if (rankDiff !== 0) return rankDiff
    return (a.displayName || a.id).localeCompare(b.displayName || b.id)
  })

  const onlineCount = displayCrew.filter(m => getOnlineStatus(m) === 'online').length
  const assignedTaskCount = displayCrew.reduce((sum, member) => sum + member.assignedTaskCount, 0)
  const runningCronCount = displayCrew.reduce((sum, member) => sum + member.cronJobCount, 0)

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-4 md:p-6">
      {/* ── Header ── */}
      <div className="space-y-4">
        <div className="h-px" style={{ background: 'linear-gradient(to right, #B87333, transparent)' }} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-3xl space-y-2">
            <div>
              <h1
                className="text-2xl font-bold tracking-[0.18em] uppercase"
                style={{ color: '#f59e0b' }}
              >
                Crew Status
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--theme-muted)]">
                Live agent health across profiles, recent session activity, assigned tasks, and cron coverage.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em]">
              <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-1 text-[var(--theme-muted)]">
                <span className="text-[var(--theme-text)]">{displayCrew.length}</span> crew
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                {onlineCount} online
              </span>
              <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-1 text-[var(--theme-muted)]">
                {assignedTaskCount} assigned tasks
              </span>
              <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-1 text-[var(--theme-muted)]">
                {runningCronCount} cron jobs
              </span>
              {updatedAgo ? (
                <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-1 text-[var(--theme-muted)]">
                  Updated {updatedAgo}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-xs font-medium text-[var(--theme-muted)] shadow-sm transition-all',
              'hover:border-[#B87333]/40 hover:text-[#f59e0b] hover:shadow-[0_0_0_1px_rgba(184,115,51,0.12)]',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              size={13}
              className={isLoading ? 'animate-spin' : ''}
            />
            Refresh manifest
          </button>
        </div>
        <div className="h-px" style={{ background: 'linear-gradient(to right, #B87333, transparent)' }} />
      </div>

      {/* ── Error state ── */}
      {isError && !isLoading && (
        <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-4 text-sm text-red-400">
          Failed to load crew status.{' '}
          <button
            type="button"
            onClick={handleRefresh}
            className="underline hover:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Card grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} />)
          : displayCrew.map(member => <AgentCard key={member.id} member={member} />)
        }
      </div>
    </div>
  )
}
