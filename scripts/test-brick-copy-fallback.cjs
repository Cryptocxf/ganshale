const assert=require('node:assert/strict')
const fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file)
const {copyBrickCanvas}=require('../src/lib/brickClipboard.ts')
const canvas={toDataURL:()=> 'data:image/png;base64,test',toBlob:callback=>callback(new Blob(['test'],{type:'image/png'}))}
global.ClipboardItem=class{constructor(data){this.data=data}}
let writes=0
Object.defineProperty(global,'navigator',{configurable:true,value:{clipboard:{write:async items=>{assert.equal(items[0].data['image/png'].type,'image/png');writes++}}}})
;(async()=>{
  global.window={ganshaleDesktop:{copyBrickImage:async()=>({ok:true})}}
  await copyBrickCanvas(canvas);assert.equal(writes,0)
  window.ganshaleDesktop.copyBrickImage=async()=>({ok:false})
  await copyBrickCanvas(canvas);assert.equal(writes,1)
  window.ganshaleDesktop.copyBrickImage=async()=>{throw new Error('old native bridge')}
  await copyBrickCanvas(canvas);assert.equal(writes,2)
  window.ganshaleDesktop=undefined
  await copyBrickCanvas(canvas);assert.equal(writes,3)
  navigator.clipboard.write=async()=>{throw new Error('permission denied')}
  await assert.rejects(()=>copyBrickCanvas(canvas))
  console.log('PASS: native success; old/failed bridge fallback; browser path; write failure propagates')
})().catch(error=>{console.error(error);process.exitCode=1})
