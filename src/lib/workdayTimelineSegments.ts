import type {TimelineSeg} from './aggregations'
const DAY_END_MIN=24*60
export type WorkdayTimelineSeg = {
  id: string
  label: string
  color: string
  start: number
  end: number
}

function clipTimelineSegToDay(seg: TimelineSeg): { start: number; end: number } | null {
  const cs = Math.max(seg.startMin, 0)
  const ce = Math.min(seg.endMin, DAY_END_MIN)
  if (ce <= cs) return null
  return { start: cs, end: ce }
}

export function workdayTimelineFromSegments(segments: TimelineSeg[]): WorkdayTimelineSeg[] {
  const clipped: WorkdayTimelineSeg[] = []
  for (const seg of segments) {
    const c = clipTimelineSegToDay(seg)
    if (!c) continue
    clipped.push({
      id: seg.id,
      label: seg.label,
      color: seg.color,
      start: c.start,
      end: c.end,
    })
  }
  return clipped
}
