import { FolderOpen, HardDriveDownload, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import {
  clearScopedAppData,
  getStorageLocationLabel,
  type DataClearFilter,
} from '../lib/dataManagement'
import { daysInFilterMonth } from '../lib/dataRecordsQuery'
import { SETTINGS_PAGE_TITLE_CLASS } from './dashboardLayout'

function yearOptions(now = new Date()): number[] {
  const y = now.getFullYear()
  return Array.from({ length: 8 }, (_, i) => y - i)
}

export function DataManagementSettings() {
  const { ready, refresh } = useGanshaleData()
  const [storagePath, setStoragePath] = useState('')
  const [storageLoading, setStorageLoading] = useState(true)
  const [storageHint, setStorageHint] = useState('')
  const [canChangePath, setCanChangePath] = useState(false)
  const [clearMode, setClearMode] = useState<'all' | 'range'>('range')
  const [filterYear, setFilterYear] = useState(() => new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState(0)
  const [filterDay, setFilterDay] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const years = useMemo(() => yearOptions(), [])
  const dayOptions = useMemo(() => {
    if (!filterYear || !filterMonth) return []
    const n = daysInFilterMonth(filterYear, filterMonth)
    return Array.from({ length: n }, (_, i) => i + 1)
  }, [filterYear, filterMonth])

  const loadStorage = useCallback(async () => {
    setStorageLoading(true)
    try {
      const info = await getStorageLocationLabel()
      setStoragePath(info.path)
      setStorageHint(info.hint)
      setCanChangePath(info.canChange)
    } catch {
      setStoragePath('IndexedDB · ganshale_aw')
      setStorageHint('无法读取存储位置，请刷新页面或重启客户端后重试。')
      setCanChangePath(false)
    } finally {
      setStorageLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStorage()
  }, [loadStorage])

  async function onPickStoragePath() {
    const desktop = window.ganshaleDesktop
    if (!desktop?.pickStorageDirectory || !desktop.setStorageDirectory) return
    setBusy(true)
    setNote(null)
    try {
      const picked = await desktop.pickStorageDirectory()
      if (!picked.ok || picked.cancelled || !picked.path) return
      const saved = await desktop.setStorageDirectory(picked.path)
      if (!saved.ok) {
        setNote(saved.error ?? '保存存储路径失败')
        return
      }
      setStoragePath(picked.path)
      setNote('存储路径已更新，请完全退出并重新打开应用后生效。')
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onOpenStorageFolder() {
    const desktop = window.ganshaleDesktop
    if (!desktop?.openPathInFolder || !storagePath) return
    const res = await desktop.openPathInFolder(storagePath)
    if (!res.ok) setNote(res.error ?? '无法打开目录')
  }

  async function onClearData() {
    let filter: DataClearFilter
    if (clearMode === 'all') {
      filter = { mode: 'all' }
    } else {
      if (!filterYear) {
        setNote('请选择要清空的年份')
        return
      }
      filter = {
        mode: 'range',
        year: filterYear,
        ...(filterMonth ? { month: filterMonth } : {}),
        ...(filterDay ? { day: filterDay } : {}),
      }
    }

    const scopeLabel =
      clearMode === 'all'
        ? '全部本地活动数据'
        : filterDay && filterMonth
          ? `${filterYear}年${filterMonth}月${filterDay}日`
          : filterMonth
            ? `${filterYear}年${filterMonth}月`
            : `${filterYear}年`

    if (
      !window.confirm(
        `确定清空 ${scopeLabel} 吗？\n将删除窗口记录、工作记录与报表历史等，且不可恢复。`,
      )
    ) {
      return
    }

    setBusy(true)
    setNote(null)
    try {
      const result = await clearScopedAppData(filter)
      await refresh()
      setNote(
        `已清空 ${scopeLabel}：删除 ${result.eventsDeleted} 条窗口事件，移除 ${result.localKeysRemoved} 项本地记录。`,
      )
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const showOpenFolder =
    Boolean(window.ganshaleDesktop?.openPathInFolder) &&
    !storageLoading &&
    Boolean(storagePath) &&
    !storagePath.startsWith('IndexedDB')

  return (
    <section className="gs-card space-y-4 p-4">
      <h3 className={SETTINGS_PAGE_TITLE_CLASS}>
        <HardDriveDownload className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
        数据管理
      </h3>

      <div className="space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="shrink-0 text-xs font-medium text-ganshale-text">存储位置</span>
          <code
            className="min-w-0 max-w-[12rem] truncate rounded-md border border-ganshale-border bg-ganshale-page px-2 py-1 text-[11px] text-ganshale-text sm:max-w-[16rem]"
            title={storageLoading ? undefined : storagePath || undefined}
          >
            {storageLoading ? '加载中…' : storagePath || '—'}
          </code>
          {showOpenFolder ? (
            <button
              type="button"
              disabled={busy || !storagePath}
              onClick={() => void onOpenStorageFolder()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ganshale-border bg-ganshale-surface px-2.5 py-1 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-page disabled:opacity-40"
            >
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.8} />
              打开目录
            </button>
          ) : null}
          {canChangePath ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPickStoragePath()}
              className="shrink-0 rounded-lg border border-ganshale-border bg-ganshale-surface px-2.5 py-1 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-page disabled:opacity-40"
            >
              更改
            </button>
          ) : null}
        </div>
        <p className="text-[11px] leading-relaxed text-ganshale-muted">{storageHint}</p>
      </div>

      <div className="space-y-2 border-t border-ganshale-border/70 pt-3">
        <p className="text-xs font-medium text-ganshale-text">清空数据</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setClearMode('all')}
            className={[
              'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
              clearMode === 'all'
                ? 'bg-ganshale-text text-ganshale-surface'
                : 'border border-ganshale-border bg-ganshale-page text-ganshale-muted hover:text-ganshale-text',
            ].join(' ')}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setClearMode('range')}
            className={[
              'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
              clearMode === 'range'
                ? 'bg-ganshale-text text-ganshale-surface'
                : 'border border-ganshale-border bg-ganshale-page text-ganshale-muted hover:text-ganshale-text',
            ].join(' ')}
          >
            按日期
          </button>
        </div>

        {clearMode === 'range' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="年份"
              value={filterYear}
              onChange={(e) => {
                setFilterYear(Number(e.target.value))
                setFilterMonth(0)
                setFilterDay(0)
              }}
              className="rounded-md border border-ganshale-border bg-ganshale-page px-2 py-1 text-[11px] text-ganshale-text focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
            <select
              aria-label="月份"
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(Number(e.target.value))
                setFilterDay(0)
              }}
              className="rounded-md border border-ganshale-border bg-ganshale-page px-2 py-1 text-[11px] text-ganshale-text focus:outline-none"
            >
              <option value={0}>不限月</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} 月
                </option>
              ))}
            </select>
            <select
              aria-label="日期"
              value={filterDay}
              disabled={!filterMonth}
              onChange={(e) => setFilterDay(Number(e.target.value))}
              className="rounded-md border border-ganshale-border bg-ganshale-page px-2 py-1 text-[11px] text-ganshale-text focus:outline-none disabled:opacity-50"
            >
              <option value={0}>不限日</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {d} 日
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => void onClearData()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            清空数据
          </button>
          <p className="min-w-0 text-[11px] leading-snug text-ganshale-muted">
            仅删除活动数据（窗口记录、工作记录、日报/周报/月报历史等），不会清除外观、模型与分类等设置。
          </p>
        </div>
      </div>

      {note ? <p className="text-xs text-ganshale-muted">{note}</p> : null}
    </section>
  )
}
