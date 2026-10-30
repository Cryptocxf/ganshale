const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')

const BUCKET = 'aw-watcher-window_web-ganshale'
const SESSION_KIND = 'work-session'
const MAX_GAP_MS = 5000

/** 主进程持久化未被界面确认入库的事件，界面隐藏、暂停或重载都不丢记录。 */
function createWindowRecorder({ directory, now = Date.now, writeFile = null } = {}) {
  const filename = path.join(directory, 'window-recording-pending.json')
  let pending = new Map()
  let windowEvent = null
  let sessionEvent = null
  let lastWindowAt = 0
  let lastSessionAt = 0
  let paused = false
  let samples = 0
  try {
    const saved = JSON.parse(fs.readFileSync(filename, 'utf8'))
    pending = new Map((saved.events || []).map((event) => [event.id, event]))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const persist = () => {
    const content = JSON.stringify({ version: 1, events: [...pending.values()] })
    if (writeFile) { writeFile(content); return }
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(filename + '.tmp', content, 'utf8')
    fs.renameSync(filename + '.tmp', filename)
  }
  const save = (event) => { pending.set(event.id, event); return event }
  const newEvent = (at, data) => ({ id: 'desktop-' + randomUUID(), bucket_id: BUCKET, timestamp: new Date(at).toISOString(), duration: 0, data })
  const extend = (event, at, closed = false) => save({ ...event, duration: Math.max(event.duration, (at - Date.parse(event.timestamp)) / 1000), data: { ...event.data, observedAt: at, ...(closed ? { closed: true } : {}) } })
  const sameDay = (timestamp, at) => new Date(timestamp).toDateString() === new Date(at).toDateString()
  const midnight = (at) => { const date = new Date(at); date.setHours(0, 0, 0, 0); return date.getTime() }
  function tick(at = now()) {
    if (paused) return []
    const events = []
    let from = at
    if (sessionEvent && !sameDay(sessionEvent.timestamp, at)) {
      from = midnight(at)
      events.push(extend(sessionEvent, from, true))
      sessionEvent = null
    }
    if (!sessionEvent) {
      sessionEvent = newEvent(from, { kind: SESSION_KIND, app: '工作会话', title: '客户端运行且电脑未锁屏', observedAt: at })
    }
    lastSessionAt = at
    sessionEvent = extend(sessionEvent, at)
    persist()
    return [...events, sessionEvent]
  }
  function observe(sample, at = now()) {
    if (paused) return []
    samples++
    const app = String(sample?.app || '').toLowerCase().replace(/\.exe$/, '')
    const self = app === 'ganshale' || (app === 'electron' && /ganshale|干啥了/i.test(`${sample?.title || ''} ${sample?.appPath || ''}`))
    if (self) {
      const events = windowEvent ? [extend(windowEvent, Math.min(at, lastWindowAt + MAX_GAP_MS), true)] : []
      windowEvent = null
      lastWindowAt = 0
      if (events.length) persist()
      return events
    }
    if (!sample) { windowEvent = null; lastWindowAt = 0; return [] }
    const data = { app: sample.app, title: sample.title || '', ...(sample.appPath ? { appPath: sample.appPath } : {}) }
    const changed = !windowEvent || windowEvent.data.app !== data.app || windowEvent.data.title !== data.title || windowEvent.data.appPath !== data.appPath
    const events = []
    const contiguous = lastWindowAt && at - lastWindowAt <= MAX_GAP_MS
    const crossedMidnight = windowEvent && !sameDay(windowEvent.timestamp, at)
    if (changed || !contiguous || crossedMidnight) {
      const boundary = crossedMidnight ? midnight(at) : at
      if (windowEvent && contiguous) events.push(extend(windowEvent, boundary))
      windowEvent = newEvent(crossedMidnight && contiguous ? boundary : at, data)
    }
    lastWindowAt = at
    windowEvent = extend(windowEvent, at)
    events.push(windowEvent)
    persist()
    return events
  }
  function pause(at = now()) {
    paused = true
    const events = []
    if (windowEvent) events.push(extend(windowEvent, Math.min(at, lastWindowAt + MAX_GAP_MS)))
    if (sessionEvent) events.push(extend(sessionEvent, Math.min(at, lastSessionAt + MAX_GAP_MS), true))
    windowEvent = null
    sessionEvent = null
    persist()
    return events
  }
  return {
    tick, observe, pause,
    resume: () => { paused = false; windowEvent = null; sessionEvent = null },
    batch: (limit = 500) => [...pending.values()].slice(0, limit),
    acknowledge: (events) => {
      for (const event of events) {
        const current = pending.get(event.id)
        if (current && current.duration <= event.duration && (!current.data.closed || event.data?.closed)) pending.delete(event.id)
      }
      persist()
    },
    reset: () => { pending.clear(); windowEvent = null; sessionEvent = null; persist() },
    state: () => ({ paused, samples, lastSampleAt: lastWindowAt, lastSessionAt, pending: pending.size }),
  }
}
module.exports = { createWindowRecorder }
