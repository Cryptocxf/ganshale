import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { GanshaleDataContext } from './ganshaleDataContext'
import type { AwBucket, AwEvent, AwExportV1 } from '../lib/awTypes'
import {
  endOfLocalDay,
  isSameLocalCalendarDay,
  startOfLocalDay,
  toYmdLocal,
} from '../lib/timeutil'
import {
  clearWorkdayClockOutPersist,
  persistWorkdayClockOut,
} from '../lib/clientSessionClock'
import { APP_DATA_CHANGED_EVENT, notifyAppDataChanged } from '../lib/dataManagement'
import {
  clearWorkdayTimerPause,
  hasTodayWorkdayTimerPaused,
  persistWorkdayTimerPause,
  readTodayWorkdayPauseStartMs,
  totalWorkdayPausedMs,
  type WorkdayPauseInterval,
} from '../lib/workdayTimerPause'
import {
  applyLocalMidnightRollover,
  createLocalMidnightWatcher,
} from '../lib/localMidnight'
import * as store from '../lib/idbStore'
import {
  BUCKET_AFK,
  BUCKET_WEB,
  BUCKET_WINDOW,
  resetDemoData,
  seedIfEmpty,
} from '../lib/seed'
import { heartbeatWindow } from '../lib/heartbeat'
import {
  isHeartbeatStale,
  markHeartbeatSuccess,
  markTrackingPollSuccess,
  resetHeartbeatHealth,
} from '../lib/heartbeatQueue'
import { identityFromLiveForeground } from '../lib/windowAppDisplay'
import {
  WINDOW_HEARTBEAT_STALE_MS,
  WINDOW_HEARTBEAT_WATCHDOG_MS,
  WINDOW_TRACKING_RECOVERY_COOLDOWN_MS,
} from '../lib/windowTrackingHealth'
import { invalidateMonthlyWindowEventsCache } from '../lib/monthlyWorktime'
import { appendSessionReflection } from '../lib/sessionReflectionsStore'
import {
  appendManualWorkRecord,
  WORK_RECORDS_UPDATED_EVENT,
} from '../lib/workRecordStore'
import { isWindowsExplorerApp } from '../lib/selfWindowFilter'
import {
  loadWorkRecordSettings,
  syncReflectPromptEnabledToDesktop,
} from '../lib/workRecordSettings'
import { purgeElectronShellWindowEvents } from '../lib/purgeElectronEvents'

import type { LiveForegroundSample } from '../lib/liveForeground'

