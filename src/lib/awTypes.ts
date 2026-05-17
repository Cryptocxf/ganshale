/** ActivityWatch-compatible shapes (subset for Ganshale web POC). */

export interface AwBucket {
  id: string
  type: string
  client: string
  hostname: string
  created: string
  data?: Record<string, unknown>
}

export interface AwEvent {
  id: string
  bucket_id: string
  timestamp: string
  duration: number
  data: Record<string, unknown>
}

export interface AwExportV1 {
  format: 'ganshale-aw-export'
  version: 1
  exported_at: string
  buckets: Record<
    string,
    {
      id: string
      type: string
      client: string
      hostname: string
      created: string
      data?: Record<string, unknown>
      events: Omit<AwEvent, 'bucket_id'>[]
    }
  >
}

export type WindowWatcherData = {
  app?: string
  title?: string
  /** 可执行文件完整路径（Electron 前台采集） */
  appPath?: string
}

export type AfkWatcherData = {
  status?: 'afk' | 'not-afk'
}

export type WebWatcherData = {
  url?: string
  title?: string
}
