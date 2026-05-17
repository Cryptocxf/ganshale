import type { TimelineSeg } from './aggregations'

export type HourMinuteCell = {
  minuteIndex: number
  label: string | null
  color: string | null
}

/** 某小时 [hour:00, hour+1:00) 内是否有前台活动 */
export function hourHasTimelineActivity(hour: number, segments: TimelineSeg[]): boolean {
  const h0 = hour * 60
  const h1 = h0 + 60
  for (const seg of segments) {
    const cs = Math.max(seg.startMin, h0)
    const ce = Math.min(seg.endMin, h1)
    if (ce > cs) return true
  }
  return false
}

/** 按分钟取该小时内占比最大的应用（用于 60 格着色） */
export function minuteCellsForHour(hour: number, segments: TimelineSeg[]): HourMinuteCell[] {
  const h0 = hour * 60
  const cells: HourMinuteCell[] = []
  for (let m = 0; m < 60; m++) {
    const m0 = h0 + m
    const m1 = m0 + 1
    let best: { label: string; color: string; sec: number } | null = null
    for (const seg of segments) {
      const cs = Math.max(seg.startMin, m0)
      const ce = Math.min(seg.endMin, m1)
      if (ce <= cs) continue
      const sec = ce - cs
      if (!best || sec > best.sec) {
        best = { label: seg.label, color: seg.color, sec }
      }
    }
    cells.push({
      minuteIndex: m,
      label: best?.label ?? null,
      color: best?.color ?? null,
    })
  }
  return cells
}

/** 该小时涉及的应用图例（去重，按标签排序） */
export function legendEntriesForHour(
  hour: number,
  segments: TimelineSeg[],
): { label: string; color: string }[] {
  const h0 = hour * 60
  const h1 = h0 + 60
  const map = new Map<string, string>()
  for (const seg of segments) {
    const cs = Math.max(seg.startMin, h0)
    const ce = Math.min(seg.endMin, h1)
    if (ce > cs) map.set(seg.label, seg.color)
  }
  return [...map.entries()]
    .map(([label, color]) => ({ label, color }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}
