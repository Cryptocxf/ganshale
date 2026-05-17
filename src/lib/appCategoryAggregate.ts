import type { AwEvent } from './awTypes'
import type { AppCategoryDef } from './appCategoryConfig'
import { UNCATEGORIZED_ID } from './appCategoryConfig'
import { shouldSkipWindowEventForStats } from './selfWindowFilter'
import { endOfLocalDay, parseIso, startOfLocalDay } from './timeutil'

export type CategoryBucket = {
  seconds: number
  /** 可执行文件名（含 .exe）聚合 */
  apps: Record<string, number>
}

function clippedSecondsOnDay(day: Date, ev: AwEvent): number {
  if (shouldSkipWindowEventForStats(ev)) return 0
  const day0 = startOfLocalDay(day)
  const day1 = endOfLocalDay(day)
  const t0 = day0.getTime()
  const t1 = day1.getTime()
  const start = parseIso(ev.timestamp)
  const end = start + ev.duration * 1000
  const clipStart = Math.max(start, t0)
  const clipEnd = Math.min(end, t1)
  if (clipEnd <= clipStart) return 0
  return (clipEnd - clipStart) / 1000
}

function haystack(ev: AwEvent): string {
  const app = String(ev.data.app ?? '').toLowerCase()
  const title = String(ev.data.title ?? '').toLowerCase()
  return `${app} ${title}`
}

function firstMatchingCategoryId(
  hay: string,
  categories: AppCategoryDef[],
): string | null {
  for (const cat of categories) {
    for (const kw of cat.keywords) {
      const k = kw.trim().toLowerCase()
      if (k && hay.includes(k)) return cat.id
    }
  }
  return null
}

/**
 * 按分类累加当日裁剪后的窗口时长；未命中任何关键词的计入 {@link UNCATEGORIZED_ID}。
 */
export function aggregateByAppCategories(
  day: Date,
  events: AwEvent[],
  categories: AppCategoryDef[],
): { totalSeconds: number; buckets: Record<string, CategoryBucket> } {
  const buckets: Record<string, CategoryBucket> = {}
  for (const c of categories) {
    buckets[c.id] = { seconds: 0, apps: {} }
  }
  buckets[UNCATEGORIZED_ID] = { seconds: 0, apps: {} }

  for (const ev of events) {
    const sec = clippedSecondsOnDay(day, ev)
    if (sec <= 0) continue
    const hay = haystack(ev)
    const catId =
      categories.length > 0 ? firstMatchingCategoryId(hay, categories) : null
    const target = catId ?? UNCATEGORIZED_ID
    const appKey = String(ev.data.app ?? 'unknown')
    const b = buckets[target]
    if (!b) continue
    b.seconds += sec
    b.apps[appKey] = (b.apps[appKey] ?? 0) + sec
  }

  let totalSeconds = 0
  for (const b of Object.values(buckets)) {
    totalSeconds += b.seconds
  }
  return { totalSeconds, buckets }
}
