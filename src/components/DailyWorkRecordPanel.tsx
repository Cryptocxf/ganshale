import type { AwEvent } from '../lib/awTypes'
import { ClipboardList, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  aiSummaryWindowBounds,
  clearAiSummaryScheduleForDay,
  ensureAiSummaryAnchoredForSession,
  filterWindowEventsInRange,
  getNextAiSummaryAtMs,
  isAiSummaryScheduleDay,
  saveLastAiSummaryAt,
  saveNextAiSummaryAt,
} from '../lib/aiSummarySchedule'
import { LOCAL_MIDNIGHT_EVENT, type LocalMidnightDetail } from '../lib/localMidnight'
import { compareLocalCalendarDay, toYmdLocal } from '../lib/timeutil'
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
  WORK_RECORDS_UPDATED_EVENT,
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
import { AiAutoSummaryStatusSuffix } from './AiAutoSummaryActiveBadge'
import { DashboardHeaderActionSlot } from './DashboardHeaderActionSlot'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  DASHBOARD_HEADER_ACTIONS_ROW_CLASS,
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  DASHBOARD_TOP_CARD_BODY_CLASS,
  GS_FIELD_INPUT_ROW_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
  GS_MODAL_INSET_PANEL_CLASS,
} from './dashboardLayout'
import { DashboardModalRoot } from './DashboardModalRoot'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { WorkRecordSourceBadge } from './WorkRecordSourceBadge'

const WORK_RECORD_ROW_H_PX = 32

const ROW_SAVE_BTN =
  'rounded p-1 text-ganshale-muted transition hover:bg-emerald-50 hover:text-emerald-800'
const ROW_DELETE_BTN =
  'rounded p-1 text-ganshale-muted transition hover:bg-red-50 hover:text-red-700 disabled:opacity-30'

const th = 'px-2 text-center text-[11px] font-medium align-middle whitespace-nowrap'
const thTime = 'px-1 text-center text-[11px] font-medium align-middle whitespace-nowrap'
const td = 'px-2 text-[11px] align-middle'
const tdTime =
  'px-1 text-center text-[11px] align-middle tabular-nums text-ganshale-muted whitespace-nowrap'
const inputCls = GS_FIELD_INPUT_ROW_CLASS

