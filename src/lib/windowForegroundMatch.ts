import type { AwEvent } from './awTypes'
import type { LiveForegroundSample } from './liveForeground'
import { endOfLocalDay, parseIso, startOfLocalDay } from './timeutil'

/** 进程名比较（忽略 .exe 与大小写） */
export function normalizeWindowAppKey(app: string): string {
  return String(app ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.exe$/i, '')
}

/** 实时前台与事件是否同一应用（标题可变，如 Cursor 换文件） */
export function sameForegroundApp(
  evData: Record<string, unknown>,
  live: LiveForegroundSample,
): boolean {
  return normalizeWindowAppKey(String(evData.app ?? '')) === normalizeWindowAppKey(live.app)
}

export function findLatestWindowEvent(events: AwEvent[]): AwEvent | undefined {
  return [...events].sort((a, b) => parseIso(b.timestamp) - parseIso(a.timestamp))[0]
}

export function findLatestWindowEventForApp(
  events: AwEvent[],
  live: LiveForegroundSample,
): AwEvent | undefined {
  const key = normalizeWindowAppKey(live.app)
  return [...events]
    .filter((e) => normalizeWindowAppKey(String(e.data.app ?? '')) === key)
    .sort((a, b) => parseIso(b.timestamp) - parseIso(a.timestamp))[0]
}

/** 将某条窗口事件在当日内的结束时间延伸到 nowMs，并替换其在 base 中的贡献 */
export function extrapolateWindowEventToNow(
  day: Date,
  baseSec: number,
  ev: AwEvent,
  nowMs: number,
  live?: LiveForegroundSample | null,
): number {
  const day0 = startOfLocalDay(day).getTime()
  const day1 = endOfLocalDay(day).getTime()
  const start = parseIso(ev.timestamp)
  const dbEnd = start + ev.duration * 1000
  const clipStart = Math.max(start, day0)
  const oldClipEnd = Math.min(dbEnd, day1)
  const oldContrib = oldClipEnd > clipStart ? (oldClipEnd - clipStart) / 1000 : 0

  if (live?.segmentStartedAt && sameForegroundApp(ev.data, live)) {
    const segStartMs = Math.max(parseIso(live.segmentStartedAt), clipStart)
    const dbContrib = oldContrib
    const tailStart = Math.max(dbEnd, segStartMs)
    const tailEnd = Math.min(nowMs, day1)
    const tail = tailEnd > tailStart ? (tailEnd - tailStart) / 1000 : 0
    return Math.round(baseSec - oldContrib + dbContrib + tail)
  }

  const liveEnd = Math.min(Math.max(dbEnd, nowMs), day1)
  const newContrib = liveEnd > clipStart ? (liveEnd - clipStart) / 1000 : 0

  return Math.round(baseSec - oldContrib + newContrib)
}

/** 自当前前台片段起点至 nowMs 的秒数（当日裁剪） */
export function liveForegroundSegmentSec(day: Date, live: LiveForegroundSample, nowMs: number): number {
  const start = live.segmentStartedAt
    ? parseIso(live.segmentStartedAt)
    : live.capturedAt
      ? parseIso(live.capturedAt)
      : nowMs
  const day0 = startOfLocalDay(day).getTime()
  const day1 = endOfLocalDay(day).getTime()
  const clipStart = Math.max(start, day0)
  const clipEnd = Math.min(nowMs, day1)
  return clipEnd > clipStart ? Math.round((clipEnd - clipStart) / 1000) : 0
}
