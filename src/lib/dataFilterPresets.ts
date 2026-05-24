import type { DataRecordsFilterState } from './dataRecordsQuery'
import {
  defaultDataRecordsFilters,
  normalizeFiltersForRecordKind,
  normalizeTimeFilterParts,
} from './dataRecordsQuery'

export type SavedDataFilterPreset = {
  id: string
  name: string
  savedAt: string
  filters: Omit<DataRecordsFilterState, 'page' | 'pageSize' | 'viewMode'>
}

const STORAGE_KEY = 'ganshale-data-filter-presets-v4'
const CHANGED_EVENT = 'ganshale-data-filter-presets-changed'

function uid(): string {
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function loadDataFilterPresets(): SavedDataFilterPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedDataFilterPreset[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDataFilterPresets(presets: SavedDataFilterPreset[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

export function addDataFilterPreset(
  name: string,
  filters: DataRecordsFilterState,
): SavedDataFilterPreset {
  const time = normalizeTimeFilterParts(filters)
  const preset: SavedDataFilterPreset = {
    id: uid(),
    name: name.trim() || '未命名方案',
    savedAt: new Date().toISOString(),
    filters: {
      recordKind: filters.recordKind,
      filterYear: time.filterYear,
      filterMonth: time.filterMonth,
      filterDay: time.filterDay,
      weeklyYear: filters.weeklyYear,
      weeklyMonth: filters.weeklyMonth,
      categoryIds: [...filters.categoryIds],
      durationFilter: filters.durationFilter,
      monthlyWeek: filters.monthlyWeek,
      appSearchQuery: filters.appSearchQuery,
      sortField: filters.sortField,
      sortDirection: filters.sortDirection,
    },
  }
  const next = [...loadDataFilterPresets(), preset]
  saveDataFilterPresets(next)
  return preset
}

export function deleteDataFilterPreset(id: string): void {
  saveDataFilterPresets(loadDataFilterPresets().filter((p) => p.id !== id))
}

export function applyPresetToFilters(
  preset: SavedDataFilterPreset,
  base = defaultDataRecordsFilters(),
): DataRecordsFilterState {
  const time = normalizeTimeFilterParts(preset.filters)
  const legacy = preset.filters as DataRecordsFilterState & { searchQuery?: string }
  return normalizeFiltersForRecordKind({
    ...base,
    ...preset.filters,
    recordKind: preset.filters.recordKind ?? 'window',
    appSearchQuery: legacy.appSearchQuery ?? legacy.searchQuery ?? '',
    ...time,
    categoryIds: [...preset.filters.categoryIds],
    page: 1,
  })
}

export { CHANGED_EVENT as DATA_FILTER_PRESETS_CHANGED_EVENT }
