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
  enqueueHeartbeat,
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
  const [windowTrackingPaused, setWindowTrackingPaused] = useState(false)
  const [recordingHealthTick, setRecordingHealthTick] = useState(0)
  const [collectionPausedByUser, setCollectionPausedByUser] = useState(false)
  const lastLocalYmdRef = useRef(toYmdLocal(new Date()))
  const lastIndexedRefreshRef = useRef(0)
  const lastCountableForegroundRef = useRef<LiveForegroundSample | null>(null)
  /** 离开可统计前台后，下次心跳须新开事件，避免把中间空白时间并入上一条 */
  const splitNextCountableHeartbeatRef = useRef(false)
  const dayRef = useRef(day)
  dayRef.current = day
  const lastRecoveryAtRef = useRef(0)
  const lastForegroundIdentityKeyRef = useRef<string | null>(null)
  const screenLockedRef = useRef(false)
  /** 只允许最近一次读取写入 state，避免旧 IDB 快照晚到后覆盖新事件。 */
  const loadRequestSeqRef = useRef(0)
  const loadInFlightRef = useRef<{ key: string; promise: Promise<void> } | null>(null)

  const windowRecordingHealthy = useMemo(() => {
    void recordingHealthTick
    if (!windowTrackingActive) return true
    return !isHeartbeatStale(Date.now(), WINDOW_HEARTBEAT_STALE_MS)
  }, [windowTrackingActive, recordingHealthTick])

  const load = useCallback(async () => {
    const loadKey = `${toYmdLocal(day)}:${toYmdLocal(new Date())}`
    if (loadInFlightRef.current?.key === loadKey) return loadInFlightRef.current.promise
    const requestSeq = ++loadRequestSeqRef.current
    const promise = (async () => {
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
    if (requestSeq !== loadRequestSeqRef.current) return
    setBuckets(b)
    setWindowEvents(w)
    setWindowEventsToday(dayIsToday ? w : wTodayIfNeeded)
    setWebEvents(web)
    setAfkEvents(afk)
    setEventCount(n)
    setDaysWithTimingData(timingDays)
    })()
    loadInFlightRef.current = { key: loadKey, promise }
    try {
      await promise
    } finally {
      if (loadInFlightRef.current?.promise === promise) loadInFlightRef.current = null
    }
  }, [day])

  const loadRef = useRef(load)
  loadRef.current = load

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
    let unsubLock: () => void = () => {}
    let unsubRecorded: () => void = () => {}
    let replayTimer: ReturnType<typeof setInterval> | undefined
    let replaying = false
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
        const applyPersistedEvent = (event: AwEvent) => {
          if (cancelled) return
          const ymd = toYmdLocal(new Date(event.timestamp))
          const upsert = (rows: AwEvent[]) => {
            const index = rows.findIndex((row) => row.id === event.id)
            if (index < 0) return [...rows, event]
            const next = [...rows]
            const previous = rows[index]
            next[index] = previous.duration > event.duration || (previous.duration === event.duration && previous.data.closed && !event.data.closed) ? previous : event
            return next
          }
          if (ymd === toYmdLocal(dayRef.current)) setWindowEvents(upsert)
          if (ymd === toYmdLocal(new Date())) setWindowEventsToday(upsert)
          setDaysWithTimingData((days) => days.has(ymd) ? days : new Set([...days, ymd]))
        }

        const persistRecordedEvents = async (events: AwEvent[]) => {
          await enqueueHeartbeat(() => store.putRecordedWindowEvents(events))
          if (cancelled) return
          for (const event of events) applyPersistedEvent(event)
          await d.acknowledgeRecordedWindowEvents?.(events)
        }
        const replayRecordedEvents = async () => {
          if (replaying || cancelled || !d.getRecordedWindowEvents) return
          replaying = true
          try {
            let more = true
            while (more && !cancelled) {
              const batch = await d.getRecordedWindowEvents()
              screenLockedRef.current = batch.state.paused
              setWindowTrackingPaused(batch.state.paused)
              if (batch.state.lastSessionAt) markTrackingPollSuccess(batch.state.lastSessionAt)
              if (batch.events.length) await persistRecordedEvents(batch.events)
              more = batch.events.length >= 500
            }
          } catch (error) {
            if (!cancelled) setError(`后台记录同步失败：${error instanceof Error ? error.message : String(error)}`)
          } finally { replaying = false }
        }
        if (d.onRecordedWindowEvents) {
          unsubRecorded = d.onRecordedWindowEvents((events) => {
            void persistRecordedEvents(events).catch((error) => { if (!cancelled) setError(`窗口记录写入失败：${String(error)}`) })
          })
          replayTimer = setInterval(() => void replayRecordedEvents(), 5000)
          void replayRecordedEvents()
        }

        const flushCountableForeground = async (sample: LiveForegroundSample) => {
          splitNextCountableHeartbeatRef.current = true
          const observedAtMs = Date.parse(sample.capturedAt)
          try {
          const event = await heartbeatWindow(BUCKET_WINDOW, {
            app: sample.app,
            title: sample.title,
            ...(sample.appPath ? { appPath: sample.appPath } : {}),
          }, { observedAtMs })
          applyPersistedEvent(event)
          } catch (error) {
            if (!cancelled) setError(`窗口记录写入失败：${error instanceof Error ? error.message : String(error)}`)
          }
        }

        const writeCountableHeartbeat = (sample: LiveForegroundSample, forceNew: boolean) => {
          const observedAtMs = Date.parse(sample.capturedAt)
          void heartbeatWindow(
            BUCKET_WINDOW,
            {
              app: sample.app,
              title: sample.title,
              ...(sample.appPath ? { appPath: sample.appPath } : {}),
            },
            { forceNew, observedAtMs },
          ).then((event) => {
            applyPersistedEvent(event)
            const now = Date.now()
            if (now - lastIndexedRefreshRef.current >= 10_000) {
              lastIndexedRefreshRef.current = now
              void loadRef.current()
            }
          }).catch((error) => {
            if (!cancelled) setError(`窗口记录写入失败：${error instanceof Error ? error.message : String(error)}`)
          })
        }

        unsubscribe =
          d.onForegroundWindow?.((payload) => {
            if (cancelled) return
            markTrackingPollSuccess()
            // 主进程锁屏期间不发送采样；收到新采样说明已恢复，修复漏收解锁通知后的永久暂停。
            if (screenLockedRef.current && payload) {
              screenLockedRef.current = false
              setWindowTrackingPaused(false)
              splitNextCountableHeartbeatRef.current = true
            }

            if (!payload) {
              const prev = lastCountableForegroundRef.current
              lastCountableForegroundRef.current = null
              lastForegroundIdentityKeyRef.current = null
              setLiveForeground(null)
              if (prev) void flushCountableForeground(prev)
              return
            }

            if (d.getRecordedWindowEvents) {
              // 新版由主进程独立落盘，此处仅更新前台显示，不再重复生成另一份窗口事件。
              lastCountableForegroundRef.current = null
              setLiveForeground(payload)
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
            const prevCountable = lastCountableForegroundRef.current

            if (identityChanged && prevCountable) {
              void flushCountableForeground(prevCountable)
            }

            lastForegroundIdentityKeyRef.current = identityKey
            lastCountableForegroundRef.current = payload
            setLiveForeground(payload)

            const forceNew = splitNextCountableHeartbeatRef.current
            if (forceNew) splitNextCountableHeartbeatRef.current = false
            // Persist every main-process observation. Renderer timers can be throttled while
            // the packaged app is hidden in the tray, but sampled IPC timestamps stay reliable.
            writeCountableHeartbeat(payload, identityChanged || forceNew)
          }) ?? (() => {})

        // 监听屏幕锁屏：锁屏时 flush 当前前台段并暂停心跳；解锁时恢复。
        unsubLock = d.onScreenLockChange?.((locked) => {
          if (cancelled) return
          screenLockedRef.current = locked
          setWindowTrackingPaused(locked)
          if (locked) {
            // 锁屏：flush 当前前台段，清空状态
            const prev = lastCountableForegroundRef.current
            lastCountableForegroundRef.current = null
            lastForegroundIdentityKeyRef.current = null
            setLiveForeground(null)
            if (prev) void flushCountableForeground(prev)
            // 重置健康检测，防止看门狗误触发
            markHeartbeatSuccess()
            markTrackingPollSuccess()
          } else {
            // 解锁：恢复健康状态，心跳 tick 会自动恢复写入
            markHeartbeatSuccess()
            markTrackingPollSuccess()
            lastRecoveryAtRef.current = Date.now()
          }
        }) ?? (() => {})
        // 先订阅再启动采样，不能在两者之间等待一次数据库刷新而漏掉前台事件。
        const started = await d.startWindowTracking?.()
        if (cancelled) return
        if (!started?.ok) {
          setError(started?.error ?? '无法启动前台窗口采集')
          setWindowTrackingActive(false)
          return
        }
        setWindowTrackingActive(true)
        setWindowTrackingPaused(false)
        markHeartbeatSuccess()
        markTrackingPollSuccess()
        lastIndexedRefreshRef.current = Date.now()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setWindowTrackingActive(false)
        }
      }
    })()

    const watchdog = window.setInterval(() => {
      if (cancelled) return
      if (screenLockedRef.current) return
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
      clearInterval(watchdog)
      unsubscribe()
      unsubLock()
      unsubRecorded()
      if (replayTimer) clearInterval(replayTimer)
      lastCountableForegroundRef.current = null
      lastForegroundIdentityKeyRef.current = null
      splitNextCountableHeartbeatRef.current = false
      resetHeartbeatHealth()
      void d.stopWindowTracking?.()
      setWindowTrackingActive(false)
      setWindowTrackingPaused(false)
      setLiveForeground(null)
    }
  }, [ready])

  useEffect(() => {
    return createLocalMidnightWatcher((detail) => {
      lastLocalYmdRef.current = detail.ymd
      const wasViewingToday = toYmdLocal(dayRef.current) === detail.prevYmd
      applyLocalMidnightRollover(detail)
      setCollectionPausedByUser(false)
      splitNextCountableHeartbeatRef.current = true
      if (wasViewingToday) {
        setDay(startOfLocalDay(new Date()))
      }
      void load()
    })
  }, [load])

  useEffect(() => {
    const onDataChanged = () => {
      void window.ganshaleDesktop?.resetRecordingSegment?.()
      invalidateMonthlyWindowEventsCache()
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

  const refresh = useCallback(async () => {
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
      windowTrackingPaused,
      windowRecordingHealthy,
      collectionPausedByUser,
      clockOutCollection,
      resumeCollection,
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
      windowTrackingPaused,
      windowRecordingHealthy,
      collectionPausedByUser,
      clockOutCollection,
      resumeCollection,
      daysWithTimingData,
    ],
  )

  return (
    <GanshaleDataContext.Provider value={value}>
      {children}
    </GanshaleDataContext.Provider>
  )
}
