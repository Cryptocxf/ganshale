import type { AwEvent } from './awTypes'
import { enqueueHeartbeat } from './heartbeatQueue'
import * as store from './idbStore'

function endMs(ev: AwEvent): number {
  return new Date(ev.timestamp).getTime() + ev.duration * 1000
}

function sameWindowPayload(a: Record<string, unknown>, b: Record<string, unknown>) {
  return String(a.app ?? '') === String(b.app ?? '') &&
    String(a.title ?? '') === String(b.title ?? '')
}

export type HeartbeatWindowOptions = {
  pulsetime?: number
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
  const now = Date.now()
  const last = await store.getLastEvent(bucketId)
  if (
    !options.forceNew &&
    last &&
    sameWindowPayload(last.data, data) &&
    now - endMs(last) <= pulsetime * 1000
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
