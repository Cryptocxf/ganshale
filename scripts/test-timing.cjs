const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')

// Exercise production calculation and heartbeat code without opening the user's database.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, filename)
const savedEvents = []
const originalLoad = Module._load
Module._load = function (id, parent, ...rest) {
  if (id.endsWith('/constants/brand')) return { APP_DISPLAY_NAME: '干啥了' }
  if (id === './idbStore' && parent.filename.endsWith('heartbeat.ts')) {
    return {
      getLastEvent: async () => savedEvents.at(-1),
      putEvent: async (event) => {
        const index = savedEvents.findIndex((row) => row.id === event.id)
        if (index < 0) savedEvents.push(event)
        else savedEvents[index] = event
      },
    }
  }
  return originalLoad.call(this, id, parent, ...rest)
}

const { totalActiveSecondsWindowLive, timelineFromWindowEventsLive, currentForegroundSegmentLive } = require('../src/lib/aggregations.ts')
const { officeElapsedForDay, sumOfficeElapsedForWeek, sumOfficeElapsedForMonthThrough } = require('../src/lib/officeElapsed.ts')
const { useMonotonicOfficeSec } = require('../src/hooks/useMonotonicOfficeSec.ts')
const { heartbeatWindow } = require('../src/lib/heartbeat.ts')
const { startOfWeekMondayLocal } = require('../src/lib/timeutil.ts')
const day = new Date(2026, 9, 27)
const at = (hour, minute = 0, second = 0) => new Date(2026, 9, 27, hour, minute, second).getTime()
const event = (id, start, duration, app = 'Code.exe') => ({ id, bucket_id: 'window', timestamp: new Date(start).toISOString(), duration, data: { app, title: app } })
const history = [event('morning', at(9), 60)]
const live = { app: 'Chrome.exe', title: 'Chrome.exe', capturedAt: new Date(at(16)).toISOString(), segmentStartedAt: new Date(at(16)).toISOString() }

async function main() {
  assert.equal(totalActiveSecondsWindowLive(day, history, null, at(16), true), 60, 'startup must not fill inactive morning-to-afternoon gap')
  assert.equal(totalActiveSecondsWindowLive(day, history, live, at(16, 0, 3), true), 63, 'fresh foreground increments')
  assert.equal(totalActiveSecondsWindowLive(day, history, live, at(17), true), 65, 'lost sampling cannot extrapolate for an hour')
  assert.equal(useMonotonicOfficeSec(63, true, 'today'), 63)
  assert.equal(useMonotonicOfficeSec(60, true, 'today'), 60, 'incorrect peak cannot freeze subsequent correct readings')
  const resumed = { ...live, capturedAt: new Date(at(17)).toISOString(), segmentStartedAt: new Date(at(17)).toISOString() }
  assert.equal(totalActiveSecondsWindowLive(day, history, resumed, at(17, 0, 2), true), 62, 'resume excludes inactive gap')
  const tracked = [...history, event('afternoon', at(16), 2, 'Chrome.exe')]
  const context = { patterns: ['Code.exe'], live, nowMs: at(16, 0, 3), extrapolateLive: true }
  assert.equal(officeElapsedForDay(day, tracked, context), 63)
  assert.equal(sumOfficeElapsedForWeek(startOfWeekMondayLocal(day), tracked, context), 63, 'week matches daily calculation')
  assert.equal(sumOfficeElapsedForMonthThrough([day], tracked, context), 63, 'month matches daily calculation')
  assert.equal(officeElapsedForDay(day, tracked, { ...context, extrapolateLive: false }), 62, 'historical and live totals use the same application scope')
  const timeline = timelineFromWindowEventsLive(day, tracked, live, at(17), true)
  assert.ok(timeline.at(-1).endMin <= 16 * 60 + 5 / 60, 'timeline stops extrapolating stale sample')
  assert.equal(currentForegroundSegmentLive(tracked, live, at(17), true).seconds, 5)
  const changedTitle = [...history, event('title-one', at(16), 60, 'Chrome.exe'), event('title-two', at(16, 1), 2, 'Chrome.exe')]
  const continuous = { ...live, capturedAt: new Date(at(16, 1, 2)).toISOString() }
  assert.equal(currentForegroundSegmentLive(changedTitle, continuous, at(16, 1, 3), true).seconds, 3, 'one row must not repeat earlier titles in same application')
  const overnight = event('overnight', new Date(2026, 9, 26, 23, 59, 50).getTime(), 20)
  assert.equal(officeElapsedForDay(day, [overnight], { patterns: [], nowMs: at(16), extrapolateLive: false }), 10, 'midnight clips time to selected day')

  const data = { app: 'Code.exe', title: 'editing' }
  await heartbeatWindow('window', data, { observedAtMs: at(9) })
  await heartbeatWindow('window', data, { observedAtMs: at(9) + 1200 })
  await heartbeatWindow('window', data, { observedAtMs: at(9) + 1200 })
  await heartbeatWindow('window', data, { observedAtMs: at(9) + 2400 })
  assert.equal(savedEvents.length, 1, 'duplicate flush does not create zero-length events')
  assert.equal(savedEvents[0].duration, 2.4, 'preserve subsecond precision')
  await heartbeatWindow('window', data, { observedAtMs: at(10), forceNew: true })
  assert.equal(savedEvents.length, 2, 'resume starts separate event')
  console.log('PASS: startup, live increment, lost sampling, peak correction, resume, daily/week/month consistency, timeline, midnight and heartbeat persistence')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
