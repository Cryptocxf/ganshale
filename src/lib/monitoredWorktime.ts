import type { AwEvent } from './awTypes'
import { totalActiveSecondsWindowLive } from './aggregations'
import type { LiveForegroundSample } from './liveForeground'
import { foregroundMatchesMonitoredPatterns } from './monitoredAppsStore'
import { shouldSkipWindowEventForStats } from './selfWindowFilter'
import { endOfLocalDay, parseIso, startOfLocalDay } from './timeutil'

/** 当日窗口事件中，命中监控列表的片段时长之和（秒，四舍五入） */
export function sumMonitoredWindowSecondsForDay(
  day: Date,
  events: AwEvent[],
  patterns: string[],
): number {
  if (!patterns.length) return 0
  const day0 = startOfLocalDay(day)
  const day1 = endOfLocalDay(day)
  const t0 = day0.getTime()
  const t1 = day1.getTime()
  let s = 0
  for (const ev of events) {
    if (shouldSkipWindowEventForStats(ev)) continue
    const app = String(ev.data.app ?? '')
    const title = String(ev.data.title ?? '')
    if (!foregroundMatchesMonitoredPatterns(app, title, patterns)) continue
    const start = parseIso(ev.timestamp)
    const end = start + ev.duration * 1000
    const clipStart = Math.max(start, t0)
    const clipEnd = Math.min(end, t1)
    if (clipEnd > clipStart) s += (clipEnd - clipStart) / 1000
  }
  return Math.round(s)
}

/**
 * 办公总时长（秒）。
 * - 采集中（extrapolate）：与「实时窗口记录」同源，累计全部前台窗口并 live 延伸到 nowMs。
 * - 历史日：同样累计全部有效前台窗口，仅停止实时外推，避免跨日后累计口径改变。
 */
export function sumMonitoredWindowSecondsForDayLive(
  day: Date,
  events: AwEvent[],
  patterns: string[],
  live: LiveForegroundSample | null,
  nowMs: number,
  extrapolate: boolean,
): number {
  // 过去和今天保持同一统计口径；监控列表仅供筛选，不应在次日追溯改变办公累计。
  void patterns
  return totalActiveSecondsWindowLive(day, events, live, nowMs, extrapolate)
}
