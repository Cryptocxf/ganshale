const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, filename)
const data = new Map()
global.window = { dispatchEvent() {} }
global.localStorage = { getItem: k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v) }
global.CustomEvent = class {}
const schedule = require('../src/lib/dailyReportAutoSchedule.ts')
const settings = require('../src/lib/reportScheduleSettings.ts')
settings.saveReportScheduleSettings({...settings.defaultReportScheduleSettings(),dailyReportAutoEnabled:true,dailyReportHour:18})
const day = new Date(2026,10,12)
assert.equal(schedule.shouldFireAutoDailyReport(day,new Date(2026,10,12,17,59),[]).fire,false)
const due = schedule.shouldFireAutoDailyReport(day,new Date(2026,10,12,19,20),[])
assert.equal(due.fire,true,'waking after 18:02 catches up')
assert.equal(schedule.claimAutoDailyReportAttempt(due.nextSlots[0]),true,'first launch attempt allowed')
assert.equal(schedule.claimAutoDailyReportAttempt(due.nextSlots[0]),false,'same session cannot repeat on failure, focus or remount')
delete require.cache[require.resolve('../src/lib/dailyReportAutoSchedule.ts')]
const restarted = require('../src/lib/dailyReportAutoSchedule.ts')
assert.equal(restarted.claimAutoDailyReportAttempt(due.nextSlots[0]),true,'new client runtime permits one retry')
assert.equal(schedule.shouldFireAutoDailyReport(day,new Date(2026,10,12,23,59),[]).fire,true,'failure remains retryable')
schedule.saveAutoDailyReportFiredSlots(day,due.nextSlots)
assert.equal(schedule.shouldFireAutoDailyReport(day,new Date(2026,10,12,20),schedule.loadAutoDailyReportFiredSlots(day)).fire,false,'saved success suppresses duplicate')
assert.equal(schedule.shouldFireAutoDailyReport(day,new Date(2026,10,13,19),[]).fire,false,'does not generate yesterday as today')
const history=require('../src/lib/dailyReportHistoryStore.ts')
history.appendDailyReportHistory(day,'测试日报')
global.localStorage.setItem=()=>{throw new Error('quota')}
assert.throws(()=>history.appendDailyReportHistory(day,'不可丢失的日报'),/保存失败/)
console.log('PASS: daily catch-up, no early trigger, retry eligibility, deduplication, date isolation and storage failure detection')
