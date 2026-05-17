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
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import { formatDuration } from '../lib/aggregations'
import { aggregateByAppCategories } from '../lib/appCategoryAggregate'
import {
  type AppCategoryDef,
  type AppCategoryIconId,
  createEmptyCategory,
  loadAppCategoryConfig,
  saveAppCategoryConfig,
  UNCATEGORIZED_ID,
} from '../lib/appCategoryConfig'
import type { AwEvent } from '../lib/awTypes'
import { AppBrandIcon } from './AppBrandIcon'
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
  /** 弹窗内编辑草稿（名称、关键词）；图标沿用已保存分类配置 */
  const [modalDraft, setModalDraft] = useState<{
    name: string
    keywords: string[]
  } | null>(null)
  const [newKeywordInput, setNewKeywordInput] = useState('')

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

  const modalCat =
    detailModalId && detailModalId !== UNCATEGORIZED_ID
      ? categories.find((c) => c.id === detailModalId)
      : undefined
  const modalBucket = detailModalId ? buckets[detailModalId] : undefined

  const detailApps = useMemo(() => {
    if (!detailModalId || !modalBucket) return []
    return Object.entries(modalBucket.apps)
      .map(([exe, sec]) => ({
        exe,
        seconds: Math.round(sec),
        appPath: appPathByExe.get(exe),
      }))
      .sort((a, b) => b.seconds - a.seconds)
  }, [detailModalId, modalBucket, appPathByExe])

  const closeModal = useCallback(() => {
    setDetailModalId(null)
    setModalDraft(null)
    setNewKeywordInput('')
  }, [])

  const openModal = useCallback(
    (id: string) => {
      setDetailModalId(id)
      setNewKeywordInput('')
      if (id === UNCATEGORIZED_ID) {
        setModalDraft(null)
        return
      }
      const c = categories.find((x) => x.id === id)
      if (c) {
        setModalDraft({
          name: c.name,
          keywords: [...c.keywords],
        })
      } else {
        setModalDraft(null)
      }
    },
    [categories],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    if (detailModalId) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailModalId, closeModal])

  const deleteCategoryById = (id: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id)
      saveAppCategoryConfig(next)
      return next
    })
    closeModal()
  }

  const onAddCategory = () => {
    const row = createEmptyCategory()
    setCategories((prev) => {
      const next = [...prev, row]
      saveAppCategoryConfig(next)
      return next
    })
    setDetailModalId(row.id)
    setModalDraft({
      name: row.name,
      keywords: [...row.keywords],
    })
    setNewKeywordInput('')
  }

  const draftRemoveKeyword = (kw: string) => {
    setModalDraft((d) =>
      d ? { ...d, keywords: d.keywords.filter((k) => k !== kw) } : d,
    )
  }

  const draftAddKeyword = () => {
    const raw = newKeywordInput.trim()
    if (!raw || !modalDraft) return
    const exists = modalDraft.keywords.some((k) => k.toLowerCase() === raw.toLowerCase())
    if (exists) {
      setNewKeywordInput('')
      return
    }
    setModalDraft((d) => (d ? { ...d, keywords: [...d.keywords, raw] } : d))
    setNewKeywordInput('')
  }

  const onModalSave = () => {
    if (!detailModalId || detailModalId === UNCATEGORIZED_ID || !modalDraft) return
    const name = modalDraft.name.trim() || '未命名'
    setCategories((prev) => {
      const next = prev.map((c) =>
        c.id === detailModalId ? { ...c, name, keywords: [...modalDraft.keywords] } : c,
      )
      saveAppCategoryConfig(next)
      return next
    })
    closeModal()
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
            className="rounded-lg border border-black/[0.08] bg-white p-1.5 text-ganshale-muted shadow-sm transition hover:bg-ganshale-page hover:text-ganshale-text disabled:opacity-45"
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
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-black/[0.12] bg-white/60 px-2 py-1.5 transition hover:bg-ganshale-page/60"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-black/[0.06] bg-ganshale-page text-ganshale-muted"
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
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/[0.06] bg-white/80 px-2 py-1.5 transition hover:bg-ganshale-page/80"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-black/[0.08] bg-white text-ganshale-accent shadow-sm"
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
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-black/[0.15] bg-white/80 py-1.5 text-[10px] font-medium text-ganshale-subtle transition hover:border-ganshale-accent/30 hover:bg-ganshale-page hover:text-ganshale-text"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            添加分类
          </button>
        </>
      )}

      {detailModalId && modalBucket ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-3"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            className="flex max-h-[min(88vh,32rem)] w-full max-w-sm flex-col rounded-xl border border-black/[0.1] bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cat-detail-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-3 py-2">
              <h3 id="cat-detail-title" className="font-display text-xs font-semibold text-ganshale-text">
                分类编辑
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-ganshale-muted hover:bg-ganshale-page hover:text-ganshale-text"
                aria-label="关闭"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {detailModalId === UNCATEGORIZED_ID ? (
                <>
                  <p className="text-[11px] leading-relaxed text-ganshale-text">
                    <span className="font-medium text-ganshale-subtle">分类名称：</span>
                    未分类
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-ganshale-text">
                    <span className="font-medium text-ganshale-subtle">匹配关键词：</span>
                    <span className="text-ganshale-muted">—</span>
                  </p>
                </>
              ) : modalCat && modalDraft ? (
                <>
                  <label className="block">
                    <span className="text-[10px] font-medium text-ganshale-subtle">分类名称：</span>
                    <input
                      value={modalDraft.name}
                      onChange={(e) =>
                        setModalDraft((d) => (d ? { ...d, name: e.target.value } : d))
                      }
                      className="mt-0.5 w-full rounded-md border border-black/[0.08] bg-white px-2 py-1.5 text-[11px] text-ganshale-text focus:border-ganshale-text/25 focus:outline-none focus:ring-1 focus:ring-ganshale-text/10"
                    />
                  </label>
                  <div className="mt-3">
                    <span className="text-[10px] font-medium text-ganshale-subtle">匹配关键词：</span>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {modalDraft.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-0.5 rounded-full border border-black/[0.08] bg-ganshale-page px-1.5 py-0.5 pl-2 text-[10px] text-ganshale-text"
                        >
                          {kw}
                          <button
                            type="button"
                            title="从列表移除"
                            onClick={() => draftRemoveKeyword(kw)}
                            className="rounded-full p-0.5 text-ganshale-muted hover:bg-black/[0.08] hover:text-ganshale-text"
                            aria-label={`移除 ${kw}`}
                          >
                            <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-1">
                      <input
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            draftAddKeyword()
                          }
                        }}
                        placeholder="新关键词…"
                        className="min-w-0 flex-1 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[10px] text-ganshale-text placeholder:text-ganshale-subtle focus:border-ganshale-text/25 focus:outline-none focus:ring-1 focus:ring-ganshale-text/10"
                      />
                      <button
                        type="button"
                        onClick={draftAddKeyword}
                        className="shrink-0 rounded-md border border-black/[0.1] bg-white px-2 py-1 text-[10px] font-medium text-ganshale-text hover:bg-ganshale-page"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </>
              ) : modalCat ? (
                <p className="text-[10px] text-ganshale-muted">正在加载编辑区…</p>
              ) : null}

              <div className="mt-3">
                <p className="text-[10px] font-medium text-ganshale-subtle">分类明细：</p>
                <ul className="mt-1.5 max-h-44 space-y-1 overflow-y-auto pr-0.5">
                  {detailApps.length === 0 ? (
                    <li className="text-[10px] text-ganshale-muted">无应用记录</li>
                  ) : (
                    detailApps.map((appRow) => {
                      const label = appRow.exe.replace(/\.exe$/i, '') || appRow.exe
                      return (
                        <li
                          key={appRow.exe}
                          className="flex items-center gap-2 rounded-md border border-black/[0.05] bg-white/90 px-2 py-1.5"
                        >
                          <AppBrandIcon
                            app={appRow.exe}
                            appPath={appRow.appPath}
                            size={22}
                            className="shrink-0 rounded-md"
                          />
                          <span
                            className="min-w-0 flex-1 truncate font-mono text-[10px] text-ganshale-text"
                            title={appRow.exe}
                          >
                            {label}
                          </span>
                          <span className="shrink-0 tabular-nums text-[10px] text-ganshale-muted">
                            {formatDuration(appRow.seconds)}
                          </span>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            </div>

            <div
              className={`flex shrink-0 items-center gap-2 border-t border-black/[0.06] px-3 py-2 ${
                detailModalId === UNCATEGORIZED_ID ? 'justify-end' : 'justify-between'
              }`}
            >
              {detailModalId !== UNCATEGORIZED_ID && modalCat ? (
                <button
                  type="button"
                  onClick={() => deleteCategoryById(modalCat.id)}
                  className="text-[10px] font-medium text-red-700 hover:underline"
                >
                  删除此分类
                </button>
              ) : (
                <span />
              )}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-black/[0.12] bg-white px-3 py-1.5 text-[10px] font-medium text-ganshale-text hover:bg-ganshale-page"
                >
                  取消
                </button>
                {detailModalId !== UNCATEGORIZED_ID && modalCat && modalDraft ? (
                  <button
                    type="button"
                    onClick={onModalSave}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-zinc-800"
                  >
                    保存
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
