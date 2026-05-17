import type { AwEvent } from './awTypes'
import { formatDuration } from './aggregations'
import { shouldSkipWindowEventForStats } from './selfWindowFilter'
import { formatClock, toYmdLocal } from './timeutil'

export type WorkRecordSource = 'draft' | 'manual' | 'system'

export type WorkRecordRow = {
  id: string
  content: string
  source: WorkRecordSource
  /** 手动记录在点击保存后为 true */
  saved: boolean
  /** 记录落库/保存时间（ISO） */
  recordedAt?: string
}

const STORAGE_PREFIX = 'ganshale-work-records:'
const DISMISSED_SYSTEM_PREFIX = 'ganshale-work-records-dismissed-system:'

function storageKey(day: Date): string {
  return `${STORAGE_PREFIX}${toYmdLocal(day)}`
}

export function createEmptyWorkRecordRow(): WorkRecordRow {
  return {
    id: crypto.randomUUID(),
    content: '',
    source: 'draft',
    saved: false,
  }
}

function parseSource(v: unknown, hasContent: boolean): WorkRecordSource {
  if (v === 'system' || v === 'manual' || v === 'draft') return v
  return hasContent ? 'manual' : 'draft'
}

export function loadWorkRecords(day: Date): WorkRecordRow[] {
  try {
    const raw = localStorage.getItem(storageKey(day))
    if (!raw) return [createEmptyWorkRecordRow()]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return [createEmptyWorkRecordRow()]
    const out: WorkRecordRow[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const id = typeof r.id === 'string' ? r.id : crypto.randomUUID()
      const content = typeof r.content === 'string' ? r.content : ''
      const source = parseSource(r.source, Boolean(content.trim()))
      const saved =
        r.saved === true || (source === 'manual' && content.trim().length > 0)
      const recordedAt =
        typeof r.recordedAt === 'string' && !Number.isNaN(Date.parse(r.recordedAt))
          ? r.recordedAt
          : undefined
      out.push({ id, content, source, saved, ...(recordedAt ? { recordedAt } : {}) })
    }
    return out.length > 0 ? out : [createEmptyWorkRecordRow()]
  } catch {
    return [createEmptyWorkRecordRow()]
  }
}

export function saveWorkRecords(day: Date, rows: WorkRecordRow[]): void {
  try {
    localStorage.setItem(storageKey(day), JSON.stringify(rows))
  } catch {
    /* quota */
  }
}

function dismissedSystemKey(day: Date): string {
  return `${DISMISSED_SYSTEM_PREFIX}${toYmdLocal(day)}`
}

/** 用户已删除、不再自动恢复的系统记录 id（如 system-cursor） */
export function loadDismissedSystemRecordIds(day: Date): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedSystemKey(day))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))
  } catch {
    return new Set()
  }
}

export function saveDismissedSystemRecordIds(day: Date, ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(dismissedSystemKey(day), JSON.stringify([...ids]))
  } catch {
    /* quota */
  }
}

export function dismissSystemRecordId(day: Date, id: string): Set<string> {
  const next = new Set(loadDismissedSystemRecordIds(day))
  next.add(id)
  saveDismissedSystemRecordIds(day, next)
  return next
}

/** 根据当日窗口事件生成系统总结行（按应用累计时长） */
export function buildSystemWorkRecords(events: AwEvent[]): WorkRecordRow[] {
  const map = new Map<string, number>()
  for (const ev of events) {
    if (shouldSkipWindowEventForStats(ev)) continue
    const app = String(ev.data.app ?? 'unknown')
      .replace(/\.exe$/i, '')
      .trim() || 'unknown'
    map.set(app, (map.get(app) ?? 0) + Math.max(0, ev.duration))
  }
  return [...map.entries()]
    .filter(([, sec]) => sec >= 60)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([app, sec]) => ({
      id: `system-${app.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      content: `${app} · ${formatDuration(sec)}`,
      source: 'system' as const,
      saved: true,
    }))
}

/** 列表展示：按记录时间从晚到早（含新增草稿的 recordedAt） */
export function sortWorkRecordsByTimeDesc(rows: WorkRecordRow[]): WorkRecordRow[] {
  const timeMs = (r: WorkRecordRow) => {
    if (!r.recordedAt) return 0
    const t = Date.parse(r.recordedAt)
    return Number.isNaN(t) ? 0 : t
  }
  return [...rows].sort((a, b) => timeMs(b) - timeMs(a))
}

export function formatWorkRecordTime(recordedAt?: string): string {
  if (!recordedAt) return '—'
  const d = new Date(recordedAt)
  if (Number.isNaN(d.getTime())) return '—'
  return formatClock(d)
}

/** 保留手动/草稿行，用最新窗口数据刷新系统行 */
export function reconcileWorkRecordsWithSystem(
  events: AwEvent[],
  current: WorkRecordRow[],
  dismissedSystemIds: ReadonlySet<string> = new Set(),
): WorkRecordRow[] {
  const prevSystem = new Map(
    current.filter((r) => r.source === 'system').map((r) => [r.id, r] as const),
  )
  const nowIso = new Date().toISOString()
  const systemRows = buildSystemWorkRecords(events)
    .filter((r) => !dismissedSystemIds.has(r.id))
    .map((r) => {
      const prev = prevSystem.get(r.id)
      return {
        ...r,
        recordedAt: prev?.recordedAt ?? nowIso,
      }
    })
  const nonSystem = current.filter((r) => r.source !== 'system')
  const hasEditable = nonSystem.some((r) => r.source === 'draft' || r.source === 'manual')
  const tail = hasEditable ? nonSystem : [...nonSystem, createEmptyWorkRecordRow()]
  return sortWorkRecordsByTimeDesc([...systemRows, ...tail])
}

/** 追加一条 AI 自动总结行（保留历史 system 行） */
export function appendAiSummaryWorkRecord(
  current: WorkRecordRow[],
  summary: string,
): WorkRecordRow[] {
  const text = summary.trim()
  if (!text) return current

  const row: WorkRecordRow = {
    id: `system-ai-${crypto.randomUUID()}`,
    content: text,
    source: 'system',
    saved: true,
    recordedAt: new Date().toISOString(),
  }

  const systemRows = current.filter((r) => r.source === 'system')
  const nonSystem = current.filter((r) => r.source !== 'system')
  const hasEditable = nonSystem.some((r) => r.source === 'draft' || r.source === 'manual')
  const tail = hasEditable ? nonSystem : [...nonSystem, createEmptyWorkRecordRow()]
  return sortWorkRecordsByTimeDesc([row, ...systemRows, ...tail])
}

export function buildWorkRecordBlock(rows: WorkRecordRow[]): string {
  const filled = rows.filter((r) => r.content.trim())
  if (filled.length === 0) return '（无工作记录）'
  return filled
    .map((r, i) => {
      const tag = r.source === 'system' ? 'AI总结' : r.source === 'manual' ? '手动' : '草稿'
      const t = formatWorkRecordTime(r.recordedAt)
      return `${i + 1}. [${tag}] ${r.content.trim()}${t !== '—' ? `（${t}）` : ''}`
    })
    .join('\n')
}
