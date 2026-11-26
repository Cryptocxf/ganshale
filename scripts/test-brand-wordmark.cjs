const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const root=path.join(__dirname,'..')
if(!process.versions.electron){
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE
  const result=require('node:child_process').spawnSync(require('electron'),[__filename],{env,encoding:'utf8',windowsHide:true,timeout:90000})
  process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exit(result.status??1)
}
const {app,BrowserWindow,nativeImage}=require('electron')
// Offscreen captures need software compositing to include accelerated canvas layers.
// This affects only this test process, never the installed client's GPU settings.
app.disableHardwareAcceleration()
fs.mkdirSync(path.join(root,'.private'),{recursive:true})
app.setPath('userData',fs.mkdtempSync(path.join(root,'.private','brand-e2e-')))
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,offscreen:true}})
  const capture=async()=>{await win.webContents.executeJavaScript(`document.querySelector('.gs-dashboard-modal button[aria-label="关闭"]')?.click()`);for(let attempt=0;attempt<5;attempt++){win.webContents.invalidate();await wait(200);try{return await win.webContents.capturePage()}catch(error){if(attempt===4)throw error}}}
  win.webContents.on('console-message',event=>{if(event.level==='error')console.error('renderer:',event.message)})
  await win.loadFile(path.join(root,'dist','index.html'));await wait(1500)
  await win.webContents.executeJavaScript(`(async()=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('ganshale_aw');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
    const d=new Date();d.setHours(8,0,0,0)
    await new Promise((resolve,reject)=>{const tx=db.transaction('events','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.objectStore('events').put({id:'story-session',bucket_id:'aw-watcher-window_web-ganshale',timestamp:d.toISOString(),duration:3000,data:{kind:'work-session',closed:true}});['Code.exe','chrome.exe','Weixin.exe','WINWORD.EXE','EXCEL.EXE'].forEach((app,i)=>tx.objectStore('events').put({id:'story-app-'+i,bucket_id:'aw-watcher-window_web-ganshale',timestamp:new Date(d.getTime()+i*600000).toISOString(),duration:600,data:{app,title:'隔离测试'}}))});
    await new Promise((resolve,reject)=>{const tx=db.transaction('events','readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);[12.6,11,10,9,8,6,5,2].forEach((hours,i)=>{const day=new Date(d.getFullYear(),d.getMonth(),i+1,8);if(day>=d)return;tx.objectStore('events').put({id:'archive-session-'+i,bucket_id:'aw-watcher-window_web-ganshale',timestamp:day.toISOString(),duration:hours*3600,data:{kind:'work-session',closed:true}});let spent=0;[['Code.exe',.4],['chrome.exe',.25],['Weixin.exe',.15],['WINWORD.EXE',.12],['EXCEL.EXE',.08]].forEach(([app,ratio],j)=>{tx.objectStore('events').put({id:'archive-app-'+i+'-'+j,bucket_id:'aw-watcher-window_web-ganshale',timestamp:new Date(day.getTime()+spent*3600000).toISOString(),duration:hours*ratio*3600,data:{app,title:'隔离测试'}});spent+=hours*ratio})})});db.close()
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('ganshale-work-records:'+key,JSON.stringify([{id:'story-summary',source:'manual',saved:true,content:'完成模型服务接口开发与联调，排查部署与调用异常，优化请求处理流程。整理技术文档、测试记录与问题清单，验证修复效果并同步当天进展。'}]))
    for(let i=1;i<d.getDate()&&i<=8;i++){const dayKey=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(i).padStart(2,'0');localStorage.setItem('ganshale-work-records:'+dayKey,localStorage.getItem('ganshale-work-records:'+key))}
  })()`)
  await win.webContents.executeJavaScript(`([...document.querySelectorAll('nav button')].find(b=>b.textContent==='工时汇总')).click()`)
  await wait(1000)

  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.brick-story')&&!document.querySelector('.brick-catalog')&&!document.querySelector('.brick-catalog-link')`),'story hidden by default, old catalogue removed')
  const groups=await win.webContents.executeJavaScript(`(()=>{const result={};for(const b of document.querySelectorAll('.brick-accessible button')){const key=b.textContent.slice(0,10);result[key]=(result[key]||0)+1}return result})()`)
  const keys=Object.keys(groups)
  assert.deepEqual(keys,[...keys].sort(),'monthly days chronological')
  assert.equal(groups[keys[5]],6,'six-hour fixture has six independent bricks')
  const firstId=keys[0]+':hour:1'
  require.extensions['.ts']=(module,file)=>module._compile(require('typescript').transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:require('typescript').ModuleKind.CommonJS,target:require('typescript').ScriptTarget.ES2022}}).outputText,file)
  const {brickScenePlot,buildBrickColumns,layoutBrickColumns}=require('../src/lib/brickChart.ts')
  async function clickCanvas(id){
    const info=await win.webContents.executeJavaScript(`(()=>{const c=document.querySelector('.brick-scroll canvas'),r=c.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()`)
    const days=keys.map(date=>({date,seconds:groups[date]*3600,grade:0,apps:[],summary:''}))
    const cell=layoutBrickColumns(buildBrickColumns(days,'month'),brickScenePlot({x:0,y:0,w:info.w,h:info.h},'month'),'month').find(c=>c.id===id)
    assert.ok(cell)
    await win.webContents.executeJavaScript(`document.querySelector('.brick-scroll canvas').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:${info.x+cell.x+cell.w/2},clientY:${info.y+cell.y+cell.h/2}}))`)
    await wait(150)
  }
  await clickCanvas(firstId)
  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.brick-story')`),'monthly selection never opens story')
  assert.equal(await win.webContents.executeJavaScript(`document.querySelectorAll('.brick-accessible button[aria-pressed="true"]').length`),1)
  fs.writeFileSync(path.join(root,'.private','brick-chart-story.png'),(await capture()).toPNG())
  await clickCanvas(firstId)
  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.brick-story')`),'same visible canvas brick toggles story off after reflow')
  for(const [width,height]of [[1366,768],[1440,900],[1920,1080],[1120,760],[480,900]]){
    win.setSize(width,height);await wait(200)
    assert.ok(await win.webContents.executeJavaScript(`document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.brick-page').scrollWidth<=document.querySelector('.brick-page').clientWidth+1`),'no horizontal overflow '+width)
    if(width>1000)assert.ok(await win.webContents.executeJavaScript(`document.querySelector('.brick-main').getBoundingClientRect().bottom<=innerHeight+1`),'desktop stage fits '+width)
  }
  win.setSize(1440,900);await wait(200)
  fs.writeFileSync(path.join(root,'.private','brick-chart-month.png'),(await capture()).toPNG())
  await win.webContents.executeJavaScript(`[...document.querySelectorAll('.brick-period-switch button')].find(b=>b.textContent==='本年').click()`);await wait(700)
  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.brick-story')`),'mode change clears selection')
  assert.equal(await win.webContents.executeJavaScript(`document.querySelectorAll('.brick-accessible button').length`),keys.length,'annual one brick per active day')
  const chartBounds=()=>win.webContents.executeJavaScript(`(()=>{const r=document.querySelector('.brick-scroll canvas').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()`)
  const beforeStory=await chartBounds()
  await win.webContents.executeJavaScript(`document.querySelector('.brick-accessible button').click()`);await wait(100)
  assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.brick-specimen').getAttribute('aria-label')`),'实心砖')
  assert.deepEqual(await chartBounds(),beforeStory,'floating annual story does not move or resize bricks')
  await win.webContents.executeJavaScript(`document.querySelector('.brick-accessible button[aria-pressed="true"]').click()`);await wait(100)
  fs.writeFileSync(path.join(root,'.private','brick-chart-year.png'),(await capture()).toPNG())
  await win.webContents.executeJavaScript(`document.querySelector('.brick-accessible button').click()`);await wait(100)
  await win.webContents.executeJavaScript(`(()=>{window.__posterText=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(value,...args){window.__posterText.push(String(value));return original.call(this,value,...args)};window.__export=null;HTMLAnchorElement.prototype.click=function(){window.__export=this.href};document.querySelector('.brick-primary').click()})()`)
  let exported
  for(let i=0;i<60;i++){exported=await win.webContents.executeJavaScript('window.__export');if(exported)break;await wait(100)}
  assert.deepEqual(nativeImage.createFromDataURL(exported).getSize(),{width:1920,height:1080})
  fs.writeFileSync(path.join(root,'.private','brick-chart-export.png'),nativeImage.createFromDataURL(exported).toPNG())
  await win.webContents.executeJavaScript(`(()=>{window.__copied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async(items)=>{const blob=await items[0].getType('image/png');window.__copied=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob)})}}});document.querySelector('.brick-art').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))})()`)
  let copied
  for(let i=0;i<60;i++){copied=await win.webContents.executeJavaScript('window.__copied');if(copied)break;await wait(100)}
  assert.equal(copied,exported,'copy exactly matches download')
  await wait(100)
  const toast=await win.webContents.executeJavaScript(`(()=>{const r=document.querySelector('.brick-copy-note').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:innerWidth,h:innerHeight}})()`)
  assert.ok(Math.abs(toast.x-toast.w/2)<2&&Math.abs(toast.y-toast.h/2)<2,'copy notification centered in window')
  fs.writeFileSync(path.join(root,'.private','brick-copy-centered-preview.png'),(await capture()).toPNG())
  const posterText=await win.webContents.executeJavaScript('window.__posterText')
  for(const expected of ['我搬砖，也能盖出点名堂','本年之最','最长工作日','最忙月份','最早开始','最晚结束','最长连续记录'])assert.ok(posterText.includes(expected),expected)
  assert.ok(!posterText.includes('工作剪影'),'obsolete bottom strip removed')
  await win.webContents.executeJavaScript(`[...document.querySelectorAll('.brick-period-switch button')].find(b=>b.textContent==='本月').click()`);await wait(700)
  await win.webContents.executeJavaScript(`window.__export=null;document.querySelector('.brick-primary').click()`)
  let monthly
  for(let i=0;i<60;i++){monthly=await win.webContents.executeJavaScript('window.__export');if(monthly)break;await wait(100)}
  assert.deepEqual(nativeImage.createFromDataURL(monthly).getSize(),{width:1920,height:1080})
  fs.writeFileSync(path.join(root,'.private','brick-chart-export-month.png'),nativeImage.createFromDataURL(monthly).toPNG())
  if(process.env.GANSHALE_CAPTURE_ALL==='1'){
    const out=path.join(root,'.private','taste-previews');fs.mkdirSync(out,{recursive:true})
    for(const [label,name]of [['每日','daily'],['每周','weekly'],['每月','monthly'],['待办','todos'],['模型','settings'],['提示词','prompts'],['时间','time'],['主题','theme'],['关于','about'],['工时汇总','bricks']]){
      await win.webContents.executeJavaScript(`([...document.querySelectorAll('nav[aria-label="主导航"] button')].find(b=>b.textContent===${JSON.stringify(label)})).click()`)
      await wait(900)
      fs.writeFileSync(path.join(out,name+'.png'),(await capture()).toPNG())
      if(name==='daily'){
        assert.ok(await win.webContents.executeJavaScript(`!!document.querySelector('.office-water-vessel')`),'water clock rendered')
        assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.office-water-motion')`),'no water pause button')
      }
      if(name==='bricks'){
        assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.brick-theme-toggle')`),'warm exhibition restored')
      }
    }
  }
  console.log('PASS: chronological monthly hourly bricks, annual daily bricks, hidden/toggle/canvas hit story, solid/perforated images, five sizes and 16:9 copy/download')
  await win.webContents.executeJavaScript(`document.querySelector('.gs-drawer-close').click()`)
  await wait(250)
  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('#gs-drawer-navigation').hidden&&document.querySelector('.gs-drawer-close').getAttribute('aria-expanded')==='false'&&[...document.querySelectorAll('nav[aria-label="主导航"] button')].every(b=>b.querySelector('svg')&&!b.querySelector('span')&&b.title===b.getAttribute('aria-label'))`),'collapsed drawer retains named icon navigation')
  await win.webContents.executeJavaScript(`document.querySelector('nav[aria-label="主导航"] button[aria-label="模型"]').click()`)
  await wait(250)
  assert.ok(await win.webContents.executeJavaScript(`document.querySelector('nav[aria-label="主导航"] button[aria-label="模型"]').getAttribute('aria-current')==='page'&&document.querySelector('.gs-workspace-title').textContent==='模型'`),'collapsed icon navigates to corresponding page')
  fs.writeFileSync(path.join(root,'.private','drawer-collapsed.png'),(await capture()).toPNG())
  await win.webContents.executeJavaScript(`document.querySelector('.gs-drawer-close').click()`)
  await wait(250)
  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('#gs-drawer-navigation').hidden`),'logo expands navigation')
  await win.webContents.executeJavaScript(`document.querySelector('.gs-drawer-logo').click()`)
  assert.ok(await win.webContents.executeJavaScript(`document.querySelector('.gs-logo-preview').open&&document.querySelector('.gs-logo-preview img').naturalWidth>0`),'brand logo opens large preview')
  assert.ok(await win.webContents.executeJavaScript(`(()=>{const d=document.querySelector('.gs-logo-preview'),img=d.querySelector('img'),r=img.getBoundingClientRect();return !d.querySelector('button')&&getComputedStyle(d.querySelector('.gs-logo-preview-body')).backgroundColor==='rgb(255, 255, 255)'&&Math.abs(r.left+r.width/2-innerWidth/2)<2&&Math.abs(r.top+r.height/2-innerHeight/2)<2})()`),'white button-free logo preview is centered')
  await win.webContents.executeJavaScript(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{window.__logoCopied=items[0].types.includes('image/png')}}});document.querySelector('.gs-logo-preview img').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}))`)
  for(let attempt=0;attempt<50;attempt++){
    if(await win.webContents.executeJavaScript(`Boolean(window.__logoCopied&&document.querySelector('.gs-logo-copy-toast')?.textContent==='复制成功')`))break
    await wait(100)
  }
  const copyState=await win.webContents.executeJavaScript(`(()=>{const t=document.querySelector('.gs-logo-copy-toast'),r=t?.getBoundingClientRect();return {copied:window.__logoCopied,status:t?.textContent,centered:r&&Math.abs(r.left+r.width/2-innerWidth/2)<2&&Math.abs(r.top+r.height/2-innerHeight/2)<2}})()`)
  assert.ok(copyState.copied&&copyState.status==='复制成功'&&copyState.centered,`logo copy reports centered success: ${JSON.stringify(copyState)}`)
  assert.ok(await win.webContents.executeJavaScript(`document.querySelector('.gs-logo-preview').open`),'right-click copy keeps preview open')
  await win.webContents.executeJavaScript(`document.querySelector('.gs-logo-preview img').click()`)
  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.gs-logo-preview').open`),'left-click logo closes preview')
  await win.webContents.executeJavaScript(`document.querySelector('.gs-drawer-logo').click();document.querySelector('.gs-logo-preview').click()`)
  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.gs-logo-preview').open`),'left-click empty area closes preview')
  await win.webContents.executeJavaScript(`document.querySelector('nav button[aria-label="每日"]').click()`)
  await wait(350)
  await win.webContents.executeJavaScript(`(()=>{const card=document.querySelector('.office-water-card'),r=card.getBoundingClientRect();card.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+72,clientY:r.top+85}))})()`)
  await wait(100)
  const origin=await win.webContents.executeJavaScript(`(()=>{const wave=document.querySelector('.office-click-ripple');return {x:parseFloat(wave.style.left),y:parseFloat(wave.style.top),rings:wave.children.length}})()`)
  assert.ok(Math.abs(origin.x-72)<3&&Math.abs(origin.y-85)<3&&origin.rings===1,'single circular ripple originates at click position')
  assert.equal(await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.office-click-ripple i')).animationDuration`),'3s')
  await wait(3100)
  assert.ok(await win.webContents.executeJavaScript(`!document.querySelector('.office-click-ripple')`),'ripple cleans up after animation')
  console.log('PASS: logo preview/copy and click-position ripple lifecycle')
  for(const width of [1120,1366,1440,1920]){
    win.setSize(width,900)
    for(const collapsed of [false,true]){
      await win.webContents.executeJavaScript(`(()=>{const root=document.querySelector('.gs-drawer-layout');if(root.dataset.drawerCollapsed!==${JSON.stringify(String(collapsed))})document.querySelector('.gs-drawer-close').click()})()`)
      await wait(250)
      const geometry=await win.webContents.executeJavaScript(`(()=>{const table=document.querySelector('.window-event-table'),row=table?.querySelector('tbody tr');if(!row)return null;const cells=[...row.cells].map(c=>c.getBoundingClientRect());const icon=row.cells[0].querySelector('img,svg')?.getBoundingClientRect();return {width:table.getBoundingClientRect().width,columns:cells.map(c=>c.width),iconFits:!icon||icon.right<=cells[0].right,titleFits:cells[4].width>=20}})()`)
      assert.ok(geometry&&geometry.iconFits&&geometry.titleFits,`window log columns fit ${width}, collapsed=${collapsed}: ${JSON.stringify(geometry)}`)
      assert.ok(geometry.columns[2]>=51&&geometry.columns[5]>=95,'time and duration retain reserved space')
      const heights=await win.webContents.executeJavaScript(`(()=>{const top=document.querySelector('.daily-top-grid'),bottom=document.querySelector('.daily-bottom-grid'),middle=top.nextElementSibling;const current=[top,middle,bottom].map(e=>e.getBoundingClientRect().height);top.style.flexGrow='3';top.style.maxHeight='42vh';bottom.style.flexGrow='4';const original=[top,middle,bottom].map(e=>e.getBoundingClientRect().height);top.style.removeProperty('flex-grow');top.style.removeProperty('max-height');bottom.style.removeProperty('flex-grow');return {current,original}})()`)
      assert.ok(Math.abs(heights.current[1]-heights.original[1])<1&&heights.current[0]>heights.original[0]&&heights.current[2]<heights.original[2],`only bottom cards fund taller top row: ${JSON.stringify(heights)}`)
      const headers=await win.webContents.executeJavaScript(`[...document.querySelectorAll('.daily-top-grid .gs-section-title')].map(h=>{const r=h.getBoundingClientRect(),parts=[...h.children].map(e=>e.getBoundingClientRect());return {text:h.textContent,height:r.height,width:r.width,parent:h.closest('.gs-card').getBoundingClientRect().width,oneLine:parts.every(p=>p.top>=r.top-1&&p.bottom<=r.bottom+1)&&r.height<35}})`)
      assert.ok(headers.length===3&&headers.every(h=>h.oneLine&&h.width<h.parent),`top headers remain inline ${width}, collapsed=${collapsed}: ${JSON.stringify(headers)}`)
      assert.ok(await win.webContents.executeJavaScript(`(()=>{const drawer=document.querySelector('.gs-drawer'),active=drawer.querySelector('[aria-current=page] span');return getComputedStyle(drawer).scrollbarWidth==='none'&&getComputedStyle(drawer).transitionDuration==='0s'&&(!active||Number(getComputedStyle(active).fontWeight)>=700)})()`),'drawer has no scrollbar/resize transition and selected label is bold')
      assert.ok(await win.webContents.executeJavaScript(`(()=>{const p=document.querySelector('.category-pie-preview');if(!p)return true;const r=p.getBoundingClientRect();return [...p.querySelectorAll('ul button>span:last-child')].every(s=>{const b=s.getBoundingClientRect();return s.scrollWidth<=s.clientWidth+1&&b.right<=r.right+1})})()`),`category legend remains fully visible ${width}, collapsed=${collapsed}`)
    }
  }
  console.log('PASS: window log column sizing at four widths with expanded/collapsed drawer')
  for(const label of ['上班时间','下班时间']){
    await win.webContents.executeJavaScript(`document.querySelector('button[aria-label="${label}"] span').click()`)
    await wait(100)
    const timeLayout=await win.webContents.executeJavaScript(`(()=>{const p=document.querySelector('.workday-time-popup:popover-open'),s=p?.querySelector('select'),o=s?.selectedOptions[0];if(!s||!o)return null;const r=s.getBoundingClientRect(),a=o.getBoundingClientRect();return {height:p.getBoundingClientRect().height,width:p.getBoundingClientRect().width,font:Number.parseFloat(getComputedStyle(s).fontSize),rows:s.size,rowHeight:a.height,selectedVisible:a.top>=r.top-1&&a.bottom<=r.bottom+1,label:s.getAttribute('aria-label')}})()`)
    assert.ok(timeLayout&&timeLayout.height<=160&&timeLayout.width<=70&&timeLayout.font>=14&&timeLayout.rows===6&&timeLayout.selectedVisible&&timeLayout.label===label,`${label} six-row dropdown starts at saved time: ${JSON.stringify(timeLayout)}`)
    await win.webContents.executeJavaScript(`document.querySelector('.workday-time-popup:popover-open').hidePopover()`)
  }
  console.log('PASS: start/end text triggers compact time dropdown')
  app.quit()
}).catch(error=>{console.error(error.stack||error);require('electron').app.exit(1)})

