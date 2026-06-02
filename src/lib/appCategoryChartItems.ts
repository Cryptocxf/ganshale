import type { AppCategoryDef } from './appCategoryConfig'
import { UNCATEGORIZED_ID } from './appCategoryConfig'
import type { CategoryBucket } from './appCategoryAggregate'
import { categoryChartColor, UNCATEGORIZED_BAR } from './categoryBarColors'

/** 与每日「应用分类分布」饼图/柱图一致的分类项（名称 + 配色） */
export type CategoryChartItem = {
  id: string
  label: string
  seconds: number
  color: string
}

export type CategoryChartLegendItem = {
  id: string
  label: string
  color: string
}

/** 按当日 buckets 生成分类项，顺序与配置一致，末尾为有数据的「其他」 */
export function buildCategoryChartItems(
  categories: AppCategoryDef[],
  buckets: Record<string, CategoryBucket>,
): CategoryChartItem[] {
  const items: CategoryChartItem[] = categories.map((cat, index) => ({
    id: cat.id,
    label: cat.name,
    seconds: Math.round(buckets[cat.id]?.seconds ?? 0),
    color: categoryChartColor(cat.id, index),
  }))
  const otherSec = buckets[UNCATEGORIZED_ID]?.seconds ?? 0
  if (otherSec > 0) {
    items.push({
      id: UNCATEGORIZED_ID,
      label: '其他',
      seconds: Math.round(otherSec),
      color: UNCATEGORIZED_BAR,
    })
  }
  return items
}

export function buildCategoryChartLegend(
  items: CategoryChartItem[],
): CategoryChartLegendItem[] {
  return items.map(({ id, label, color }) => ({ id, label, color }))
}

/** 图例模板：与每日「应用分类分布」分类名称、配色、顺序一致（不含无数据的「其他」） */
export function buildCategoryLegendTemplate(
  categories: AppCategoryDef[],
): CategoryChartLegendItem[] {
  return categories.map((cat, index) => ({
    id: cat.id,
    label: cat.name,
    color: categoryChartColor(cat.id, index),
  }))
}

export function categoryChartItemsWithData(items: CategoryChartItem[]): CategoryChartItem[] {
  return items.filter((item) => item.seconds > 0)
}

/** 堆叠柱/详情用：仅保留有时长的分类段，标签与配色与每日页一致 */
export function buildCategoryStackSegments(
  categories: AppCategoryDef[],
  buckets: Record<string, CategoryBucket>,
): CategoryChartItem[] {
  return categoryChartItemsWithData(buildCategoryChartItems(categories, buckets))
}
