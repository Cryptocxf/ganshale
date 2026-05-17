import type { AwEvent } from './awTypes'
import * as store from './idbStore'
import { isElectronShellApp } from './selfWindowFilter'

function shouldPurgeWindowEvent(ev: AwEvent): boolean {
  return isElectronShellApp(String(ev.data.app ?? ''))
}

/** 删除窗口桶中 electron 壳及本应用自身的全部历史事件 */
export async function purgeElectronShellWindowEvents(bucketId: string): Promise<number> {
  const events = await store.getAllEventsForBucket(bucketId)
  const ids = events.filter(shouldPurgeWindowEvent).map((ev) => ev.id)
  for (const id of ids) {
    await store.deleteEvent(id)
  }
  return ids.length
}
