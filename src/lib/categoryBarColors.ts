import { UNCATEGORIZED_ID } from './appCategoryConfig'

/** 分类占比 / 堆叠柱 / 饼图共用：高饱和、色相间隔大的配色 */
export const CHART_CATEGORY_COLORS = [
  '#e11d48', // 玫红
  '#2563eb', // 蓝
  '#16a34a', // 绿
  '#ea580c', // 橙
  '#9333ea', // 紫
  '#0d9488', // 青
  '#ca8a04', // 琥珀
  '#db2777', // 粉
  '#4338ca', // 靛
] as const

/** @deprecated 使用 CHART_CATEGORY_COLORS */
const BAR_COLORS = [...CHART_CATEGORY_COLORS]

/** 内置分类固定色（按 id，避免「文档」与「其他」等撞色） */
const KNOWN_CATEGORY_COLORS: Record<string, string> = {
  'cat-meeting': '#e11d48',
  'cat-doc': '#2563eb',
  'cat-dev': '#16a34a',
  'cat-comms': '#ea580c',
}

/** 未分类：琥珀橙实色（图例/列表） */
export const UNCATEGORIZED_BAR = '#d97706'

/** 未分类斜纹辅色 */
export const UNCATEGORIZED_BAR_STRIPE = '#fbbf24'

export function pieColorForIndex(index: number): string {
  return CHART_CATEGORY_COLORS[
    ((index % CHART_CATEGORY_COLORS.length) + CHART_CATEGORY_COLORS.length) %
      CHART_CATEGORY_COLORS.length
  ]
}

export function categoryChartColor(categoryId: string, fallbackIndex: number): string {
  if (categoryId === UNCATEGORIZED_ID) return UNCATEGORIZED_BAR
  return KNOWN_CATEGORY_COLORS[categoryId] ?? pieColorForIndex(fallbackIndex)
}

export function isUncategorizedCategoryId(categoryId: string): boolean {
  return categoryId === UNCATEGORIZED_ID
}

export function barColorForCategoryId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return BAR_COLORS[h % BAR_COLORS.length]
}

export type StackedSegmentLabel = {
  id: string
  label: string
  seconds: number
  color: string
  /** 段中心相对柱底的位置（0–100） */
  midBottomPct: number
  /** 段高度占柱高比例（0–100） */
  heightPct: number
}

/** 堆叠柱各段中心位置，用于柱旁标注 */
export function stackedSegmentLabels(
  segments: { id: string; label: string; seconds: number; color: string }[],
  barSec: number,
): StackedSegmentLabel[] {
  if (barSec <= 0 || segments.length === 0) return []
  let cumulative = 0
  return segments.map((seg) => {
    const frac = seg.seconds / barSec
    const heightPct = frac * 100
    const midBottomPct = (cumulative + frac / 2) * 100
    cumulative += frac
    return { ...seg, midBottomPct, heightPct }
  })
}
