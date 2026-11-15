const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
if(!process.versions.electron){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE
  const result=require('node:child_process').spawnSync(require('electron'),[__filename],{env,encoding:'utf8',windowsHide:true,timeout:30000})
  process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exit(result.status??1)
}
const api=require('electron')
api.app.whenReady().then(async()=>{
  // Keep clipboard contents in memory only, never print or persist them.
  const original=[]
  for(const item of await api.clipboard.read()){
    const entries=[]
    for(const type of item.types){
      const payload=await item.getType(type)
      entries.push([type,typeof payload.arrayBuffer==='function'?new Blob([await payload.arrayBuffer()],{type}):payload])
    }
    // Read-backed items are not writable. Materialize all payloads before testing.
    original.push(new api.ClipboardItem(Object.fromEntries(entries)))
  }
  let win
  try{
    const bytes=fs.readFileSync(path.join(__dirname,'../.private/didly-export-16x9.png'))
    const dataUrl='data:image/png;base64,'+bytes.toString('base64')
    win=new api.BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,preload:path.join(__dirname,'../electron/preload.cjs')}})
    let failure=''
    api.ipcMain.handle('ganshale:copy-brick-image',require('../electron/brickClipboard.cjs').createBrickClipboardHandler(api,()=>win,error=>{failure=error.message}))
    await win.loadURL('data:text/html,<html><body>isolated clipboard test</body></html>')
    const result=await win.webContents.executeJavaScript('window.ganshaleDesktop.copyBrickImage('+JSON.stringify(dataUrl)+')',true)
    assert.ok(result.ok,'preload + IPC + actual native write: '+failure)
    const copied=await api.clipboard.read(),item=copied.find(item=>item.types.includes('image/png'))
    assert.ok(item,'PNG exists on Windows clipboard')
    const blob=await item.getType('image/png'),image=api.nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()))
    assert.deepEqual(image.getSize(),{width:1920,height:1080})
    console.log('PASS: actual preload + IPC + Windows image clipboard write/read, 1920x1080')
  }finally{
    win?.destroy();api.ipcMain.removeHandler('ganshale:copy-brick-image')
    if(original.length)await api.clipboard.write(original);else await api.clipboard.clear()
    console.log('Restored previous clipboard contents')
  }
  api.app.quit()
}).catch(error=>{console.error(error.stack||error);api.app.exit(1)})
