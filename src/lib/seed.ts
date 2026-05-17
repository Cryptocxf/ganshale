import type { AwBucket, AwEvent } from './awTypes'
import { endOfLocalDay, startOfLocalDay } from './timeutil'
import * as store from './idbStore'

const HOST = 'web-ganshale'

export const BUCKET_WINDOW = `aw-watcher-window_${HOST}`
export const BUCKET_AFK = `aw-watcher-afk_${HOST}`
export const BUCKET_WEB = `aw-watcher-web_${HOST}`

function iso(d: Date): string {
  return d.toISOString()
}

function addMin(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000)
}

let seedGate: Promise<void> = Promise.resolve()

export function seedIfEmpty(): Promise<boolean> {
  const run = seedGate.then(async () => {
    const buckets = await store.getAllBuckets()
    if (buckets.length > 0) return false
    await writeDemoSeed()
    return true
  })
  seedGate = run.then(() => {}).catch(() => {})
  return run
}

export async function resetDemoData(): Promise<void> {
  await store.clearAllData()
  await writeDemoSeed()
}

async function writeDemoSeed(): Promise<void> {
  const now = new Date()
  const dayStart = startOfLocalDay(now)

  const baseBuckets: AwBucket[] = [
    {
      id: BUCKET_WINDOW,
      type: 'currentwindow',
      client: 'aw-watcher-window',
      hostname: HOST,
      created: iso(now),
    },
    {
      id: BUCKET_AFK,
      type: 'afkstatus',
      client: 'aw-watcher-afk',
      hostname: HOST,
      created: iso(now),
    },
    {
      id: BUCKET_WEB,
      type: 'web.tab',
      client: 'aw-watcher-web',
      hostname: HOST,
      created: iso(now),
    },
  ]

  for (const b of baseBuckets) await store.putBucket(b)

  const events: AwEvent[] = []

  const pushWin = (
    start: Date,
    durationSec: number,
    app: string,
    title: string,
  ) => {
    events.push({
      id: crypto.randomUUID(),
      bucket_id: BUCKET_WINDOW,
      timestamp: iso(start),
      duration: durationSec,
      data: { app, title },
    })
  }

  const pushAfk = (start: Date, durationSec: number, status: 'afk' | 'not-afk') => {
    events.push({
      id: crypto.randomUUID(),
      bucket_id: BUCKET_AFK,
      timestamp: iso(start),
      duration: durationSec,
      data: { status },
    })
  }

  const pushWeb = (
    start: Date,
    durationSec: number,
    url: string,
    title: string,
  ) => {
    events.push({
      id: crypto.randomUUID(),
      bucket_id: BUCKET_WEB,
      timestamp: iso(start),
      duration: durationSec,
      data: { url, title },
    })
  }

  let t = addMin(dayStart, 7 * 60 + 30)
  pushAfk(t, 45 * 60, 'not-afk')
  pushWin(t, 25 * 60, 'Code.exe', 'Ganshale · src/App.tsx')
  t = addMin(t, 25)
  pushWin(t, 40 * 60, 'Code.exe', 'Ganshale · src/components/Sidebar.tsx')
  t = addMin(t, 40)
  pushWin(t, 18 * 60, 'WindowsTerminal.exe', 'PowerShell — npm run dev')
  t = addMin(t, 18)
  pushAfk(t, 6 * 60, 'afk')
  t = addMin(t, 6)
  pushWin(t, 55 * 60, 'msedge.exe', 'GitHub — ActivityWatch/activitywatch')
  t = addMin(t, 55)
  pushWeb(
    addMin(t, -50 * 60),
    50 * 60,
    'https://github.com/ActivityWatch/activitywatch',
    'activitywatch/README.md',
  )
  pushWin(t, 35 * 60, 'Figma.exe', 'Dashboard — Overview frame')
  t = addMin(t, 35)
  pushWin(t, 22 * 60, 'OUTLOOK.EXE', 'Inbox — 周报草稿')
  t = addMin(t, 22)
  pushAfk(t, 12 * 60, 'not-afk')
  t = addMin(t, 12)
  pushWin(t, 48 * 60, 'Code.exe', 'Ganshale · IndexedDB storage')
  t = addMin(t, 48)
  pushWin(t, 15 * 60, 'msedge.exe', 'docs.activitywatch.net — Query')
  t = addMin(t, 15)
  pushWeb(
    addMin(t, -12 * 60),
    12 * 60,
    'https://docs.activitywatch.net/en/latest/',
    'ActivityWatch documentation',
  )
  pushWin(t, 30 * 60, 'explorer.exe', '下载 — activitywatch-v0.12')
  t = addMin(t, 30)
  pushAfk(t, 25 * 60, 'afk')
  t = addMin(t, 25)
  pushWin(t, 40 * 60, 'Code.exe', 'eslint — tailwind v4')
  t = addMin(t, 40)
  pushWin(t, 20 * 60, 'msedge.exe', 'localhost:5173 — Ganshale')
  t = addMin(t, 20)
  pushWeb(
    addMin(t, -18 * 60),
    18 * 60,
    'http://localhost:5173/',
    'Ganshale',
  )

  const end = endOfLocalDay(now)
  if (t < end) {
    pushWin(t, Math.min(45 * 60, (end.getTime() - t.getTime()) / 1000), 'Code.exe', '收尾与导出 JSON')
  }

  for (const e of events) await store.putEvent(e)
}
