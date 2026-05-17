import type { AwEvent } from '../lib/awTypes'
import { ClipboardList, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  aiSummaryWindowBounds,
  clearLastAiSummaryAt,
  filterWindowEventsInRange,
  getNextAiSummaryAtMs,
  saveLastAiSummaryAt,
} from '../lib/aiSummarySchedule'
import { summarizeWindowEventsWithLlm } from '../lib/aiWorkRecordSummary'
import {
  appendAiSummaryWorkRecord,
  createEmptyWorkRecordRow,
  dismissSystemRecordId,
  loadDismissedSystemRecordIds,
  loadWorkRecords,
  formatWorkRecordTime,
  saveWorkRecords,
  sortWorkRecordsByTimeDesc,
  type WorkRecordRow,
} from '../lib/workRecordStore'
import {
  isAiAutoSummaryActive,
  loadWorkRecordSettings,
  shouldFireClockSystemRecord,
  systemRecordIntervalMs,
  WORK_RECORD_SETTINGS_CHANGED_EVENT,
  type WorkRecordSettings,
} from '../lib/workRecordSettings'
import { AiAutoSummaryActiveBadge } from './AiAutoSummaryActiveBadge'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SHELL_CLASS,
} from './dashboardLayout'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { WorkRecordSourceBadge } from './WorkRecordSourceBadge'

const WORK_RECORD_ROW_H_PX = 32

const HEADER_ACTION_BTN =
  'shrink-0 rounded-md border border-black/[0.08] bg-white px-2 py-0.5 text-[10px] font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page'

const ROW_SAVE_BTN =
  'rounded p-1 text-ganshale-muted transition hover:bg-emerald-50 hover:text-emerald-800'
const ROW_DELETE_BTN =
  'rounded p-1 text-ganshale-muted transition hover:bg-red-50 hover:text-red-700 disabled:opacity-30'

const th = 'px-2 text-center text-[11px] font-medium align-middle whitespace-nowrap'
const thIndex = 'px-1 text-center text-[11px] font-medium align-middle whitespace-nowrap'
const thTime = 'px-1 text-center text-[11px] font-medium align-middle whitespace-nowrap'
const td = 'px-2 text-[11px] align-middle'
const tdIndex = 'px-1 text-center text-[10px] align-middle tabular-nums text-ganshale-muted'
const tdTime =
  'px-1 text-center text-[10px] align-middle tabular-nums text-ganshale-muted whitespace-nowrap'
const inputCls =
  'h-7 min-w-0 flex-1 truncate rounded border border-black/[0.06] bg-white px-1.5 text-[11px] leading-7 text-ganshale-text placeholder:text-ganshale-subtle focus:border-ganshale-text/25 focus:outline-none focus:ring-1 focus:ring-ganshale-text/10 disabled:cursor-default disabled:bg-ganshale-page/80 disabled:text-ganshale-text'

