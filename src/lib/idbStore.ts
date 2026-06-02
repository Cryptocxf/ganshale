import type { AwBucket, AwEvent, AwExportV1 } from './awTypes'
import { toYmdLocal } from './timeutil'

const DB_NAME = 'ganshale_aw'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

/** 清空或切换存储分区后丢弃缓存连接，下次读取会重新 open。 */
export function resetDbConnection(): void {
  dbPromise = null
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('buckets')) {
          db.createObjectStore('buckets', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('events')) {
          const ev = db.createObjectStore('events', { keyPath: 'id' })
          ev.createIndex('by_bucket', 'bucket_id', { unique: false })
          ev.createIndex('by_bucket_time', ['bucket_id', 'timestamp'], {
            unique: false,
          })
        }
      }
    })
  }
  return dbPromise
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function getAllBuckets(): Promise<AwBucket[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('buckets', 'readonly')
    const req = tx.objectStore('buckets').getAll()
    req.onsuccess = () => resolve(req.result as AwBucket[])
    req.onerror = () => reject(req.error)
  })
}

export async function putBucket(bucket: AwBucket): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('buckets', 'readwrite')
  tx.objectStore('buckets').put(bucket)
  await txDone(tx)
}

export async function getEventsInRange(
  bucketId: string,
  startIso: string,
  endIso: string,
): Promise<AwEvent[]> {
  const db = await openDb()
  const t0 = new Date(startIso).getTime()
  const t1 = new Date(endIso).getTime()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly')
    const idx = tx.objectStore('events').index('by_bucket_time')
    const out: AwEvent[] = []
    const range = IDBKeyRange.bound([bucketId, startIso], [bucketId, endIso])
    const req = idx.openCursor(range)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const cur = req.result
      if (!cur) {
        resolve(out)
        return
      }
      const ev = cur.value as AwEvent
      const ts = new Date(ev.timestamp).getTime()
      if (ts >= t0 && ts <= t1) out.push(ev)
      cur.continue()
    }
  })
}

export async function getAllEventsForBucket(
  bucketId: string,
): Promise<AwEvent[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly')
    const idx = tx.objectStore('events').index('by_bucket')
    const acc: AwEvent[] = []
    const req = idx.openCursor(IDBKeyRange.only(bucketId))
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const cur = req.result
      if (!cur) {
        acc.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )
        resolve(acc)
        return
      }
      acc.push(cur.value as AwEvent)
      cur.continue()
    }
  })
}

/** 窗口事件曾出现的本地日历日（`YYYY-MM-DD`），用于日期选择器标注 */
export async function getDistinctWindowEventLocalDays(
  bucketId: string,
): Promise<Set<string>> {
  const events = await getAllEventsForBucket(bucketId)
  const days = new Set<string>()
  for (const ev of events) {
    if (!ev.timestamp) continue
    const t = new Date(ev.timestamp).getTime()
    if (Number.isNaN(t)) continue
    days.add(toYmdLocal(new Date(t)))
  }
  return days
}

/** 取 bucket 内时间最新的一条（走复合索引，避免全表扫描） */
export async function getLastEvent(bucketId: string): Promise<AwEvent | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly')
    const idx = tx.objectStore('events').index('by_bucket_time')
    const range = IDBKeyRange.bound([bucketId, ''], [bucketId, '\uffff'])
    const req = idx.openCursor(range, 'prev')
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const cur = req.result
      resolve(cur ? (cur.value as AwEvent) : null)
    }
  })
}

export async function putEvent(ev: AwEvent): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('events', 'readwrite')
  tx.objectStore('events').put(ev)
  await txDone(tx)
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('events', 'readwrite')
  tx.objectStore('events').delete(id)
  await txDone(tx)
}

export async function countEvents(): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly')
    const req = tx.objectStore('events').count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteEventsInRange(
  bucketId: string,
  startIso: string,
  endIso: string,
): Promise<number> {
  const events = await getEventsInRange(bucketId, startIso, endIso)
  if (events.length === 0) return 0
  const db = await openDb()
  const tx = db.transaction('events', 'readwrite')
  const eStore = tx.objectStore('events')
  for (const ev of events) eStore.delete(ev.id)
  await txDone(tx)
  return events.length
}

export async function clearAllData(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['buckets', 'events'], 'readwrite')
  tx.objectStore('buckets').clear()
  tx.objectStore('events').clear()
  await txDone(tx)
}

export async function importExportPayload(payload: AwExportV1): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['buckets', 'events'], 'readwrite')
  const bStore = tx.objectStore('buckets')
  const eStore = tx.objectStore('events')
  for (const b of Object.values(payload.buckets)) {
    const { events, ...meta } = b
    bStore.put({
      id: meta.id,
      type: meta.type,
      client: meta.client,
      hostname: meta.hostname,
      created: meta.created,
      data: meta.data,
    } satisfies AwBucket)
    for (const e of events) {
      eStore.put({
        id: e.id,
        bucket_id: meta.id,
        timestamp: e.timestamp,
        duration: e.duration,
        data: e.data,
      } satisfies AwEvent)
    }
  }
  await txDone(tx)
}

export async function buildExport(): Promise<AwExportV1> {
  const buckets = await getAllBuckets()
  const db = await openDb()
  const allEvents = await new Promise<AwEvent[]>((resolve, reject) => {
    const tx = db.transaction('events', 'readonly')
    const req = tx.objectStore('events').getAll()
    req.onsuccess = () => resolve(req.result as AwEvent[])
    req.onerror = () => reject(req.error)
  })
  const byBucket = new Map<string, AwEvent[]>()
  for (const ev of allEvents) {
    const list = byBucket.get(ev.bucket_id) ?? []
    list.push(ev)
    byBucket.set(ev.bucket_id, list)
  }
  const out: AwExportV1['buckets'] = {}
  for (const b of buckets) {
    const events = (byBucket.get(b.id) ?? []).map(
      ({ id, timestamp, duration, data }) => ({ id, timestamp, duration, data }),
    )
    events.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    out[b.id] = { ...b, events }
  }
  return {
    format: 'ganshale-aw-export',
    version: 1,
    exported_at: new Date().toISOString(),
    buckets: out,
  }
}
