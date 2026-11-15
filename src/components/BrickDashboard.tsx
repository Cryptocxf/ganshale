import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { getEventsInRange } from '../lib/idbStore'
import { loadMonitoredAppPatterns } from '../lib/monitoredAppsStore'
import { loadWorkRecords, WORK_RECORDS_UPDATED_EVENT } from '../lib/workRecordStore'
import { brickDuration, brickHours, buildBrickDays, summarizeBricks, type DayBrick } from '../lib/brickStats'
import { drawBrickTower, renderBrickPoster, type BrickAssets, type BrickHit } from '../lib/brickArtwork'
import { AppBrandIcon } from './AppBrandIcon'
import { brandIconUrl, bundledAppIconUrl, chartColorFromMap, chartColorMapForApps } from '../lib/appBrandIcons'
import { brickAppIdentity } from '../lib/brickAppPresentation'
import './brickDashboard.css'
import { BrandWordmark } from './brand/BrandWordmark'
import { CalendarDays, Clock3, Layers, BookOpen, FileText, ChartBar } from 'lucide-react'
import { buildBrickColumns } from '../lib/brickChart'
import { copyBrickCanvas } from '../lib/brickClipboard'
import { brickRestDay } from '../lib/brickRestDay'
import { BRICK_BACKGROUNDS } from '../lib/brickBackgrounds'

