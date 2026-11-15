const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)
const {brickDateCaption,brickHoleCount,buildBrickColumns,layoutBrickColumns,brickScenePlot}=require('../src/lib/brickChart.ts')
assert.deepEqual(brickDateCaption('2026-11-16'),{weekday:'周一',red:false})
assert.deepEqual(brickDateCaption('2026-11-15'),{weekday:'周日',red:true})
assert.deepEqual(brickDateCaption('2026-10-01'),{weekday:'周四',red:true})
assert.deepEqual(brickDateCaption('2027-01-02'),{weekday:'周六',red:true})
for(const [seconds,count] of [[0,0],[1,1],[3600,1],[3601,2],[21600,6],[43200,12],[50000,12],[NaN,0]])assert.equal(brickHoleCount(seconds),count)
const day=(date,seconds)=>({date,seconds,grade:0,apps:[],summary:''})
const input=[day('2026-11-03',21600),day('2026-11-01',1),day('2026-11-02',0),day('2026-11-04',3601)]
const month=buildBrickColumns(input,'month')
assert.equal(month.length,30)
assert.deepEqual(month.slice(0,4).map(c=>c.label),['1日','2日','3日','4日'])
assert.deepEqual(month.slice(0,4).map(c=>c.bricks.length),[1,0,6,2])
assert.equal(month[3].bricks[1].seconds,1)
assert.ok(month.flatMap(c=>c.bricks).every(b=>b.grade===0))
assert.equal(new Set(month.flatMap(c=>c.bricks.map(b=>b.id))).size,9)
const year=buildBrickColumns(input,'year')
assert.equal(year.length,12);assert.equal(year[10].bricks.length,3)
assert.deepEqual(year[10].bricks.map(b=>b.day.date),['2026-11-01','2026-11-03','2026-11-04'])
assert.ok(year.flatMap(c=>c.bricks).every(b=>b.grade===2))
for(const [key,count] of [['2026-01',31],['2026-02',28],['2028-02',29],['2026-11',30]]){
  const empty=buildBrickColumns([],'month',key);assert.equal(empty.length,count);assert.ok(empty.every(c=>!c.bricks.length))
}
assert.equal(buildBrickColumns([],'year').flatMap(c=>c.bricks).length,0)
const scene={x:0,y:0,w:1200,h:700}
const oldCell=layoutBrickColumns(month,brickScenePlot(scene))[0]
const enlargedCell=layoutBrickColumns(month,brickScenePlot(scene,'month'),'month')[0]
assert.ok(enlargedCell.w>oldCell.w*1.2&&enlargedCell.h>oldCell.h*1.7,'monthly bricks visibly larger, not just a larger canvas')
const artwork=fs.readFileSync(require('node:path').join(__dirname,'../src/lib/brickArtwork.ts'),'utf8')
assert.ok(artwork.includes("if(mode==='year'&&cell.h>=8)"),'brick face day numbers only appear in annual view')
for(const columns of [month,year,buildBrickColumns(Array.from({length:31},(_,i)=>day(`2026-01-${String(i+1).padStart(2,'0')}`,24*3600)),'month')]){
  const box={x:20,y:10,w:600,h:320},cells=layoutBrickColumns(columns,box)
  assert.ok(cells.every(c=>c.x>=box.x&&c.y>=box.y&&c.x+c.w<=box.x+box.w+.01&&c.y+c.h<=box.y+box.h+.01))
  for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++)assert.ok(cells[i].x+cells[i].w<=cells[j].x+.001||cells[j].x+cells[j].w<=cells[i].x+.001||cells[i].y+cells[i].h<=cells[j].y+.001||cells[j].y+cells[j].h<=cells[i].y+.001)
  for(const column of columns){const stack=cells.filter(c=>column.bricks.some(b=>b.id===c.id));for(let row=1;row<stack.length;row++)assert.ok(Math.abs(stack[row].y+stack[row].h-stack[row-1].y)<.001)}
}
console.log('PASS: monthly ceil-hour counts, partial hour, chronological gaps; yearly daily counts, 12 months; unique hits and dense layouts')
