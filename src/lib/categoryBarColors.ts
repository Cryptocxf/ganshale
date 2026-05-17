/** 参考商务环形图风格的柔和配色（分类占比条 / 饼图共用） */
export const CHART_CATEGORY_COLORS = [
  '#c54b4f', // 深红
  '#4d5d6e', // 蓝灰
  '#5f8f9a', // 青绿
  '#c87962', // 陶土橙
  '#7f9a7c', // 灰绿
  '#c9a832', // 赭黄
  '#b5938c', // 灰粉
  '#909090', // 中灰
  '#566578', // 深蓝灰
] as const

/** @deprecated 使用 CHART_CATEGORY_COLORS */
const BAR_COLORS = [...CHART_CATEGORY_COLORS]

export const UNCATEGORIZED_BAR = CHART_CATEGORY_COLORS[8]

export function pieColorForIndex(index: number): string {
  return CHART_CATEGORY_COLORS[((index % CHART_CATEGORY_COLORS.length) + CHART_CATEGORY_COLORS.length) % CHART_CATEGORY_COLORS.length]
}

export function barColorForCategoryId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return BAR_COLORS[h % BAR_COLORS.length]
}
