import { createContext } from 'react'
import type { AwBucket, AwEvent } from '../lib/awTypes'
import type { LiveForegroundSample } from '../lib/liveForeground'

export interface GanshaleDataContextValue {
  ready: boolean
  error: string | null
  day: Date
  setDay: (d: Date) => void
  buckets: AwBucket[]
  windowEvents: AwEvent[]
  webEvents: AwEvent[]
  afkEvents: AwEvent[]
  eventCount: number
  refresh: () => Promise<void>
  heartbeatDemo: () => Promise<void>
  exportAll: () => Promise<void>
  importFile: (file: File) => Promise<void>
  clearAll: () => Promise<void>
  resetDemo: () => Promise<void>
  /** 清理 electron / 本应用窗口的历史片段，返回删除条数 */
  purgeElectronShellEvents: () => Promise<number>
  windowBucketId: string
  /** 本地「今天」的窗口事件（与所选日期无关；用于今日打工时长快照等） */
  windowEventsToday: AwEvent[]
  /** Latest foreground sample from desktop tracker (Electron only). */
  liveForeground: LiveForegroundSample | null
  windowTrackingActive: boolean
  windowTrackingSupported: boolean
  windowTrackingPaused: boolean
  /** 今日窗口事件近期是否成功写入本地库（与主进程 poll 解耦） */
  windowRecordingHealthy: boolean
  /** 预留：用户主动停止采集 */
  collectionPausedByUser: boolean
  clockOutCollection: () => void
  resumeCollection: () => void
  /** 本地库中曾有窗口计时数据的日历日（`YYYY-MM-DD`） */
  daysWithTimingData: ReadonlySet<string>
}

export const GanshaleDataContext = createContext<GanshaleDataContextValue | null>(
  null,
)
