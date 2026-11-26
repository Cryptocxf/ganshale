const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.join(__dirname, '..')
if (!process.versions.electron) {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const result = require('node:child_process').spawnSync(require('electron'), [__filename], { env, encoding: 'utf8', windowsHide: true, timeout: 70000 })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  if (result.status === 0 && !(result.stdout || '').includes('PASS: full application')) {
    console.error('Background test exited without completing assertions')
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}
const electron = require('electron')
const { app, BrowserWindow, powerMonitor, ipcMain } = electron
let trayQuitAction
const originalBuildMenu = electron.Menu.buildFromTemplate.bind(electron.Menu)
electron.Menu.buildFromTemplate = (template) => {
  trayQuitAction = template.find(item => item.label === '退出应用')?.click || trayQuitAction
  return originalBuildMenu(template)
}
let blockAcknowledgements = false
let simulatedLock = false
powerMonitor.getSystemIdleState = () => simulatedLock ? 'locked' : 'active'
const originalHandle = ipcMain.handle.bind(ipcMain)
ipcMain.handle = (channel, listener) => originalHandle(channel, (event, ...args) => {
  if (channel === 'ganshale:ack-recorded-window-events' && blockAcknowledgements) return { ok: false }
  return listener(event, ...args)
})
const base = path.join(root, '.private')
fs.mkdirSync(base, { recursive: true })
const isolated = fs.mkdtempSync(path.join(base, 'background-e2e-'))
app.setPath('userData', isolated)
const originalGetPath = app.getPath.bind(app)
app.getPath = (name) => name === 'appData' ? isolated : originalGetPath(name)
const originalLoadURL = BrowserWindow.prototype.loadURL
BrowserWindow.prototype.loadURL = function (url, ...args) {
  return url === 'http://127.0.0.1:5180/' ? this.loadFile(path.join(root, 'dist', 'index.html')) : originalLoadURL.call(this, url, ...args)
}
const Module = require('node:module')
const originalLoad = Module._load
Module._load = function (id, parent, ...rest) {
  if (id === './startupLog.cjs' && parent.filename.endsWith(path.join('electron', 'main.cjs'))) return { init() {}, write() {}, logFilePath: () => '' }
  return originalLoad.call(this, id, parent, ...rest)
}
require('../electron/main.cjs')
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
app.whenReady().then(async () => {
  const win = BrowserWindow.getAllWindows()[0]
  if (win.webContents.isLoading()) await new Promise(resolve => win.webContents.once('did-finish-load', resolve))
  await wait(3500)
  const journalFile = path.join(isolated, 'Ganshale', 'window-recording-pending.json')
  const readJournal = () => JSON.parse(fs.readFileSync(journalFile, 'utf8')).events
  win.minimize()
  blockAcknowledgements = true
  win.webContents.debugger.attach('1.3')
  await win.webContents.debugger.sendCommand('Page.setWebLifecycleState', { state: 'frozen' })
  await wait(8000)
  const hidden = readJournal()
  assert.ok(hidden.some(event => event.data.kind === 'work-session' && event.duration >= 8), 'frozen minimized renderer must not stop main-process clock')
  assert.ok(hidden.every(event => !/^ganshale(?:\.exe)?$/i.test(event.data.app)), 'self windows are excluded')
  simulatedLock = true
  powerMonitor.emit('lock-screen')
  const locked = JSON.stringify(readJournal())
  await wait(2500)
  assert.equal(JSON.stringify(readJournal()), locked, 'lock excludes all recording')
  powerMonitor.emit('suspend')
  simulatedLock = false
  powerMonitor.emit('unlock-screen')
  await wait(1500)
  assert.equal(JSON.stringify(readJournal()), locked, 'unlock alone does not cancel sleep pause')
  powerMonitor.emit('resume')
  await wait(2500)
  assert.ok(readJournal().filter(event => event.data.kind === 'work-session').length >= 2, 'resume creates a fresh session')
  await win.webContents.debugger.sendCommand('Page.setWebLifecycleState', { state: 'active' })
  blockAcknowledgements = false
  win.webContents.debugger.detach()
  win.restore()
  win.show()
  await wait(6000)
  const restored = await win.webContents.executeJavaScript(`(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('ganshale_aw'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const rows = await new Promise((resolve, reject) => { const r = db.transaction('events').objectStore('events').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    db.close();
    return { sessions: rows.filter(row => row.data.kind === 'work-session').length, windows: rows.filter(row => row.data.kind !== 'work-session').length, state: (await window.ganshaleDesktop.getRecordedWindowEvents()).state };
  })()`)
  assert.ok(restored.sessions >= 2, 'restoring UI replays main-process records into actual IndexedDB')
  assert.ok(restored.state.pending < 5, 'persisted events are acknowledged')
  // Legacy exhibition assertions are kept for historical comparison; the
  // current UI/export suite lives in test-brand-wordmark.cjs.
  if (process.env.GANSHALE_BACKGROUND_ONLY !== '1') {
  await win.webContents.executeJavaScript(`(async () => {
    const dialog = document.querySelector('[role="dialog"]'); if (dialog) dialog.querySelector('button[aria-label="关闭"]')?.click();
    const db = await new Promise((resolve,reject)=>{const r=indexedDB.open('ganshale_aw');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    await new Promise((resolve,reject)=>{const tx=db.transaction('events','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);const now=new Date();[12.6,11,10,9,8,7,5,2].forEach((hours,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),i+1,8);tx.objectStore('events').put({id:'design-fixture-'+i,bucket_id:'aw-watcher-window_web-ganshale',timestamp:d.toISOString(),duration:hours*3600,data:{kind:'work-session',app:'工作会话',closed:true}});let spent=0;[['Code.exe',.4],['chrome.exe',.25],['Weixin.exe',.15],['WINWORD.EXE',.12],['EXCEL.EXE',.08]].forEach(([app,ratio],j)=>{tx.objectStore('events').put({id:'fixture-app-'+i+'-'+j,bucket_id:'aw-watcher-window_web-ganshale',timestamp:new Date(d.getTime()+spent*3600000).toISOString(),duration:hours*ratio*3600,data:{app,title:'隔离测试'}});spent+=hours*ratio});const date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('ganshale-work-records:'+date,JSON.stringify([{id:'fixture-summary-'+i,content:'完成接口联调与运行问题排查，整理技术文档并验证功能。',source:'manual',saved:true}]))});for(let i=0;i<365;i++){const d=new Date(now.getFullYear()-1,0,i+1,8);tx.objectStore('events').put({id:'year-fixture-'+i,bucket_id:'aw-watcher-window_web-ganshale',timestamp:d.toISOString(),duration:28800,data:{kind:'work-session',app:'工作会话',closed:true}})}});db.close();
  })()`)
  const brickNav = await win.webContents.executeJavaScript(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '工时积木'); if (!b) return false; b.click(); return true })()`)
  assert.ok(brickNav, 'brick page navigation exists')
  const wordmark=await win.webContents.executeJavaScript(`(()=>{const mark=document.querySelector('.brick-brand .brand-wordmark'),cn=mark.querySelector('.brand-wordmark-cn'),en=mark.querySelector('.brand-wordmark-en');return {name:en.textContent,widthDelta:Math.abs(cn.getBoundingClientRect().width-en.getBoundingClientRect().width),fontDelta:parseFloat(getComputedStyle(cn).fontSize)-parseFloat(getComputedStyle(en).fontSize),below:en.getBoundingClientRect().top>=cn.getBoundingClientRect().bottom}})()`)
  assert.equal(wordmark.name,'Didly','English product name is Didly')
  assert.ok(wordmark.widthDelta<1&&Math.abs(wordmark.fontDelta-4)<.1&&wordmark.below,'wordmark has equal-width lines and two smaller type steps')
  const sharedTheme=await win.webContents.executeJavaScript(`(()=>{const heading=document.querySelector('.brick-heading-copy h1'),root=document.querySelector('.gs-app-bg'),nav=[...document.querySelectorAll('nav button')].find(b=>b.textContent==='工时积木');return {font:getComputedStyle(heading).fontFamily===getComputedStyle(document.body).fontFamily,icon:!!nav?.querySelector('svg'),isolated:root.hasAttribute('data-brick-archive')}})()`)
  assert.deepEqual(sharedTheme,{font:true,icon:true,isolated:false},'archive uses the shared app font, visible brick navigation icon and theme shell')
  // Routes may stay mounted: invalidate the display cache after direct fixture insertion.
  await wait(300)
  await win.webContents.executeJavaScript(`([...document.querySelectorAll('.brick-header button')].find(b=>b.textContent.trim()==='本月')).click()`)
  for(let attempt=0;attempt<50;attempt++){
    if(await win.webContents.executeJavaScript(`document.querySelectorAll('.brick-accessible button').length===9`))break
    await wait(200)
  }
  assert.equal(await win.webContents.executeJavaScript(`document.querySelectorAll('.brick-accessible button').length`),9,'month preview includes eight seeded days plus the live test day')
  const brickCheck = await win.webContents.executeJavaScript(`(() => { const c=document.querySelector('.brick-page canvas'); return { title: document.body.textContent.includes('我搬砖，也能盖出点名堂'), image: c?.toDataURL('image/png').startsWith('data:image/png'), story: document.body.textContent.includes('这块砖的故事') } })()`)
  assert.ok(brickCheck.title && brickCheck.image && brickCheck.story, 'brick route renders and PNG encoding succeeds')
  const ranks=await win.webContents.executeJavaScript(`Array.from(document.querySelector('.brick-story .brick-app-list').querySelectorAll('.brick-app-rank')).map(n=>n.textContent)`)
  assert.deepEqual(ranks,['1','2','3','4','5'],'story ranks are numbered 1–5')
  for(let attempt=0;attempt<30;attempt++){
    if(await win.webContents.executeJavaScript(`Array.from(document.querySelector('.brick-story .brick-app-list').querySelectorAll('img')).length===5&&Array.from(document.querySelector('.brick-story .brick-app-list').querySelectorAll('img')).every(img=>img.complete&&img.naturalWidth>0)`))break
    await wait(100)
  }
  assert.ok(await win.webContents.executeJavaScript(`Array.from(document.querySelector('.brick-story .brick-app-list').querySelectorAll('img')).length===5&&Array.from(document.querySelector('.brick-story .brick-app-list').querySelectorAll('img')).every(img=>img.complete&&img.naturalWidth>0)`),'all five story app logos load offline')
  assert.ok(await win.webContents.executeJavaScript(`document.querySelector('.brick-brand img').getAttribute('src').includes('ganshale-logo-app.png')`),'header uses project logo')
  const tiles = await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.brick-catalog .brick-tile')).map(node => node.getAttribute('viewBox')+':'+node.classList.contains('brick-precision')+':'+node.querySelector('image').getAttribute('href'))`)
  assert.equal(tiles.length, 13, 'all material grades render')
  assert.equal(new Set(tiles).size, 13, 'each grade samples a distinct image cell, not the first brick repeatedly')
  const catalogLabels = await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.brick-catalog article')).map(n=>({name:n.querySelector('strong').textContent.trim(),hours:n.querySelector('small').textContent}))`)
  assert.deepEqual(catalogLabels.map(n=>n.name.replace(/^L\d+\s*/,'')),['实心砖','双孔砖','多孔砖','陶纹砖','石灰砖','精工砖','花岗砖','水磨砖','大理石砖','赤铜砖','秘银砖','鎏金砖','铁块砖'])
  assert.ok(catalogLabels.every(n=>n.hours.startsWith('工作')))
  assert.ok(await win.webContents.executeJavaScript(`new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src='brick-drafting-paper-v1.png'})`),'drafting paper background asset decodes')
  assert.ok(await win.webContents.executeJavaScript(`Promise.all(['brick-front-atlas-v1.png','brick-scene-clay-v3.png','brick-whitecollar-v1.png','ganshale-logo-app.png'].map(src=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0&&image.naturalHeight>0);image.onerror=()=>resolve(false);image.src=src}))).then(results=>results.every(Boolean))`),'restored brick assets, white-collar character and project logo decode')
  assert.ok(await win.webContents.executeJavaScript(`Promise.all(['copper','silver','gold'].map(name=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src='brick-'+name+'-v1.png'}))).then(results=>results.every(Boolean))`),'all three metal assets decode')
  const controls = await win.webContents.executeJavaScript(`(async () => {
    const pause=()=>new Promise(r=>setTimeout(r,150));
    const buttons=[...document.querySelectorAll('.brick-period-switch button')];
    const options=buttons.map(b=>b.textContent);
    buttons[1].click();await pause();const disabled=buttons[1].getAttribute('aria-pressed')==='true';
    buttons[0].click();await pause();const enabled=buttons[0].getAttribute('aria-pressed')==='true';
    const opened=getComputedStyle(document.querySelector('.brick-story')).display!=='none';
    const closed=!document.querySelector('.brick-story-toggle');
    if(!document.querySelector('.brick-header .brick-toolbar'))throw new Error('toolbar must live in the title region');
    document.querySelector('.brick-catalog h2 button').click();await pause();
    const dialog=document.querySelector('[role="dialog"][aria-labelledby="brick-catalog-title"]');
    const details=dialog?.querySelectorAll('article').length;
    dialog?.querySelector('button').click();await pause();
    return {options,disabled,enabled,opened,closed,details,closedDialog:!document.querySelector('.brick-catalog-dialog')};
  })()`)
  assert.deepEqual(controls,{options:['本月','本年'],disabled:true,enabled:true,opened:true,closed:true,details:13,closedDialog:true})
  await win.webContents.executeJavaScript(`document.querySelector('.brick-catalog h2 button').click()`)
  await new Promise(r=>setTimeout(r,250))
  const cardLayout=await win.webContents.executeJavaScript(`(() => {const cards=[...document.querySelectorAll('.brick-detail-grid article')];return cards.slice(0,6).map(n=>Math.round(n.getBoundingClientRect().top))})()`)
  assert.equal(new Set(cardLayout).size,1,'catalog shows six game cards per row')
  fs.writeFileSync(path.join(root,'.private','brick-catalog-dialog.png'),(await win.webContents.capturePage()).toPNG())
  await win.webContents.executeJavaScript(`document.querySelector('.brick-catalog-dialog header button').click()`)
  win.unmaximize()
  for (const [width,height] of [[1120,760],[1440,900]]) {
    win.setSize(width,height)
    await wait(500)
    await win.webContents.executeJavaScript(`(() => { document.querySelector('[role="dialog"] button[aria-label="关闭"]')?.click(); })()`)
    const bounds = await win.webContents.executeJavaScript(`(() => { const p=document.querySelector('.brick-page').getBoundingClientRect(),c=document.querySelector('.brick-catalog').getBoundingClientRect();return { bottom:p.bottom,catBottom:c.bottom,height:innerHeight,tiles:document.querySelectorAll('.brick-tile').length } })()`)
    assert.ok(bounds.catBottom <= bounds.height + 2, 'catalog remains inside one screen')
    await win.webContents.executeJavaScript(`document.querySelector('.brick-catalog h2 button').click()`)
    await wait(150)
    const fit=await win.webContents.executeJavaScript(`(() => {const grid=document.querySelector('.brick-detail-grid');const last=grid.lastElementChild.getBoundingClientRect();return {scroll:grid.scrollHeight,client:grid.clientHeight,last:last.bottom,bottom:grid.getBoundingClientRect().bottom,contained:[...grid.children].every(card=>card.querySelector('.brick-card-copy').getBoundingClientRect().bottom<=card.getBoundingClientRect().bottom+2)}})()`)
    assert.ok(fit.scroll<=fit.client+2&&fit.last<=fit.bottom+2,'all 13 cards fit without scrolling at '+width)
    assert.ok(fit.contained,'card descriptions remain inside their cards at '+width)
    await win.webContents.executeJavaScript(`document.querySelector('.brick-catalog-dialog header button').click()`)
    await wait(150)
    fs.writeFileSync(path.join(root, '.private', 'brick-design-'+width+'.png'), (await win.webContents.capturePage()).toPNG())
  }
  fs.writeFileSync(path.join(root, '.private', 'brick-ui-check.png'), (await win.webContents.capturePage()).toPNG())
  for (const [ratio,width,height,annual] of [['16:9',1920,1080,false],['9:16',1080,1920,false],['16:9',1920,1080,true],['9:16',1080,1920,true]]) {
    if (annual && ratio==='16:9') {
      await win.webContents.executeJavaScript(`(() => {([...document.querySelectorAll('.brick-period-switch button')].find(b=>b.textContent==='本年')).click()})()`)
      await wait(1500)
      const annualDays=await win.webContents.executeJavaScript(`document.querySelectorAll('.brick-accessible button').length`)
      assert.ok(annualDays>=9,'year view includes actual current-year day bricks')
    }
    await win.webContents.executeJavaScript(`(() => {window.__brickExport=null;window.__originalAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__brickExport={href:this.href,name:this.download}};document.querySelector('.brick-header .brick-primary').click()})()`)
    await wait(100)
    await win.webContents.executeJavaScript(`([...document.querySelectorAll('.brick-download-menu button')].find(button=>button.textContent.startsWith('${ratio}'))).click()`)
    await wait(2800)
    const exported=await win.webContents.executeJavaScript(`(() => {HTMLAnchorElement.prototype.click=window.__originalAnchorClick;return window.__brickExport})()`)
    assert.ok(exported?.href?.startsWith('data:image/png'),'download option exports PNG '+ratio)
    assert.ok(exported.name.includes(ratio.replace(':','x')),'filename contains selected ratio')
    const image=electron.nativeImage.createFromDataURL(exported.href)
    assert.deepEqual(image.getSize(),{width,height},'exact export dimensions '+ratio)
    fs.writeFileSync(path.join(root,'.private','brick-export-'+(annual?'year-':'')+ratio.replace(':','x')+'.png'),image.toPNG())
  }
  console.log('PASS: download menu exports exact 1920x1080 and 1080x1920 reflowed posters')
  console.log('PASS: brick navigation, story panel and PNG encoding')
  }
  blockAcknowledgements = true
  win.close()
  await wait(1800)
  assert.equal(win.isDestroyed(), false, 'X must not destroy the client')
  assert.equal(win.isVisible(), false, 'X hides directly to tray')
  assert.equal(BrowserWindow.getAllWindows().length, 1, 'X must not open a confirmation dialog')
  const sessionAtClose = readJournal().find(event => event.data.kind === 'work-session' && !event.data.closed)
  await wait(3000)
  const sessionAfterClose = readJournal().find(event => event.id === sessionAtClose.id)
  assert.ok(sessionAfterClose.duration > sessionAtClose.duration, 'close-to-tray must continue recording')
  assert.equal(typeof trayQuitAction, 'function', 'tray keeps explicit quit action')
  console.log('PASS: X hides without confirmation and continues recording; explicit app quit exits')
  console.log('PASS: full application minimized/frozen renderer, native foreground samples, lock/sleep exclusion, resume and IndexedDB replay', JSON.stringify(restored))
  trayQuitAction()
}).catch(error => { console.error(error.stack || error.message); app.exit(1) })
