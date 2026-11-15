import type { AwEvent } from './awTypes'
import { officeElapsedForDay } from './officeElapsed'
import { shouldSkipWindowEventForStats } from './selfWindowFilter'
import { toYmdLocal } from './timeutil'

export type DayBrick = { date: string; seconds: number; grade: number; apps: [string, number][]; summary: string; firstAt?: number; lastAt?: number }
export const brickGrade = (seconds: number) => Math.min(12, Math.max(0, Math.ceil(seconds / 3600) - 1))
export const brickDuration = (seconds: number) => {
  const n = Math.max(0, Math.floor(seconds))
  return `${Math.floor(n / 3600)}小时${Math.floor(n % 3600 / 60)}分`
}
export const brickHours = (seconds: number) => seconds <= 0 ? '0小时' : seconds < 60 ? '不足1分' : seconds < 3600 ? `${Math.floor(seconds / 60)}分` : `${Math.floor(seconds / 3600)}小时${seconds % 3600 >= 60 ? `${Math.floor(seconds % 3600 / 60)}分` : ''}`
export function brickRows(count: number): number[] {
  if (count <= 0) return []
  const n = Math.max(1, Math.floor((Math.sqrt(8 * count + 1) - 1) / 2))
  const rows = Array.from({ length: n }, (_, i) => n - i)
  for (let left = count - n * (n + 1) / 2, i = 0; left > 0; left--, i++) rows[i % n]++
  return rows
}
const appAliases: Record<string, string> = { code: 'VS Code', chrome: 'Chrome', msedge: 'Edge', weixin: '微信', wechat: '微信', winword: 'Word', excel: 'Excel', powerpnt: 'PowerPoint' }
const appName = (app: unknown) => { const name = String(app || '未知应用').trim().replace(/\.exe$/i, ''); return appAliases[name.toLowerCase()] || name }
const mergeSeconds = (intervals: [number, number][]) => {
  const sorted = intervals.sort((a, b) => a[0] - b[0]); let total = 0, end = 0
  for (const [from, to] of sorted) { total += Math.max(0, to - Math.max(from, end)); end = Math.max(end, to) }
  return total / 1000
}
/** 只读展示层统计：按本地自然日裁切跨午夜记录，不改变采集/日报口径。 */
export function buildBrickDays(events: AwEvent[], start: Date, end: Date, nowMs: number, patterns: string[], summaryForDay: (day: Date) => string): DayBrick[] {
  const grouped = new Map<string, AwEvent[]>()
  for (const event of new Map(events.map(e => [e.id, e])).values()) {
    const from = Math.max(start.getTime(), Date.parse(event.timestamp))
    const to = Math.min(end.getTime(), nowMs, Date.parse(event.timestamp) + Math.max(0, Number(event.duration)) * 1000)
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue
    const day = new Date(from); day.setHours(0, 0, 0, 0)
    while (day.getTime() < to) {
      const key = toYmdLocal(day), bucket = grouped.get(key)
      if (bucket) bucket.push(event); else grouped.set(key, [event])
      day.setDate(day.getDate() + 1)
    }
  }
  const result: DayBrick[] = []
  for (const [date, records] of grouped) {
    const day = new Date(`${date}T00:00:00`), next = new Date(day); next.setDate(next.getDate() + 1)
    const seconds = officeElapsedForDay(day, records, { nowMs, extrapolateLive: false, patterns })
    if (!(seconds > 0)) continue
    const appIntervals = new Map<string, [number, number][]>()
    let firstAt = Infinity, lastAt = -Infinity
    for (const event of records) {
      const from = Math.max(day.getTime(), Date.parse(event.timestamp))
      const to = Math.min(next.getTime(), nowMs, Date.parse(event.timestamp) + Math.max(0, event.duration) * 1000)
      if (to <= from) continue
      if (event.data.kind === 'work-session' || !shouldSkipWindowEventForStats(event)) { firstAt = Math.min(firstAt, from); lastAt = Math.max(lastAt, to) }
      if (shouldSkipWindowEventForStats(event)) continue
      const name = appName(event.data.app), intervals = appIntervals.get(name) || []
      intervals.push([from, to]); appIntervals.set(name, intervals)
    }
    result.push({ date, seconds, grade: brickGrade(seconds), apps: [...appIntervals].map(([name, intervals]): [string, number] => [name, mergeSeconds(intervals)]).sort((a, b) => b[1] - a[1]), summary: summaryForDay(day).trim(), firstAt: Number.isFinite(firstAt) ? firstAt : undefined, lastAt: Number.isFinite(lastAt) ? lastAt : undefined })
  }
  return result.sort((a, b) => b.seconds - a.seconds || a.date.localeCompare(b.date))
}
export function brickClock(timestamp?: number, date?: string) {
  if (timestamp === undefined) return '—'
  const d = new Date(timestamp)
  if (date && toYmdLocal(d) > date) return '次日00:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function clockSeconds(timestamp: number | undefined, date: string) {
  if (timestamp === undefined) return undefined
  const d = new Date(timestamp)
  return toYmdLocal(d) > date ? 86400 : d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}
export function summarizeBricks(days: DayBrick[]) {
  const total = days.reduce((sum, day) => sum + day.seconds, 0), apps = new Map<string, number>()
  for (const day of days) for (const [name, sec] of day.apps) apps.set(name, (apps.get(name) || 0) + sec)
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date))
  let streak = 0, longestStreak = 0, previous = ''
  for (const day of ordered) { const yesterday = new Date(`${day.date}T00:00:00`); yesterday.setDate(yesterday.getDate() - 1); streak = toYmdLocal(yesterday) === previous ? streak + 1 : 1; longestStreak = Math.max(longestStreak, streak); previous = day.date }
  const earliest = [...ordered].filter(d => d.firstAt !== undefined).sort((a, b) => clockSeconds(a.firstAt, a.date)! - clockSeconds(b.firstAt, b.date)!)[0]
  const latest = [...ordered].filter(d => d.lastAt !== undefined).sort((a, b) => clockSeconds(b.lastAt, b.date)! - clockSeconds(a.lastAt, a.date)!)[0]
  const summaries = [...new Set(ordered.flatMap(day => day.summary ? [day.summary] : []))].slice(0, 3)
  return { total, average: days.length ? total / days.length : 0, over8: days.filter(d => d.seconds > 8 * 3600).length, over12: days.filter(d => d.seconds > 12 * 3600).length, longest: [...days].sort((a, b) => b.seconds - a.seconds || a.date.localeCompare(b.date))[0], earliest, latest, longestStreak, apps: [...apps].sort((a, b) => b[1] - a[1]), summaries }
}
