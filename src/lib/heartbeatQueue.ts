/** 串行执行窗口心跳写库，避免并发 IndexedDB 事务堆积 */

let chain: Promise<void> = Promise.resolve()

let lastSuccessAtMs = 0
/** 主进程前台轮询仍正常（含资源管理器），与是否写入窗口事件解耦 */
let lastPollAtMs = 0
let lastErrorAtMs = 0
let lastErrorMessage = ''

export type HeartbeatHealth = {
  lastSuccessAtMs: number
  lastPollAtMs: number
  lastErrorAtMs: number
  lastErrorMessage: string
}

export function getHeartbeatHealth(): HeartbeatHealth {
  return {
    lastSuccessAtMs,
    lastPollAtMs,
    lastErrorAtMs,
    lastErrorMessage,
  }
}

/** 前台轮询有响应时调用（Explorer / 无标题前台也计为采集中） */
export function markTrackingPollSuccess(atMs = Date.now()): void {
  lastPollAtMs = atMs
}

export function markHeartbeatSuccess(atMs = Date.now()): void {
  lastSuccessAtMs = atMs
  lastErrorMessage = ''
}

export function resetHeartbeatHealth(): void {
  lastSuccessAtMs = 0
  lastPollAtMs = 0
  lastErrorAtMs = 0
  lastErrorMessage = ''
  chain = Promise.resolve()
}

/** 距上次写库或上次前台轮询是否超过阈值（毫秒） */
export function isHeartbeatStale(nowMs: number, staleMs: number): boolean {
  const lastActivity = Math.max(lastSuccessAtMs, lastPollAtMs)
  if (lastActivity <= 0) return false
  return nowMs - lastActivity > staleMs
}

export function enqueueHeartbeat(task: () => Promise<void>): Promise<void> {
  const run = chain.then(async () => {
    try {
      await task()
      markHeartbeatSuccess()
    } catch (e) {
      lastErrorAtMs = Date.now()
      lastErrorMessage = e instanceof Error ? e.message : String(e)
      throw e
    }
  })
  chain = run.catch(() => {
    /* 错误已记录，链继续 */
  })
  return run
}
