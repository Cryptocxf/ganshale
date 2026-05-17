/** 图表/时间轴用色：饱和、可区分，避免白/灰/黑 */
export const VIBRANT_APP_PALETTE = [
  '#E11D48',
  '#2563EB',
  '#16A34A',
  '#CA8A04',
  '#9333EA',
  '#EA580C',
  '#0891B2',
  '#DB2777',
  '#0D9488',
  '#4F46E5',
  '#DC2626',
  '#059669',
  '#7C3AED',
  '#0284C7',
  '#D97706',
  '#BE185D',
]

function colorForKey(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return VIBRANT_APP_PALETTE[h % VIBRANT_APP_PALETTE.length]
}

/** 无品牌色时的稳定色（与时间分布、时长条共用） */
export function colorForAppLabel(key: string): string {
  return colorForKey(key.trim().toLowerCase() || 'unknown')
}

/**
 * 按展示顺序为每个应用分配不同鲜艳色（最多 palette 种，超出则循环）。
 * `appsInDisplayOrder` 建议与 appTotalsForDay 排序结果一致。
 */
export function buildDistinctChartColorMap(
  appsInDisplayOrder: string[],
  normalizeKey: (app: string) => string,
): Map<string, string> {
  const map = new Map<string, string>()
  const seen = new Set<string>()
  let idx = 0
  for (const app of appsInDisplayOrder) {
    const key = normalizeKey(app)
    if (!key || seen.has(key)) continue
    seen.add(key)
    map.set(key, VIBRANT_APP_PALETTE[idx % VIBRANT_APP_PALETTE.length])
    idx++
  }
  return map
}

export function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace(/^#/, '').trim()
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** 过亮、过暗或低饱和（灰）色不用于图表条 */
export function isMutedChartColor(hex: string): boolean {
  const rgb = parseHexRgb(hex)
  if (!rgb) return true
  const { r, g, b } = rgb
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const sat = max === 0 ? 0 : (max - min) / max
  if (lum > 0.82) return true
  if (lum < 0.18) return true
  if (sat < 0.28) return true
  return false
}
