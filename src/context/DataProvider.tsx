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
  hasTodayClockOutPersisted,
  persistWorkdayClockOut,
} from '../lib/clientSessionClock'
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
import { appendSessionReflection } from '../lib/sessionReflectionsStore'
import {
  isGanshaleSelfWindowRecord,
  isWindowsExplorerApp,
} from '../lib/selfWindowFilter'
import { purgeElectronShellWindowEvents } from '../lib/purgeElectronEvents'

import type { LiveForegroundSample } from '../lib/liveForeground'

const ELECTRON_PURGE_DONE_KEY = 'ganshale-purged-electron-v1'

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
  const [collectionPausedByUser, setCollectionPausedByUser] = useState(hasTodayClockOutPersisted)
  const lastLocalYmdRef = useRef(toYmdLocal(new Date()))
  const lastIndexedRefreshRef = useRef(0)
  const lastCountableForegroundRef = useRef<LiveForegroundSample | null>(null)
  /** 离开可统计前台后，下次心跳须新开事件，避免把中间空白时间并入上一条 */
  const splitNextCountableHeartbeatRef = useRef(false)
  const dayRef = useRef(day)
  dayRef.current = day

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
    })
    return () => {
      off?.()
    }
  }, [])

  /** Electron: poll foreground window → heartbeat → IndexedDB (aw-watcher-window style). */
  useEffect(() => {
    const d = typeof window !== 'undefined' ? window.ganshaleDesktop : undefined
    if (!d?.startWindowTracking || !ready) return

    if (collectionPausedByUser) {
      void d.stopWindowTracking?.()
      setWindowTrackingActive(false)
      setLiveForeground(null)
      return
    }

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

        unsubscribe =
          d.onForegroundWindow?.((payload) => {
            if (cancelled) return
            if (!payload) {
              const prev = lastCountableForegroundRef.current
              lastCountableForegroundRef.current = null
              setLiveForeground(null)
              if (prev) void flushCountableForeground(prev)
              return
            }

            const skipped =
              isGanshaleSelfWindowRecord(
                payload.app,
                payload.title,
                payload.appPath,
              ) || isWindowsExplorerApp(payload.app ?? '')

            if (skipped) {
              const prev = lastCountableForegroundRef.current
              lastCountableForegroundRef.current = null
              setLiveForeground(payload)
              if (prev) void flushCountableForeground(prev)
              return
            }

            lastCountableForegroundRef.current = payload
            setLiveForeground(payload)
            void (async () => {
              const forceNew = splitNextCountableHeartbeatRef.current
              splitNextCountableHeartbeatRef.current = false
              await heartbeatWindow(
                BUCKET_WINDOW,
                {
                  app: payload.app,
                  title: payload.title,
                  ...(payload.appPath ? { appPath: payload.appPath } : {}),
                },
                { forceNew },
              )
              const now = Date.now()
              if (now - lastIndexedRefreshRef.current >= 2000) {
                lastIndexedRefreshRef.current = now
                await load()
              }
            })()
          }) ?? (() => {})
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setWindowTrackingActive(false)
        }
      }
    })()

    return () => {
      cancelled = true
      unsubscribe()
      lastCountableForegroundRef.current = null
      splitNextCountableHeartbeatRef.current = false
      void d.stopWindowTracking?.()
      setWindowTrackingActive(false)
      setLiveForeground(null)
    }
  }, [ready, load, collectionPausedByUser])

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
      await load()
    },
    [load],
  )

  const clearAll = useCallback(async () => {
    await store.clearAllData()
    await load()
  }, [load])

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
    if (localStorage.getItem(ELECTRON_PURGE_DONE_KEY)) return
    void (async () => {
      try {
        const removed = await purgeElectronShellWindowEvents(BUCKET_WINDOW)
        localStorage.setItem(ELECTRON_PURGE_DONE_KEY, '1')
        if (removed > 0) await load()
      } catch {
        /* ignore */
      }
    })()
  }, [ready, load])

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
