import type { AwEvent } from './awTypes'
import { enqueueHeartbeat } from './heartbeatQueue'
import * as store from './idbStore'
import { toYmdLocal } from './timeutil'

function endMs(ev: AwEvent): number {
  return new Date(ev.timestamp).getTime() + ev.duration * 1000
}

function sameWindowPayload(a: Record<string, unknown>, b: Record<string, unknown>) {
  return String(a.app ?? '') === String(b.app ?? '') &&
    String(a.title ?? '') === String(b.title ?? '')
}

export type HeartbeatWindowOptions = {
  pulsetime?: number
  /** The main-process sample time. This keeps delayed renderer IPC from shifting tracked time. */
  observedAtMs?: number
  /** 不与上一条合并（例如中间聚焦过本应用/资源管理器后再回到同一应用） */
  forceNew?: boolean
}

/**
 * Mirrors aw-server heartbeat merge: extend last event when payload matches
 * and the gap since its end is within pulsetime.
 */
async function heartbeatWindowInner(
  bucketId: string,
  data: { app: string; title: string; appPath?: string },
  options: HeartbeatWindowOptions = {},
): Promise<void> {
  const pulsetime = options.pulsetime ?? 20
  const requestedAt = options.observedAtMs ?? Date.now()
  const now = Number.isFinite(requestedAt) ? Math.floor(requestedAt) : Date.now()
  const last = await store.getLastEvent(bucketId)
  const lastEnd = last ? endMs(last) : 0
  const lastStart = last ? new Date(last.timestamp).getTime() : Number.NaN
  const sameLocalDay =
    Number.isFinite(lastStart) &&
    toYmdLocal(new Date(lastStart)) === toYmdLocal(new Date(now))
  if (
    !options.forceNew &&
    last &&
    sameLocalDay &&
    sameWindowPayload(last.data, data) &&
    now >= lastEnd &&
    now - lastEnd <= pulsetime * 1000
  ) {
    const start = new Date(last.timestamp).getTime()
    const newDur = Math.max(0, Math.round((now - start) / 1000))
    await store.putEvent({
      ...last,
      duration: newDur,
    })
    return
  }
  await store.putEvent({
    id: crypto.randomUUID(),
    bucket_id: bucketId,
    timestamp: new Date(now).toISOString(),
    duration: 0,
    data: { ...data },
  })
}

/** 串行写库；成功后会更新 `getHeartbeatHealth().lastSuccessAtMs` */
export function heartbeatWindow(
  bucketId: string,
  data: { app: string; title: string; appPath?: string },
  options: HeartbeatWindowOptions = {},
): Promise<void> {
  return enqueueHeartbeat(() => heartbeatWindowInner(bucketId, data, options))
}