export function GanshaleDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [day, setDay] = useState(() => new Date())
  const [buckets, setBuckets] = useState<AwBucket[]>([])
  const [windowEvents, setWindowEvents] = useState<AwEvent[]>([])
  const [windowEventsToday, setWindowEventsToday] = useState<AwEvent[]>([])
  const [webEvents, setWebEvents] = useState<AwEvent[]>([])
  const [afkEvents, setAfkEvents] = useState<AwEvent[]>([])
  const [eventCount, setEventCount] = useState(0)
  const [daysWithTimingData, setDaysWithTimingData] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [liveForeground, setLiveForeground] = useState<LiveForegroundSample | null>(null)
  const [windowTrackingActive, setWindowTrackingActive] = useState(false)
  const [windowTrackingSupported, setWindowTrackingSupported] = useState(false)
  const [recordingHealthTick, setRecordingHealthTick] = useState(0)
  const [collectionPausedByUser, setCollectionPausedByUser] = useState(false)
  const [workdayTimerPausedByUser, setWorkdayTimerPausedByUser] = useState(
    hasTodayWorkdayTimerPaused,
  )
  const [timerPausedAtMs, setTimerPausedAtMs] = useState<number | null>(() =>
    hasTodayWorkdayTimerPaused() ? Date.now() : null,
  )
  const [workdayPauseIntervals, setWorkdayPauseIntervals] = useState<WorkdayPauseInterval[]>(
    () => [],
  )
  const workdayPauseStartMsRef = useRef<number | null>(readTodayWorkdayPauseStartMs())
  const lastLocalYmdRef = useRef(toYmdLocal(new Date()))
  const lastIndexedRefreshRef = useRef(0)
  const lastCountableForegroundRef = useRef<LiveForegroundSample | null>(null)
  /** 离开可统计前台后，下次心跳须新开事件，避免把中间空白时间并入上一条 */
  const splitNextCountableHeartbeatRef = useRef(false)
  const dayRef = useRef(day)
  dayRef.current = day
  const workdayTimerPausedRef = useRef(workdayTimerPausedByUser)
  workdayTimerPausedRef.current = workdayTimerPausedByUser
  const lastRecoveryAtRef = useRef(0)
  const lastForegroundIdentityKeyRef = useRef<string | null>(null)

  const windowRecordingHealthy = useMemo(() => {
    void recordingHealthTick
    if (!windowTrackingActive || workdayTimerPausedByUser) return true
    return !isHeartbeatStale(Date.now(), WINDOW_HEARTBEAT_STALE_MS)
  }, [windowTrackingActive, workdayTimerPausedByUser, recordingHealthTick])

  const getWorkdayPausedMs = useCallback(
    (_nowMs: number) =>
      totalWorkdayPausedMs(workdayPauseIntervals, {
        activeStartMs: workdayTimerPausedByUser ? workdayPauseStartMsRef.current : null,
        activeEndMs:
          workdayTimerPausedByUser && timerPausedAtMs != null ? timerPausedAtMs : null,
      }),
    [workdayPauseIntervals, workdayTimerPausedByUser, timerPausedAtMs],
  )

  const load = useCallback(async () => {
    const start = startOfLocalDay(day).toISOString()
    const end = endOfLocalDay(day).toISOString()
    const now = new Date()
    const todayStart = startOfLocalDay(now).toISOString()
    const todayEnd = endOfLocalDay(now).toISOString()
    const dayIsToday = isSameLocalCalendarDay(day, now)
    const [b, w, wTodayIfNeeded, web, afk, n, timingDays] = await Promise.all([
      store.getAllBuckets(),
      store.getEventsInRange(BUCKET_WINDOW, start, end),
      dayIsToday
        ? Promise.resolve([] as AwEvent[])
        : store.getEventsInRange(BUCKET_WINDOW, todayStart, todayEnd),
      store.getEventsInRange(BUCKET_WEB, start, end),
      store.getEventsInRange(BUCKET_AFK, start, end),
      store.countEvents(),
      store.getDistinctWindowEventLocalDays(BUCKET_WINDOW),
    ])
    setBuckets(b)
    setWindowEvents(w)
    setWindowEventsToday(dayIsToday ? w : wTodayIfNeeded)
    setWebEvents(web)
    setAfkEvents(afk)
    setEventCount(n)
    setDaysWithTimingData(timingDays)
  }, [day])

  const initialHydrateRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!initialHydrateRef.current) setReady(false)
        await seedIfEmpty()
        if (!cancelled) await load()
        if (!cancelled) {
          setReady(true)
          setError(null)
          initialHydrateRef.current = true
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setReady(true)
          initialHydrateRef.current = true
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  /** 桌面端：启动时将「小回顾弹窗」开关同步到主进程 */
  useEffect(() => {
    syncReflectPromptEnabledToDesktop(loadWorkRecordSettings())
  }, [])

  /** 桌面端：最小化回顾弹窗提交后写入本地列表（供后续日报等使用） */
  useEffect(() => {
    const d = typeof window !== 'undefined' ? window.ganshaleDesktop : undefined
    const off = d?.onSessionReflection?.((payload) => {
      const p = payload as Record<string, unknown>
      const text = typeof p.text === 'string' ? p.text.trim() : ''
      if (!text) return
      const app = typeof p.app === 'string' ? p.app : ''
      if (!app) return
      appendSessionReflection({
        savedAt: typeof p.savedAt === 'string' ? p.savedAt : new Date().toISOString(),
        text,
        tier: typeof p.tier === 'number' ? p.tier : 0,
        durationSec: typeof p.durationSec === 'number' ? p.durationSec : 0,
        durationLabel: typeof p.durationLabel === 'string' ? p.durationLabel : undefined,
        app,
        title: typeof p.title === 'string' ? p.title : '',
        appPath: typeof p.appPath === 'string' ? p.appPath : undefined,
        headline: typeof p.headline === 'string' ? p.headline : undefined,
        endedAt: typeof p.endedAt === 'string' ? p.endedAt : undefined,
      })
      appendManualWorkRecord(new Date(), text)
      try {
        window.dispatchEvent(new CustomEvent(WORK_RECORDS_UPDATED_EVENT))
      } catch {
        /* ignore */
      }
    })
    return () => {
      off?.()
    }
  }, [])

  /** Electron: poll foreground window → heartbeat → IndexedDB (aw-watcher-window style). */
  useEffect(() => {
    const d = typeof window !== 'undefined' ? window.ganshaleDesktop : undefined
    if (!d?.startWindowTracking || !ready) return

    let unsubscribe: () => void = () => {}
    let cancelled = false

    void (async () => {
      try {
        const sup = await d.windowTrackingSupported?.()
        if (cancelled) return
        setWindowTrackingSupported(Boolean(sup?.supported))
        if (!sup?.supported) {
          setWindowTrackingActive(false)
          return
        }
        const started = await d.startWindowTracking?.()
        if (cancelled) return
        if (!started?.ok) {
          setError(started?.error ?? '无法启动前台窗口采集')
          setWindowTrackingActive(false)
          return
        }
        setWindowTrackingActive(true)
        markHeartbeatSuccess()
        markTrackingPollSuccess()
        lastIndexedRefreshRef.current = Date.now()
        await load()

        const flushCountableForeground = async (sample: LiveForegroundSample) => {
          await heartbeatWindow(BUCKET_WINDOW, {
            app: sample.app,
            title: sample.title,
            ...(sample.appPath ? { appPath: sample.appPath } : {}),
          })
          splitNextCountableHeartbeatRef.current = true
          const now = Date.now()
          if (now - lastIndexedRefreshRef.current >= 800) {
            lastIndexedRefreshRef.current = now
            await load()
          }
        }

        const writeCountableHeartbeat = (sample: LiveForegroundSample, forceNew: boolean) => {
          void heartbeatWindow(
            BUCKET_WINDOW,
            {
              app: sample.app,
              title: sample.title,
              ...(sample.appPath ? { appPath: sample.appPath } : {}),
            },
            { forceNew },
          ).then(() => {
            const now = Date.now()
            if (now - lastIndexedRefreshRef.current >= 2000) {
              lastIndexedRefreshRef.current = now
              void load()
            }
          })
        }

        unsubscribe =
          d.onForegroundWindow?.((payload) => {
            if (cancelled || workdayTimerPausedRef.current) return
            markTrackingPollSuccess()

            if (!payload) {
              const prev = lastCountableForegroundRef.current
              lastCountableForegroundRef.current = null
              lastForegroundIdentityKeyRef.current = null
              setLiveForeground(null)
              if (prev) void flushCountableForeground(prev)
              return
            }

            const skipped = isWindowsExplorerApp(payload.app ?? '')

            if (skipped) {
              const prev = lastCountableForegroundRef.current
              lastCountableForegroundRef.current = null
              lastForegroundIdentityKeyRef.current = null
              setLiveForeground(payload)
              if (prev) void flushCountableForeground(prev)
              return
            }

            const identityKey = identityFromLiveForeground(payload).identityKey
            const identityChanged = identityKey !== lastForegroundIdentityKeyRef.current
            lastForegroundIdentityKeyRef.current = identityKey
            lastCountableForegroundRef.current = payload
            setLiveForeground(payload)

            const forceNew = splitNextCountableHeartbeatRef.current
            if (forceNew) splitNextCountableHeartbeatRef.current = false
            if (identityChanged || forceNew) {
              writeCountableHeartbeat(payload, forceNew)
            }
          }) ?? (() => {})
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setWindowTrackingActive(false)
        }
      }
    })()

    const heartbeatTick = window.setInterval(() => {
      if (cancelled || workdayTimerPausedRef.current) return
      const sample = lastCountableForegroundRef.current
      if (!sample) return
      void heartbeatWindow(BUCKET_WINDOW, {
        app: sample.app,
        title: sample.title,
        ...(sample.appPath ? { appPath: sample.appPath } : {}),
      }).then(() => {
        const now = Date.now()
        if (now - lastIndexedRefreshRef.current >= 2000) {
          lastIndexedRefreshRef.current = now
          void load()
        }
      })
    }, 5000)

    const watchdog = window.setInterval(() => {
      if (cancelled || workdayTimerPausedRef.current) return
      setRecordingHealthTick((t) => t + 1)
      if (!isHeartbeatStale(Date.now(), WINDOW_HEARTBEAT_STALE_MS)) return
      const now = Date.now()
      if (now - lastRecoveryAtRef.current < WINDOW_TRACKING_RECOVERY_COOLDOWN_MS) return
      lastRecoveryAtRef.current = now
      void (async () => {
        try {
          await d.stopWindowTracking?.()
          const started = await d.startWindowTracking?.()
          if (cancelled) return
          if (started?.ok) {
            splitNextCountableHeartbeatRef.current = true
            markTrackingPollSuccess()
          } else if (started?.error) {
            setError(started.error)
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : String(e))
          }
        }
      })()
    }, WINDOW_HEARTBEAT_WATCHDOG_MS)

    return () => {
      cancelled = true
      clearInterval(heartbeatTick)
      clearInterval(watchdog)
      unsubscribe()
      lastCountableForegroundRef.current = null
      lastForegroundIdentityKeyRef.current = null
      splitNextCountableHeartbeatRef.current = false
      resetHeartbeatHealth()
      void d.stopWindowTracking?.()
      setWindowTrackingActive(false)
      setLiveForeground(null)
    }
  }, [ready, load])

  useEffect(() => {
    return createLocalMidnightWatcher((detail) => {
      lastLocalYmdRef.current = detail.ymd
      const wasViewingToday = toYmdLocal(dayRef.current) === detail.prevYmd
      applyLocalMidnightRollover(detail)
      setCollectionPausedByUser(false)
      setWorkdayTimerPausedByUser(false)
      setTimerPausedAtMs(null)
      setWorkdayPauseIntervals([])
      workdayPauseStartMsRef.current = null
      clearWorkdayTimerPause()
      splitNextCountableHeartbeatRef.current = true
      if (wasViewingToday) {
        setDay(startOfLocalDay(new Date()))
      }
      void load()
    })
  }, [load])

  useEffect(() => {
    const onDataChanged = () => {
      invalidateMonthlyWindowEventsCache()
      setWorkdayTimerPausedByUser(false)
      setTimerPausedAtMs(null)
      setWorkdayPauseIntervals([])
      workdayPauseStartMsRef.current = null
      clearWorkdayTimerPause()
      clearWorkdayClockOutPersist()
      splitNextCountableHeartbeatRef.current = true
      void load()
    }
    window.addEventListener(APP_DATA_CHANGED_EVENT, onDataChanged)
    return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, onDataChanged)
  }, [load])

  const clockOutCollection = useCallback(() => {
    persistWorkdayClockOut()
    setCollectionPausedByUser(true)
  }, [])

  const resumeCollection = useCallback(() => {
    clearWorkdayClockOutPersist()
    setCollectionPausedByUser(false)
  }, [])

  const toggleWorkdayTimerPause = useCallback(() => {
    const at = Date.now()
    if (workdayTimerPausedRef.current) {
      if (workdayPauseStartMsRef.current != null) {
        setWorkdayPauseIntervals((prev) => [
          ...prev,
          { startMs: workdayPauseStartMsRef.current!, endMs: at },
        ])
      }
      workdayPauseStartMsRef.current = null
      setWorkdayTimerPausedByUser(false)
      setTimerPausedAtMs(null)
      clearWorkdayTimerPause()
      splitNextCountableHeartbeatRef.current = true
      void load()
      return
    }

    workdayPauseStartMsRef.current = at
    setWorkdayTimerPausedByUser(true)
    setTimerPausedAtMs(at)
    persistWorkdayTimerPause(at)
    splitNextCountableHeartbeatRef.current = true
    const sample = lastCountableForegroundRef.current
    if (sample) {
      void heartbeatWindow(BUCKET_WINDOW, {
        app: sample.app,
        title: sample.title,
        ...(sample.appPath ? { appPath: sample.appPath } : {}),
      }).then(() => load())
    }
  }, [load])

  const refresh = useCallback(async () => {
    invalidateMonthlyWindowEventsCache()
    await load()
  }, [load])

  const heartbeatDemo = useCallback(async () => {
    await heartbeatWindow(BUCKET_WINDOW, {
      app: 'Code.exe',
      title: `Ganshale · 演示心跳 ${new Date().toLocaleTimeString()}`,
    })
    await load()
  }, [load])

  const exportAll = useCallback(async () => {
    const payload = await store.buildExport()
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ganshale-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  const importFile = useCallback(
    async (file: File) => {
      const text = await file.text()
      const data = JSON.parse(text) as AwExportV1
      if (data?.format !== 'ganshale-aw-export' || data.version !== 1 || !data.buckets)
        throw new Error('文件格式不正确：需要 Ganshale AW 导出 JSON')
      await store.importExportPayload(data)
      notifyAppDataChanged()
    },
    [],
  )

  const clearAll = useCallback(async () => {
    await store.clearAllData()
    store.resetDbConnection()
    notifyAppDataChanged()
  }, [])

  const resetDemo = useCallback(async () => {
    await resetDemoData()
    await load()
  }, [load])

  const purgeElectronShellEvents = useCallback(async () => {
    const removed = await purgeElectronShellWindowEvents(BUCKET_WINDOW)
    await load()
    return removed
  }, [load])

  useEffect(() => {
    if (!ready) return
    clearWorkdayClockOutPersist()
    setCollectionPausedByUser(false)
  }, [ready])

  const value = useMemo(
    () => ({
      ready,
      error,
      day,
      setDay,
      buckets,
      windowEvents,
      windowEventsToday,
      webEvents,
      afkEvents,
      eventCount,
      refresh,
      heartbeatDemo,
      exportAll,
      importFile,
      clearAll,
      resetDemo,
      purgeElectronShellEvents,
      windowBucketId: BUCKET_WINDOW,
      liveForeground,
      windowTrackingActive,
      windowTrackingSupported,
      windowRecordingHealthy,
      collectionPausedByUser,
      clockOutCollection,
      resumeCollection,
      workdayTimerPausedByUser,
      timerPausedAtMs,
      getWorkdayPausedMs,
      toggleWorkdayTimerPause,
      daysWithTimingData,
    }),
    [
      ready,
      error,
      day,
      buckets,
      windowEvents,
      windowEventsToday,
      webEvents,
      afkEvents,
      eventCount,
      refresh,
      heartbeatDemo,
      exportAll,
      importFile,
      clearAll,
      resetDemo,
      purgeElectronShellEvents,
      liveForeground,
      windowTrackingActive,
      windowTrackingSupported,
      windowRecordingHealthy,
      collectionPausedByUser,
      clockOutCollection,
      resumeCollection,
      workdayTimerPausedByUser,
      timerPausedAtMs,
      getWorkdayPausedMs,
      toggleWorkdayTimerPause,
      daysWithTimingData,
    ],
  )

  return (
    <GanshaleDataContext.Provider value={value}>
      {children}
    </GanshaleDataContext.Provider>
  )
}