function WorkRecordTableRow({
  row,
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
  const isToday = useMemo(() => compareLocalCalendarDay(day) === 'today', [day])

  eventsRef.current = events
  dayRef.current = day

  const reloadRowsFromStorage = useCallback(() => {
    const d = dayRef.current
    dismissedSystemIdsRef.current = loadDismissedSystemRecordIds(d)
    const settings = loadWorkRecordSettings()
    const stored = loadWorkRecords(d)
    setRows(isAiAutoSummaryActive(settings) ? stored : stored.filter((r) => r.source !== 'system'))
  }, [])

  useEffect(() => {
    reloadRowsFromStorage()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 换日仅从本地加载
  }, [day])

  useEffect(() => {
    window.addEventListener(WORK_RECORDS_UPDATED_EVENT, reloadRowsFromStorage)
    return () => window.removeEventListener(WORK_RECORDS_UPDATED_EVENT, reloadRowsFromStorage)
  }, [reloadRowsFromStorage])

  useEffect(() => {
    const onMidnight = (e: Event) => {
      const detail = (e as CustomEvent<LocalMidnightDetail>).detail
      if (!detail || toYmdLocal(dayRef.current) !== detail.prevYmd) return
      const today = new Date()
      dismissedSystemIdsRef.current = loadDismissedSystemRecordIds(today)
      const settings = loadWorkRecordSettings()
      const stored = loadWorkRecords(today)
      setRows(isAiAutoSummaryActive(settings) ? stored : stored.filter((r) => r.source !== 'system'))
      setRecordSettingsRev((v) => v + 1)
    }
    window.addEventListener(LOCAL_MIDNIGHT_EVENT, onMidnight)
    return () => window.removeEventListener(LOCAL_MIDNIGHT_EVENT, onMidnight)
  }, [])

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
      const intervalMs = systemRecordIntervalMs(settings)
      if (windowEvents.length === 0) {
        saveLastAiSummaryAt(currentDay, nowMs)
        if (intervalMs != null) saveNextAiSummaryAt(currentDay, nowMs + intervalMs)
        return
      }
      const content = await summarizeWindowEventsWithLlm(
        windowEvents,
        settings.systemRecordPeriod,
        aiSummaryAbortRef.current.signal,
      )
      saveLastAiSummaryAt(currentDay, nowMs)
      if (intervalMs != null) saveNextAiSummaryAt(currentDay, nowMs + intervalMs)
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
    if (!isAiSummaryScheduleDay(day)) return

    ensureAiSummaryAnchoredForSession(day, settings)

    const tick = () => void runAiSummary()

    const intervalMs = systemRecordIntervalMs(settings)
    if (intervalMs != null) {
      let timeoutId: number | undefined

      const schedule = () => {
        const current = loadWorkRecordSettings()
        if (!isAiAutoSummaryActive(current)) return
        if (!isAiSummaryScheduleDay(dayRef.current)) return
        ensureAiSummaryAnchoredForSession(dayRef.current, current)
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
  }, [day, recordSettingsRev, runAiSummary])

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
        if (!nowActive) {
          clearAiSummaryScheduleForDay(dayRef.current)
        } else if (!wasActive || recordSettings.systemRecordPeriod !== next.systemRecordPeriod) {
          clearAiSummaryScheduleForDay(dayRef.current)
          ensureAiSummaryAnchoredForSession(dayRef.current, next)
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
    <thead className="gs-dashboard-modal__table-head sticky top-0 z-[1] text-ganshale-subtle">
      <tr style={{ height: WORK_RECORD_ROW_H_PX }}>
        <th className={th}>具体内容</th>
        <th className={thTime}>时间</th>
        <th className={th}>操作</th>
      </tr>
    </thead>
  )

  const workRecordTableBody = (rowPy?: string) => (
    <tbody className="gs-dashboard-modal__table-body divide-y divide-ganshale-border">
      {sortedRows.map((row) => {
        const isSystem = row.source === 'system'
        const showBadge = (row.source === 'manual' && row.saved) || isSystem
        return (
          <WorkRecordTableRow
            key={row.id}
            row={row}
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
      className="gs-card relative flex h-full min-h-0 flex-col overflow-hidden p-2 sm:p-2.5"
    >
      <div className="shrink-0">
        <div className="flex min-h-[22px] min-w-0 items-start justify-between gap-2">
          <DashboardSectionTitle
            icon={ClipboardList}
            description={DASHBOARD_SECTION_DESCRIPTIONS.dailyWorkRecord}
            suffix={<AiAutoSummaryStatusSuffix day={day} settings={recordSettings} />}
          >
            今日工作记录
          </DashboardSectionTitle>
          <div className={DASHBOARD_HEADER_ACTIONS_ROW_CLASS}>
            {isToday ? (
              <DashboardHeaderActionSlot
                label="新增行"
                visible
                onClick={addRow}
                className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
              />
            ) : null}
            <DashboardHeaderActionSlot
              label="查看详情"
              visible={isToday || detailRows.length > 0}
              onClick={() => setDetailModalOpen(true)}
              className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
            />
          </div>
        </div>
      </div>

      <div
        className={[
          DASHBOARD_TOP_CARD_BODY_CLASS,
          `mt-1.5 overflow-auto ${GS_MODAL_INSET_PANEL_CLASS}`,
        ].join(' ')}
      >
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[58%]" />
            <col className="w-[18%]" />
            <col className="w-[24%]" />
          </colgroup>
          {workRecordTableHead}
          {workRecordTableBody()}
        </table>
      </div>

      {detailModalOpen ? (
        <DashboardModalRoot
          open
          onClose={() => setDetailModalOpen(false)}
          labelledBy="work-record-detail-modal-title"
          dialogClassName={DASHBOARD_DETAIL_MODAL_SIZE_CLASS}
        >
            <div
              className={`flex items-center justify-between px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
            >
              <DashboardSectionTitle id="work-record-detail-modal-title" icon={ClipboardList}>
                今日工作记录
              </DashboardSectionTitle>
              <div className={DASHBOARD_HEADER_ACTIONS_ROW_CLASS}>
                <DashboardHeaderActionSlot
                  label="新增行"
                  visible={isToday}
                  onClick={addRow}
                  className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
                />
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
                  <col className="w-[58%]" />
                  <col className="w-[18%]" />
                  <col className="w-[24%]" />
                </colgroup>
                {workRecordTableHead}
                {workRecordTableBody()}
              </table>
            </div>
        </DashboardModalRoot>
      ) : null}

    </section>
  )
}
