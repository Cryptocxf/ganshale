import * as store from './idbStore'

const HOST = 'web-ganshale'

export const BUCKET_WINDOW = `aw-watcher-window_${HOST}`
export const BUCKET_AFK = `aw-watcher-afk_${HOST}`
export const BUCKET_WEB = `aw-watcher-web_${HOST}`

export function seedIfEmpty(): Promise<boolean> {
  return Promise.resolve(false)
}

export async function resetDemoData(): Promise<void> {
  await store.clearAllData()
}
