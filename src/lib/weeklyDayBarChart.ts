/** 周柱状图 Y 轴刻度与柱高比例（每日工作时长分布 / 日详情弹窗共用） */

export function ceilYMaxHours(maxSec: number): number {
  if (maxSec <= 0) return 2
  return Math.max(1, Math.ceil(maxSec / 3600))
}

export function buildYTickHours(yMaxHours: number): number[] {
  if (yMaxHours <= 4) {
    return Array.from({ length: yMaxHours + 1 }, (_, i) => i)
  }
  const step = yMaxHours <= 12 ? 2 : 4
  const ticks: number[] = [0]
  for (let h = step; h < yMaxHours; h += step) ticks.push(h)
  if (ticks[ticks.length - 1] !== yMaxHours) ticks.push(yMaxHours)
  return ticks
}

export function yTickBottomPct(hours: number, yMaxHours: number): string {
  return `${(hours / yMaxHours) * 100}%`
}

export function barHeightPct(barSec: number, yMaxSec: number): number {
  if (barSec <= 0 || yMaxSec <= 0) return 0
  return (barSec / yMaxSec) * 100
}
