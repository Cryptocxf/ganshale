const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
process.env.TZ = 'Asia/Shanghai'
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const originalLoad = Module._load
Module._load = function (id, parent, ...rest) { if (id.endsWith('/constants/brand')) return { APP_DISPLAY_NAME: '干啥了', APP_ENGLISH_NAME: 'Didly', BRAND_LOGO_APP_SRC:'./ganshale-logo-app.png', OPENCLAW_ICON_SRC:'./openclaw-favicon-32.png' }; return originalLoad.call(this, id, parent, ...rest) }
const { buildBrickDays, summarizeBricks, brickRows, brickGrade, brickClock, brickHours } = require('../src/lib/brickStats.ts')
const {BRICK_SPEECH_BANDS,brickCharacterSpeech}=require('../src/lib/brickCharacterSpeech.ts')
const {brickRestDay}=require('../src/lib/brickRestDay.ts')
for(const [date,name]of [['2026-01-01','元旦'],['2026-02-16','春节'],['2026-04-05','清明节'],['2026-05-01','劳动节'],['2026-06-19','端午节'],['2026-09-25','中秋节'],['2026-10-01','国庆节']]){
  assert.equal(brickRestDay(date).kind,'holiday');assert.ok(brickRestDay(date).label.includes(name))
}
for(const date of ['2026-01-04','2026-02-14','2026-02-28','2026-05-09','2026-09-20','2026-10-10'])assert.equal(brickRestDay(date).kind,'workday','makeup weekends do not glow blue')
assert.equal(brickRestDay('2026-11-14').kind,'weekend')
assert.equal(brickRestDay('2026-02-15').kind,'holiday','holiday beats Sunday')
assert.equal(brickRestDay('2026-11-13').kind,'workday')
assert.equal(brickRestDay('2027-01-01').kind,'unknown')
assert.equal(brickRestDay('2026-02-30').kind,'unknown')
let holidays=0
for(let d=new Date(2026,0,1);d.getFullYear()===2026;d.setDate(d.getDate()+1)){const key=`2026-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;if(brickRestDay(key).kind==='holiday')holidays++}
assert.equal(holidays,33,'all 33 announced holiday break dates are covered')
assert.equal(BRICK_SPEECH_BANDS.length,10)
assert.equal(new Set(BRICK_SPEECH_BANDS.map(b=>b.text)).size,10)
for(let i=0;i<10;i++){
  const band=BRICK_SPEECH_BANDS[i]
  assert.equal(brickCharacterSpeech(band.hours*3600,'month'),band.text)
  assert.equal(brickCharacterSpeech(band.hours*12*3600,'year'),band.text)
  if(i)assert.equal(brickCharacterSpeech(band.hours*3600-1,'month'),BRICK_SPEECH_BANDS[i-1].text)
}
assert.equal(brickCharacterSpeech(NaN,'month'),BRICK_SPEECH_BANDS[0].text)
assert.equal(brickCharacterSpeech(-3600,'month'),BRICK_SPEECH_BANDS[0].text)
const at = (d, h = 0, m = 0) => new Date(2026, 10, d, h, m)
const event = (id, date, seconds, app, session = false) => ({ id, bucket_id: 'window', timestamp: date.toISOString(), duration: seconds, data: { app, ...(session ? { kind: 'work-session', closed: true } : {}) } })
const cross = event('cross', at(1, 23), 2 * 3600, 'Code.exe')
const events = [event('session', at(1, 20), 7 * 3600, '工作会话', true), cross, cross, event('previous-month', new Date(2026, 9, 31, 23), 2 * 3600, '工作会话', true), event('self', at(3, 8), 3600, 'Ganshale.exe'), event('future', at(20, 8), 3600, 'Chrome.exe'), event('invalid', new Date('2026-11-01'), -20, 'Code.exe')]
const days = buildBrickDays(events, at(1), new Date(2026, 11, 1), at(14).getTime(), ['*'], () => '完成接口联调。')
assert.equal(days.length, 2)
assert.equal(days.reduce((sum, d) => sum + d.seconds, 0), 8 * 3600, 'sessions clipped at midnight and month boundary')
assert.deepEqual(days.map(d => d.apps), [[['VS Code', 3600]], [['VS Code', 3600]]], 'app aliases, no duplicate IDs or cross-day overcount')
const stats = summarizeBricks(days)
assert.equal(stats.longest.date, '2026-11-01')
assert.equal(stats.longestStreak, 2)
assert.equal(stats.apps[0][1], 7200)
assert.equal(brickClock(stats.latest.lastAt, stats.latest.date), '次日00:00')
assert.equal(brickGrade(3600), 0)
assert.equal(brickGrade(3601), 1)
assert.equal(brickGrade(12 * 3600), 11)
assert.equal(brickGrade(12 * 3600 + 1), 12)
assert.equal(brickHours(18), '不足1分')
for (let n = 0; n <= 366; n++) { const rows = brickRows(n); assert.equal(rows.reduce((a, b) => a + b, 0), n); assert.ok(rows.every((r, i) => r > 0 && (!i || rows[i - 1] > r))) }
assert.equal(summarizeBricks([]).total, 0)
assert.equal(summarizeBricks([]).earliest, undefined)
console.log('PASS: brick stats cross-midnight, month boundaries, duplicate IDs, self/future exclusion, grade thresholds, 0–366 layouts')