const base = import.meta.env.BASE_URL
const atlasUrl = `${base}brick-scene-clay-v3.png`
const frontUrl = `${base}brick-front-atlas-v1.png`
const characterUrl = `${base}brick-whitecollar-v1.png`
const logoUrl = `${base}ganshale-logo-app.png`
const cache = new Map<string, { at: number; days: DayBrick[] }>()
function BrickSprite({className}:{className:string}){
  return <svg className={className} preserveAspectRatio="xMidYMid slice" viewBox="100 0 100 100" role="img" aria-label="实心砖"><image href={atlasUrl} width={400} height={400}/></svg>
}
function AppBars({ apps }: { apps: [string, number][] }) {
  const total = apps.reduce((sum,[,seconds])=>sum+seconds,0)
  const colorMap=useMemo(()=>chartColorMapForApps(apps.map(([name])=>brickAppIdentity(name))),[apps])
  return <div className="brick-app-list">{apps.slice(0,5).map(([name,seconds],index)=><div className="brick-app" key={name}><b className="brick-app-rank">{index+1}</b><AppBrandIcon app={brickAppIdentity(name)} size={24}/><span className="brick-app-name" title={name}>{name}</span><span className="brick-app-track"><i style={{width:`${seconds/Math.max(1,apps[0][1])*100}%`,backgroundColor:chartColorFromMap(colorMap,brickAppIdentity(name))}}/></span><small title={`${brickDuration(seconds)} · ${(seconds/Math.max(1,total)*100).toFixed(1)}%`}>{brickHours(seconds)}</small></div>)}{!apps.length&&<p className="brick-empty-copy">暂无可展示的应用记录</p>}</div>
}
export function BrickDashboard() {
  const [mode,setMode] = useState<'month'|'year'>('month')
  const anchor=new Date()
  const year=anchor.getFullYear(),month=anchor.getMonth(),period=mode==='month'?`${year}年${month+1}月`:`${year}年`,key=`${mode}:${year}:${month}`
  const [loaded,setLoaded]=useState<{key:string;days:DayBrick[]}>({key:'',days:[]})
  const days=useMemo(()=>loaded.key===key?loaded.days:[],[loaded,key])
  const [selected,setSelected]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [revision,refresh]=useState(0)
  const [assets,setAssets]=useState<BrickAssets|null>(null)
  const [exporting,setExporting]=useState(false)
  const [backgroundIndex,setBackgroundIndex]=useState(0)
  const [backgroundImages,setBackgroundImages]=useState<HTMLImageElement[]>([])
  const [copyNote,setCopyNote]=useState('')
  const stage=useRef<HTMLElement>(null)
  const background=BRICK_BACKGROUNDS[backgroundIndex]
  const exportBusy=useRef(false),canvas=useRef<HTMLCanvasElement>(null),hits=useRef<BrickHit[]>([])
  const stats=useMemo(()=>summarizeBricks(days),[days])
  const columns=useMemo(()=>buildBrickColumns(days,mode),[days,mode])
  const bricks=useMemo(()=>columns.flatMap(column=>column.bricks),[columns])
  const selectedBrick=bricks.find(brick=>brick.id===selected)
  const chosen=mode==='year'?selectedBrick?.day:undefined
  const chosenRest=chosen?brickRestDay(chosen.date):null
  useEffect(()=>{
    let active=true
    const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('砖块素材读取失败，请刷新重试'));image.src=src})
    void Promise.all([load(frontUrl),load(characterUrl),load(logoUrl),load(atlasUrl),...BRICK_BACKGROUNDS.map(item=>load(`${base}${item.file}`))]).then(images=>{if(active){const [fronts,characters,logo]=images;setAssets({fronts,characters,logo});setBackgroundImages(images.slice(4,4+BRICK_BACKGROUNDS.length))}}).catch(e=>{if(active)setError(String(e))})
    return ()=>{active=false}
  },[])
  useEffect(()=>{
    let cancelled=false
    void (async()=>{
      await Promise.resolve();if(cancelled)return
      setLoading(true);setError('')
      const stored=cache.get(key)
      if(stored&&Date.now()-stored.at<3_600_000){setLoaded({key,days:stored.days});return}
      const result:DayBrick[]=[],patterns=loadMonitoredAppPatterns(),nowMs=Date.now()
      for(let m=mode==='month'?month:0;m<=(mode==='month'?month:11);m++){
        if(cancelled)return
        const start=new Date(year,m,1),end=new Date(year,m+1,1),lookback=new Date(start);lookback.setDate(lookback.getDate()-1)
        const events=await getEventsInRange('aw-watcher-window_web-ganshale',lookback.toISOString(),end.toISOString())
        result.push(...buildBrickDays(events,start,end,nowMs,patterns,day=>loadWorkRecords(day).filter(row=>row.content.trim()&&(row.saved||row.source==='system')).slice(0,3).map(row=>row.content.replace(/\s+/g,' ').trim()).join('；')))
        await new Promise(resolve=>setTimeout(resolve,0))
      }
      result.sort((a,b)=>b.seconds-a.seconds||a.date.localeCompare(b.date))
      if(!cancelled){cache.set(key,{at:Date.now(),days:result});setLoaded({key,days:result})}
    })().catch(e=>{if(!cancelled)setError(String(e))}).finally(()=>{if(!cancelled)setLoading(false)})
    return ()=>{cancelled=true}
  },[key,mode,year,month,revision])
  useEffect(()=>{
    const update=()=>{cache.delete(key);refresh(n=>n+1)}
    const timer=window.setInterval(update,mode==='year'?3_600_000:300_000)
    window.addEventListener(WORK_RECORDS_UPDATED_EVENT,update)
    return ()=>{clearInterval(timer);window.removeEventListener(WORK_RECORDS_UPDATED_EVENT,update)}
  },[key,mode])
  useEffect(()=>{if(!copyNote)return;const timer=setTimeout(()=>setCopyNote(''),4500);return ()=>clearTimeout(timer)},[copyNote])
  useEffect(()=>{
    const node=canvas.current,ctx=node?.getContext('2d');if(!node||!ctx||!assets)return
    const draw=()=>{
      const {width,height}=node.getBoundingClientRect();if(width<1||height<1)return
      const density=Math.min(2,window.devicePixelRatio||1)
      node.width=Math.round(width*density);node.height=Math.round(height*density);ctx.setTransform(density,0,0,density,0,0)
      hits.current=drawBrickTower(ctx,days,assets,{x:0,y:0,w:width,h:height},mode,selected,true)
    }
    const observer=new ResizeObserver(draw);observer.observe(node);draw()
    return ()=>observer.disconnect()
  },[days,assets,mode,selected])
  const exportImage=async(target:'download'|'clipboard'='download')=>{
    const ratio='16:9' as const
    if(exportBusy.current||!assets||loading||loaded.key!==key)return
    exportBusy.current=true;setExporting(true);setCopyNote('');setError('')
    if(target==='clipboard')setCopyNote('正在复制图片…')
    try{await document.fonts.ready
      const icons=new Map<string,HTMLImageElement>()
      await Promise.all(stats.apps.slice(0,5).map(async([name])=>{
        const identity=brickAppIdentity(name)
        const bundled=bundledAppIconUrl(identity)
        const native=bundled?null:await Promise.race([window.ganshaleDesktop?.getFileIcon?.(identity).catch(()=>null)??Promise.resolve(null),new Promise<null>(resolve=>setTimeout(()=>resolve(null),800))])
        const src=bundled||native||brandIconUrl(identity)
        if(!src)return
        const icon=await new Promise<HTMLImageElement|null>(resolve=>{const img=new Image(),timer=setTimeout(()=>resolve(null),1500);img.crossOrigin='anonymous';img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);resolve(null)};img.src=src})
        if(icon)icons.set(name,icon)
      }))
      const image=renderBrickPoster(days,{...assets,icons,background:backgroundImages[backgroundIndex]},period,mode,ratio,selected)
      if(target==='clipboard'){
        await copyBrickCanvas(image)
        setCopyNote('图片已复制，可直接粘贴')
      }else{const a=document.createElement('a');a.download=`我的搬砖记录-${period}-${ratio.replace(':','x')}.png`;a.href=image.toDataURL('image/png');a.click()}}
    catch(e){setCopyNote('');setError(target==='clipboard'?'复制失败，请完全退出并重启客户端后重试，或使用下载图片':e instanceof Error?e.message:String(e))}
    finally{exportBusy.current=false;setExporting(false)}
  }
  const selectPeriod=(next:'month'|'year')=>{cache.delete(`${next}:${year}:${month}`);setSelected('');setMode(next);refresh(n=>n+1)}
  const nextBackground=()=>{setBackgroundIndex(index=>(index+1)%BRICK_BACKGROUNDS.length)}
  return <div className="brick-page brick-immersive">


    {copyNote&&<p className="brick-copy-note" role="status">{copyNote}</p>}{error&&<p role="alert">{error}</p>}{(loading||loaded.key!==key)&&<p role="status">正在按月读取记录…</p>}