function WorkRecordTableRow({
  row,
  displayIndex,
  isSystem,
  showBadge,
  onUpdate,
  onSave,
  onDelete,
  savedRowId,
  deleteManualDisabled,
  rowPy,
}: {
  row: WorkRecordRow
  displayIndex: number
  isSystem: boolean
  showBadge: boolean
  onUpdate: (id: string, patch: Partial<Pick<WorkRecordRow, 'content'>>) => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
  savedRowId: string | null
  deleteManualDisabled: boolean
  rowPy?: string
}) {
  const py = rowPy ?? ''
  return (
    <tr
      className="hover:bg-ganshale-page/60"
      style={{ height: WORK_RECORD_ROW_H_PX, minHeight: WORK_RECORD_ROW_H_PX }}
    >
      <td className={`${tdIndex} ${py}`}>{displayIndex}</td>
      <td className={`${td} ${py}`}>
        <div className="flex min-w-0 items-center gap-1.5">
          {showBadge ? <WorkRecordSourceBadge source={row.source} saved={row.saved} /> : null}
          <input
            type="text"
            value={row.content}
            onChange={(e) => onUpdate(row.id, { content: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSystem && row.content.trim()) {
                e.preventDefault()
                onSave(row.id)
              }
            }}
            placeholder={isSystem ? '' : '填写工作内容…'}
            className={inputCls}
            title={row.content}
            readOnly={isSystem}
            disabled={isSystem}
          />
        </div>
      </td>
      <td className={`${tdTime} ${py}`}>{formatWorkRecordTime(row.recordedAt)}</td>
      <td className={`${td} text-center ${py}`}>
        <div className="inline-flex items-center justify-center gap-0.5">
          {!isSystem ? (
            <button
              type="button"
              onClick={() => onSave(row.id)}
              disabled={!row.content.trim()}
              className={[
                ROW_SAVE_BTN,
                savedRowId === row.id ? 'text-emerald-700' : '',
                !row.content.trim() ? 'opacity-30' : '',
              ].join(' ')}
              aria-label="保存此行"
              title="保存为手动记录"
            >
              <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(row.id)}
            className={ROW_DELETE_BTN}
            aria-label={isSystem ? '删除 AI 总结' : '删除此行'}
            title="删除"
            disabled={!isSystem && deleteManualDisabled}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function DailyWorkRecordPanel({ day, events }: { day: Date; events: AwEvent[] }) {
  const [rows, setRows] = useState<WorkRecordRow[]>(() => loadWorkRecords(day))
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [recordSettings, setRecordSettings] = useState<WorkRecordSettings>(() =>
    loadWorkRecordSettings(),
  )
  const [recordSettingsRev, setRecordSettingsRev] = useState(0)
  const [savedRowId, setSavedRowId] = useState<string | null>(null)
  const eventsRef = useRef(events)
  const dayRef = useRef(day)
  const dismissedSystemIdsRef = useRef(loadDismissedSystemRecordIds(day))
  const savedFlashTimerRef = useRef<number | null>(null)
  const aiSummaryBusyRef = useRef(false)
  const aiSummaryAbortRef = useRef<AbortController | null>(null)

  eventsRef.current = events
  dayRef.current = day

  useEffect(() => {
    dismissedSystemIdsRef.current = loadDismissedSystemRecordIds(day)
    const settings = loadWorkRecordSettings()
    const stored = loadWorkRecords(day)
    setRows(isAiAutoSummaryActive(settings) ? stored : stored.filter((r) => r.source !== 'system'))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 换日仅从本地加载
  }, [day])

  const runAiSummary = useCallback(async () => {
    if (aiSummaryBusyRef.current) return
    const settings = loadWorkRecordSettings()
    if (!isAiAutoSummaryActive(settings)) return

    const nowMs = Date.now()
    const currentDay = dayRef.current
    const { startMs, endMs } = aiSummaryWindowBounds(
      currentDay,
      nowMs,
      settings.systemRecordPeriod,
    )
    const windowEvents = filterWindowEventsInRange(
      eventsRef.current,
      currentDay,
      startMs,
      endMs,
    )

    aiSummaryBusyRef.current = true
    aiSummaryAbortRef.current?.abort()
    aiSummaryAbortRef.current = new AbortController()

    try {
      if (windowEvents.length === 0) {
        saveLastAiSummaryAt(currentDay, nowMs)
        return
      }
      const content = await summarizeWindowEventsWithLlm(
        windowEvents,
        settings.systemRecordPeriod,
        aiSummaryAbortRef.current.signal,
      )
      saveLastAiSummaryAt(currentDay, nowMs)
      setRows((prev) => appendAiSummaryWorkRecord(prev, content))
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      console.warn('[ganshale] AI 自动总结失败', e)
    } finally {
      aiSummaryBusyRef.current = false
      aiSummaryAbortRef.current = null
    }
  }, [])

  useEffect(() => {
    saveWorkRecords(day, sortWorkRecordsByTimeDesc(rows))
  }, [day, rows])

  const sortedRows = useMemo(() => sortWorkRecordsByTimeDesc(rows), [rows])

  useEffect(() => {
    const settings = loadWorkRecordSettings()
    if (!isAiAutoSummaryActive(settings)) return

    const tick = () => void runAiSummary()

    const intervalMs = systemRecordIntervalMs(settings)
    if (intervalMs != null) {
      let timeoutId: number | undefined

      const schedule = () => {
        const current = loadWorkRecordSettings()
        if (!isAiAutoSummaryActive(current)) return
        const nextAt = getNextAiSummaryAtMs(dayRef.current, current)
        const delay =
          nextAt == null ? intervalMs : Math.max(250, nextAt - Date.now())
        timeoutId = window.setTimeout(() => {
          void Promise.resolve(runAiSummary()).finally(schedule)
        }, delay)
      }

      schedule()
      return () => {
        if (timeoutId != null) window.clearTimeout(timeoutId)
      }
    }

    let lastFiredKey: string | null = null
    const id = window.setInterval(() => {
      const now = new Date()
      const { fire, nextKey } = shouldFireClockSystemRecord(settings, now, lastFiredKey)
      lastFiredKey = nextKey
      if (fire) void tick()
    }, 30_000)
    return () => window.clearInterval(id)
  }, [recordSettingsRev, runAiSummary])

  useEffect(() => {
    const onSettingsChange = () => {
      const next = loadWorkRecordSettings()
      const wasActive = isAiAutoSummaryActive(recordSettings)
      const nowActive = isAiAutoSummaryActive(next)
      setRecordSettings(next)
      if (wasActive && !nowActive) {
        aiSummaryAbortRef.current?.abort()
        setRows((prev) => prev.filter((r) => r.source !== 'system'))
      }
      if (
        recordSettings.systemRecordPeriod !== next.systemRecordPeriod ||
        recordSettings.aiAutoSummaryEnabled !== next.aiAutoSummaryEnabled ||
        wasActive !== nowActive
      ) {
        setRecordSettingsRev((v) => v + 1)
        if (nowActive && !wasActive) {
          clearLastAiSummaryAt(dayRef.current)
        }
      }
    }
    window.addEventListener(WORK_RECORD_SETTINGS_CHANGED_EVENT, onSettingsChange)
    window.addEventListener('storage', onSettingsChange)
    return () => {
      window.removeEventListener(WORK_RECORD_SETTINGS_CHANGED_EVENT, onSettingsChange)
      window.removeEventListener('storage', onSettingsChange)
    }
  }, [recordSettings])

  const updateRow = useCallback((id: string, patch: Partial<Pick<WorkRecordRow, 'content'>>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const addRow = useCallback(() => {
    const row = createEmptyWorkRecordRow()
    row.recordedAt = new Date().toISOString()
    setRows((prev) => [row, ...prev])
  }, [])

  const deleteRow = useCallback(
    (id: string) => {
      setRows((prev) => {
        const row = prev.find((r) => r.id === id)
        if (!row) return prev
        if (row.source === 'system') {
          dismissedSystemIdsRef.current = dismissSystemRecordId(day, id)
          return prev.filter((r) => r.id !== id)
        }
        if (prev.filter((r) => r.source !== 'system').length <= 1) {
          return prev.map((r) =>
            r.id === id ? { ...createEmptyWorkRecordRow(), id: r.id } : r,
          )
        }
        return prev.filter((r) => r.id !== id)
      })
    },
    [day, events],
  )

  const saveRow = useCallback(
    (id: string) => {
      setRows((prev) => {
        const next = prev.map((r) => {
          if (r.id !== id || r.source === 'system') return r
          if (!r.content.trim()) return r
          return {
            ...r,
            source: 'manual' as const,
            saved: true,
            recordedAt: new Date().toISOString(),
          }
        })
        saveWorkRecords(day, next)
        return next
      })
      setSavedRowId(id)
      if (savedFlashTimerRef.current != null) {
        window.clearTimeout(savedFlashTimerRef.current)
      }
      savedFlashTimerRef.current = window.setTimeout(() => {
        setSavedRowId(null)
        savedFlashTimerRef.current = null
      }, 1200)
    },
    [day],
  )

  useEffect(() => {
    return () => {
      if (savedFlashTimerRef.current != null) {
        window.clearTimeout(savedFlashTimerRef.current)
      }
    }
  }, [])

  const detailRows = useMemo(
    () => sortedRows.filter((r) => r.content.trim()),
    [sortedRows],
  )

  const manualRowCount = rows.filter((r) => r.source !== 'system').length
  const deleteManualDisabled = manualRowCount <= 1

  const workRecordTableHead = (
    <thead className="sticky top-0 z-[1] border-b border-ganshale-border bg-ganshale-page text-ganshale-subtle">
      <tr style={{ height: WORK_RECORD_ROW_H_PX }}>
        <th className={thIndex}>序号</th>
        <th className={th}>具体内容</th>
        <th className={thTime}>时间</th>
        <th className={th}>操作</th>
      </tr>
    </thead>
  )

  const workRecordTableBody = (rowPy?: string) => (
    <tbody className="divide-y divide-ganshale-border">
      {sortedRows.map((row, index) => {
        const isSystem = row.source === 'system'
        const showBadge = (row.source === 'manual' && row.saved) || isSystem
        return (
          <WorkRecordTableRow
            key={row.id}
            row={row}
            displayIndex={sortedRows.length - index}
            isSystem={isSystem}
            showBadge={showBadge}
            onUpdate={updateRow}
            onSave={saveRow}
            onDelete={deleteRow}
            savedRowId={savedRowId}
            deleteManualDisabled={deleteManualDisabled}
            rowPy={rowPy}
          />
        )
      })}
    </tbody>
  )

  return (
    <section
      aria-label="今日工作记录"
      className="gs-card relative flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-2.5"
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <DashboardSectionTitle
          icon={ClipboardList}
          suffix={
            isAiAutoSummaryActive(recordSettings) ? <AiAutoSummaryActiveBadge day={day} /> : null
          }
        >
          今日工作记录
        </DashboardSectionTitle>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          <button type="button" onClick={addRow} className={HEADER_ACTION_BTN}>
            新增行
          </button>
          {detailRows.length > 0 ? (
            <button
              type="button"
              onClick={() => setDetailModalOpen(true)}
              className={HEADER_ACTION_BTN}
            >
              查看详情
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5 min-h-0 flex-1 overflow-auto rounded-lg border border-black/[0.06]">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[7%]" />
            <col className="w-[54%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          {workRecordTableHead}
          {workRecordTableBody()}
        </table>
      </div>

      {detailModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 sm:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailModalOpen(false)
          }}
        >
          <div
            className={DASHBOARD_DETAIL_MODAL_SHELL_CLASS}
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-record-detail-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-2 py-1.5 sm:px-3">
              <DashboardSectionTitle id="work-record-detail-modal-title" icon={ClipboardList}>
                今日工作记录
              </DashboardSectionTitle>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={addRow} className={HEADER_ACTION_BTN}>
                  新增行
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>
            <div className={DASHBOARD_DETAIL_MODAL_BODY_CLASS}>
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-[7%]" />
                  <col className="w-[54%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                {workRecordTableHead}
                {workRecordTableBody()}
              </table>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  )
}
