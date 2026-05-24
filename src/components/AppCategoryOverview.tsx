import {
  Briefcase,
  Code2,
  FileText,
  FolderKanban,
  HelpCircle,
  Layers,
  MessageCircle,
  Plus,
  RefreshCw,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import { aggregateByAppCategories } from '../lib/appCategoryAggregate'
import {
  type AppCategoryDef,
  type AppCategoryIconId,
  applyCategorySave,
  createEmptyCategory,
  loadAppCategoryConfig,
  resetCategoryInList,
  saveAppCategoryConfig,
  UNCATEGORIZED_ID,
} from '../lib/appCategoryConfig'
import type { AwEvent } from '../lib/awTypes'
import { CategoryDetailModal } from './CategoryDetailModal'
import { DASHBOARD_HEADER_ACTION_BTN_CLASS } from './dashboardLayout'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DashboardSectionTitle } from './DashboardSectionTitle'

const ICONS: Record<AppCategoryIconId, LucideIcon> = {
  video: Video,
  'file-text': FileText,
  'code-2': Code2,
  'message-circle': MessageCircle,
  'folder-kanban': FolderKanban,
  briefcase: Briefcase,
  layers: Layers,
}

/** 占比条颜色：按分类 id 稳定映射，便于区分 */
const BAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#0d9488',
  '#ea580c',
  '#db2777',
  '#2563eb',
  '#ca8a04',
  '#4f46e5',
  '#059669',
]

function barColorForCategoryId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return BAR_COLORS[h % BAR_COLORS.length]
}

const UNCAT_BAR = '#94a3b8'

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