<main className="brick-main" data-story-open={Boolean(chosen)} data-scene={background.id} style={{backgroundImage:`url("${base}${background.file}")`,'--brick-stage-texture':`url("${base}${background.file}")`} as CSSProperties}>    <header className="brick-header"><div className="brick-brand"><img className="brick-logo" src={logoUrl} alt="干啥了 logo"/><BrandWordmark/></div><div className="brick-heading-copy"><h1>我搬砖，也能盖出点名堂</h1><p>每一天的投入，都有一块属于自己的位置。</p></div>

<div className="brick-toolbar"><div className="brick-period-switch" aria-label="记录周期"><button aria-pressed={mode==='month'} onClick={()=>selectPeriod('month')}>本月</button><button aria-pressed={mode==='year'} onClick={()=>selectPeriod('year')}>本年</button></div><div className="brick-download"><button className="brick-primary gs-toolbar-btn gs-toolbar-btn--accent" aria-busy={exporting} disabled={exporting||loading||!assets||loaded.key!==key} onClick={()=>void exportImage()}>下载图片</button></div></div>
    </header><section ref={stage} className="brick-art" data-background={background.id} tabIndex={0} aria-label={`造型展示区，当前背景：${background.name}`} title="左键点击空白切换背景，右键复制图片" onClick={event=>{if(!(event.target as HTMLElement).closest('button'))nextBackground()}} onContextMenu={event=>{event.preventDefault();void exportImage('clipboard')}} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();nextBackground()}if(event.target===event.currentTarget&&(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10'))){event.preventDefault();void exportImage('clipboard')}}}><div className="brick-scroll"><canvas ref={canvas} aria-label="工时砖块柱状图，点击砖块查看故事，再点同一块关闭" onClick={e=>{const box=e.currentTarget.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;const hit=hits.current.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);if(hit){e.stopPropagation();setSelected(current=>current===hit.id?'':hit.id)}}}/></div><div className="brick-accessible">{bricks.map(brick=><button key={brick.id} aria-pressed={selected===brick.id} onClick={()=>setSelected(current=>current===brick.id?'':brick.id)}>{brick.day.date} · {mode==='month'?`第${brick.unit}块，${brickDuration(brick.seconds)}`:'每日记录砖'} · {brickRestDay(brick.day.date).label}</button>)}</div></section>
{chosen&&<aside className="brick-story" data-rest-kind={chosenRest?.kind} aria-label="这块砖的故事"><h2><BookOpen aria-hidden size={21}/>这块砖的故事</h2>{chosen?<><div className="brick-story-overview"><div className="brick-story-art"><BrickSprite className="brick-specimen" /></div><div className="brick-story-facts"><p><CalendarDays aria-hidden size={15}/><time dateTime={chosen.date}>{chosen.date.slice(5).replace('-','月')}日</time></p><p><Clock3 aria-hidden size={15}/><span>工作 {brickHours(chosen.seconds)}</span></p><p className="brick-grade"><Layers aria-hidden size={14}/><span>{mode==='month'?`第${selectedBrick?.unit}块 · ${brickHours(selectedBrick?.seconds??0)}`:'每日记录砖 · 实心砖'}</span></p><p className="brick-saying-copy">{chosenRest?.story?<span className="brick-rest-message"><b>{chosenRest.label}</b>{chosenRest.story}</span>:mode==='month'?'同一天的小时砖，共用当天工作故事。':'一天一块，记录这一年的投入。'}</p></div></div><h3 className="brick-summary-title"><FileText aria-hidden size={18}/>工作总结</h3><p className="brick-summary">{chosen.summary||'当天暂无已保存的工作总结。'}</p><h3><ChartBar aria-hidden size={18}/>应用使用排行 <small>当日</small></h3><AppBars apps={chosen.apps}/></>:<p className="brick-empty-copy">记录一天，留下一块砖的故事。</p>}
      </aside>}
    </main>

  </div>
}
