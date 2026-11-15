const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,f)
const Module=require('node:module'),originalLoad=Module._load
Module._load=function(id,parent,...rest){if(id.endsWith('/constants/brand'))return {APP_DISPLAY_NAME:'干啥了',APP_ENGLISH_NAME:'Didly',BRAND_LOGO_APP_SRC:'./ganshale-logo-app.png',OPENCLAW_ICON_SRC:'./openclaw-favicon-32.png'};return originalLoad.call(this,id,parent,...rest)}
const {brickHighlights}=require('../src/lib/brickHighlights.ts')
const day=(date,hour)=>({date,seconds:hour*3600,apps:[],summary:'',grade:0,firstAt:new Date(date+'T09:00:00').getTime(),lastAt:new Date(date+'T18:00:00').getTime()})
const days=[day('2026-11-02',8),day('2026-11-03',9),day('2026-12-01',10)]
const year=brickHighlights(days,'year')
assert.equal(year[0].value,'10小时');assert.equal(year[1].detail,'11月');assert.equal(year[1].value,'17小时');assert.equal(year[4].value,'2天')
const month=brickHighlights(days.slice(0,2),'month');assert.equal(month[1].value,'17小时');assert.ok(month[1].detail.startsWith('11-02'))
assert.ok(brickHighlights([],'year').every(item=>item.value==='—'))
assert.equal(brickHighlights([{...day('2026-11-02',8),lastAt:new Date('2026-11-03T00:00:00').getTime()}],'year')[3].value,'次日00:00')
console.log('PASS: longest day, month/week totals, empty values, natural-day streak and midnight end')