function formatRefreshStamp(d: Date): string {
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function CategoryGlyph({
  iconId,
  className,
}: {
  iconId: AppCategoryIconId
  className?: string
}) {
  const I = ICONS[iconId] ?? Layers
  return <I className={className} strokeWidth={1.8} />
}

type SortRow =
  | { kind: 'cat'; cat: AppCategoryDef; seconds: number; p: number }
  | { kind: 'uncat'; seconds: number; p: number }

export function AppCategoryOverview({
  day,
  events,
  ready,
}: {
  day: Date
  events: AwEvent[]
  ready: boolean
}) {
  const { refresh } = useGanshaleData()
  const [categories, setCategories] = useState<AppCategoryDef[]>(() => loadAppCategoryConfig())
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [detailModalId, setDetailModalId] = useState<string | null>(null)
  const [pendingNewCategory, setPendingNewCategory] = useState<AppCategoryDef | null>(null)

  const { totalSeconds, buckets } = useMemo(
    () => aggregateByAppCategories(day, events, categories),
    [day, events, categories],
  )

  const appPathByExe = useMemo(() => {
    const m = new Map<string, string>()
    for (const ev of events) {
      const app = String(ev.data.app ?? 'unknown')
      if (!m.has(app)) {
        const p = String(ev.data.appPath ?? '').trim()
        if (p) m.set(app, p)
      }
    }
    return m
  }, [events])

  const sortedRows: SortRow[] = useMemo(() => {
    const rows: SortRow[] = []
    for (const cat of categories) {
      const sec = buckets[cat.id]?.seconds ?? 0
      rows.push({ kind: 'cat', cat, seconds: sec, p: pct(sec, totalSeconds) })
    }
    const uncatSec = buckets[UNCATEGORIZED_ID]?.seconds ?? 0
    if (uncatSec > 0 || categories.length === 0) {
      rows.push({ kind: 'uncat', seconds: uncatSec, p: pct(uncatSec, totalSeconds) })
    }
    rows.sort((a, b) => b.seconds - a.seconds)
    return rows
  }, [categories, buckets, totalSeconds])

  const modalBucket = detailModalId ? buckets[detailModalId] : undefined

  const detailCategory = useMemo((): AppCategoryDef | undefined => {
    if (!detailModalId) return undefined
    if (pendingNewCategory?.id === detailModalId) return pendingNewCategory
    if (detailModalId === UNCATEGORIZED_ID) {
      return { id: UNCATEGORIZED_ID, name: '未分类', iconId: 'layers', keywords: [] }
    }
    return categories.find((c) => c.id === detailModalId)
  }, [detailModalId, categories, pendingNewCategory])

  const closeModal = useCallback(() => {
    setDetailModalId(null)
    setPendingNewCategory(null)
  }, [])

  const openModal = useCallback((id: string) => setDetailModalId(id), [])

  const onSaveCategory = useCallback((id: string, name: string, keywords: string[]) => {
    setCategories((prev) => {
      const base =
        pendingNewCategory?.id === id && !prev.some((c) => c.id === id)
          ? [...prev, pendingNewCategory]
          : prev
      const next = applyCategorySave(base, id, name, keywords)
      saveAppCategoryConfig(next)
      return next
    })
    setPendingNewCategory(null)
  }, [pendingNewCategory])

  const onDeleteCategory = useCallback((id: string) => {
    if (pendingNewCategory?.id === id) {
      closeModal()
      return
    }
    setCategories((prev) => {
      const next = resetCategoryInList(prev, id)
      saveAppCategoryConfig(next)
      return next
    })
  }, [pendingNewCategory, closeModal])

  const onAddCategory = () => {
    const row = createEmptyCategory()
    setPendingNewCategory(row)
    setDetailModalId(row.id)
  }

  const onRefreshCategories = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refresh()
      setRefreshedAt(new Date())
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2 p-2.5 sm:p-3">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <DashboardSectionTitle icon={Layers}>应用分类速览</DashboardSectionTitle>
          <DashboardSectionSubtitle>
            自上而下优先匹配；占比高→低排序。点击名称、进度条或百分比打开编辑。
          </DashboardSectionSubtitle>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <button
            type="button"
            onClick={() => void onRefreshCategories()}
            disabled={refreshing || !ready}
            className={`${DASHBOARD_HEADER_ACTION_BTN_CLASS} p-1.5 text-ganshale-muted disabled:opacity-45`}
            aria-label="刷新分类占比"
            title="刷新分类占比"
          >
            <RefreshCw
              className={['h-3.5 w-3.5', refreshing ? 'animate-spin' : ''].join(' ')}
              strokeWidth={1.8}
            />
          </button>
          {refreshedAt ? (
            <span className="whitespace-nowrap text-[9px] tabular-nums text-ganshale-subtle">
              {formatRefreshStamp(refreshedAt)} 刷新
            </span>
          ) : null}
        </div>
      </div>

      {!ready ? (
        <p className="py-6 text-center text-xs text-ganshale-muted">加载中…</p>
      ) : totalSeconds <= 0 ? (
        <p className="py-6 text-center text-xs text-ganshale-muted">暂无窗口数据。</p>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
            {sortedRows.map((row) => {
              if (row.kind === 'uncat') {
                const p = row.p
                return (
                  <div
                    key={UNCATEGORIZED_ID}
                    role="button"
                    tabIndex={0}
                    onClick={() => openModal(UNCATEGORIZED_ID)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openModal(UNCATEGORIZED_ID)
                      }
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ganshale-border bg-ganshale-surface/60 px-2 py-1.5 transition hover:bg-ganshale-page/60"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ganshale-border bg-ganshale-page text-ganshale-muted"
                      aria-hidden
                    >
                      <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>
                    <span className="max-w-[5.5rem] shrink-0 truncate text-[11px] font-medium text-ganshale-muted">
                      未分类
                    </span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ganshale-track/90">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{
                          width: `${Math.min(100, p)}%`,
                          backgroundColor: UNCAT_BAR,
                        }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right tabular-nums text-[10px] text-ganshale-subtle">
                      {p}%
                    </span>
                  </div>
                )
              }

              const { cat, p } = row
              const barColor = barColorForCategoryId(cat.id)
              return (
                <div
                  key={cat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openModal(cat.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openModal(cat.id)
                    }
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-ganshale-border bg-ganshale-surface/80 px-2 py-1.5 transition hover:bg-ganshale-page/80"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ganshale-border bg-ganshale-surface text-ganshale-accent shadow-sm"
                    aria-hidden
                  >
                    <CategoryGlyph iconId={cat.iconId} className="h-3.5 w-3.5" />
                  </span>
                  <span className="max-w-[5.5rem] shrink-0 truncate text-[11px] font-medium text-ganshale-text">
                    {cat.name}
                  </span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ganshale-track/90">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.min(100, p)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right tabular-nums text-[10px] text-ganshale-subtle">
                    {p}%
                  </span>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onAddCategory}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-ganshale-border bg-ganshale-surface/80 py-1.5 text-[10px] font-medium text-ganshale-subtle transition hover:border-ganshale-accent/30 hover:bg-ganshale-page hover:text-ganshale-text"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            添加分类
          </button>
        </>
      )}

      {detailModalId && detailCategory && modalBucket ? (
        <CategoryDetailModal
          category={detailCategory}
          categories={categories}
          bucket={modalBucket}
          durationApps={[]}
          appPathByExe={appPathByExe}
          isNewDraft={pendingNewCategory?.id === detailModalId}
          onClose={closeModal}
          onSaveCategory={onSaveCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ) : null}
    </div>
  )
}
