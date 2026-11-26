import { brickHours, summarizeBricks, type DayBrick } from './brickStats'
import { APP_DISPLAY_NAME, APP_ENGLISH_NAME } from '../constants/brand'
import { brickDateCaption, brickHoleCount, brickScenePlot, buildBrickColumns, layoutBrickColumns } from './brickChart'
import { brickHighlights } from './brickHighlights'
import { brickCharacterSpeech } from './brickCharacterSpeech'
import { brickRestDay } from './brickRestDay'

export type BrickAssets = { theme?: 'light'|'dark'; fronts: HTMLImageElement; characters: HTMLImageElement; logo: HTMLImageElement; icons?: Map<string,HTMLImageElement>; background?: HTMLImageElement }
export type BrickRect = { x: number; y: number; w: number; h: number }
export type BrickHit = BrickRect & { date: string; id:string }
export type BrickExportRatio = '16:9' | '9:16'
export const BRICK_EXPORT_SIZES = { '16:9': { width: 1920, height: 1080 }, '9:16': { width: 1080, height: 1920 } } as const
const ink = '#292e29', copper = '#6d7667'
const gold='#97651d',terracotta='#b45f49',rule='#a783555e'
function archiveIcon(ctx:CanvasRenderingContext2D,kind:'calendar'|'clock'|'trophy',x:number,y:number,size:number){
  ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.strokeStyle=gold;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath()
  if(kind==='clock'){ctx.arc(12,12,9,0,Math.PI*2);ctx.moveTo(12,6);ctx.lineTo(12,12);ctx.lineTo(16,14)}
  else if(kind==='calendar'){ctx.roundRect(3,5,18,16,2);ctx.moveTo(3,10);ctx.lineTo(21,10);ctx.moveTo(8,3);ctx.lineTo(8,7);ctx.moveTo(16,3);ctx.lineTo(16,7)}
  else{ctx.moveTo(7,3);ctx.lineTo(17,3);ctx.lineTo(17,10);ctx.bezierCurveTo(17,18,7,18,7,10);ctx.closePath();ctx.moveTo(7,5);ctx.lineTo(3,5);ctx.bezierCurveTo(2,11,5,12,7,12);ctx.moveTo(17,5);ctx.lineTo(21,5);ctx.bezierCurveTo(22,11,19,12,17,12);ctx.moveTo(12,16);ctx.lineTo(12,21);ctx.moveTo(8,21);ctx.lineTo(16,21)}
  ctx.stroke();ctx.restore()
}
const appFont = () => "'Segoe UI', 'Microsoft YaHei', sans-serif"
const darkContexts=new WeakSet<CanvasRenderingContext2D>()
const text = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color = ink, weight = '400') => { ctx.fillStyle = darkContexts.has(ctx) ? (color==='#59432e'||color==='#26150f'?color:color==='#b6382e'?'#f1978c':color===gold||color===terracotta?'#83c8ba':'#d8e5e1') : color; ctx.font = `${weight} ${size}px ${appFont()}`; ctx.fillText(value, x, y) }
function wordmark(ctx:CanvasRenderingContext2D,x:number,y:number,size:number){
  text(ctx,APP_DISPLAY_NAME,x,y,size,ink,'600')
  const width=ctx.measureText(APP_DISPLAY_NAME).width,englishSize=Math.max(8,size-4)
  ctx.font=`500 ${englishSize}px ${appFont()}`
  const englishWidth=ctx.measureText(APP_ENGLISH_NAME).width
  text(ctx,APP_ENGLISH_NAME,x+(width-englishWidth)/2,y+englishSize+2,englishSize,ink,'500')
}
function face(ctx: CanvasRenderingContext2D, asset: HTMLImageElement, grade: number, box: BrickRect) {
  const sw=asset.naturalWidth/4,sh=asset.naturalHeight/4
  const {x,y,w,h}=box,r=Math.min(h*.15,w*.07),edge=Math.max(.4,h*.025)
  ctx.save()
  // Fill the face to its contact boundary: atlas transparency must not become a gap.
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip()
  ctx.fillStyle='#b96b3c';ctx.fillRect(x,y,w,h)
  // Sample only the clay grain; the chosen geometric frame is resolution-independent.
  ctx.globalAlpha=.04
  ctx.drawImage(asset,grade%4*sw+sw*.36,Math.floor(grade/4)*sh+sh*.46,sw*.12,sh*.10,x,y,w,h)
  ctx.globalAlpha=1
  const bevel=ctx.createLinearGradient(x,y,x,y+h)
  bevel.addColorStop(0,'#ffe5b56b');bevel.addColorStop(.12,'#ffce8b16');bevel.addColorStop(.65,'#71301200');bevel.addColorStop(1,'#54250c70')
  ctx.fillStyle=bevel;ctx.fillRect(x,y,w,h)
  const volume=ctx.createLinearGradient(x,y,x+w,y+h*.3)
  volume.addColorStop(0,'#ffce8b22');volume.addColorStop(.55,'#71301200');volume.addColorStop(1,'#59230f55')
  ctx.fillStyle=volume;ctx.fillRect(x,y,w,h)
  // Stepped double frame and square corner recesses: 02 clay colour + 07 geometry.
  const inset=h*.13,corner=h*.17
  const frame=()=>{
    const l=x+inset,t=y+inset,rr=x+w-inset,b=y+h-inset,c=corner
    ctx.beginPath();ctx.moveTo(l+c,t);ctx.lineTo(rr-c,t);ctx.lineTo(rr-c,t+c);ctx.lineTo(rr,t+c)
    ctx.lineTo(rr,b-c);ctx.lineTo(rr-c,b-c);ctx.lineTo(rr-c,b);ctx.lineTo(l+c,b)
    ctx.lineTo(l+c,b-c);ctx.lineTo(l,b-c);ctx.lineTo(l,t+c);ctx.lineTo(l+c,t+c);ctx.closePath()
  }
  ctx.lineJoin='miter';ctx.lineWidth=Math.max(.5,h*.035);ctx.strokeStyle='#713b24';frame();ctx.stroke()
  ctx.save();ctx.translate(0,h*.024);ctx.lineWidth=Math.max(.35,h*.018);ctx.strokeStyle='#efb37c';frame();ctx.stroke();ctx.restore()
  if(h>=10){
    const size=corner*.52
    for(const [cx,cy] of [[x+inset,y+inset],[x+w-inset-size,y+inset],[x+inset,y+h-inset-size],[x+w-inset-size,y+h-inset-size]]){
      ctx.fillStyle='#874627';ctx.fillRect(cx,cy,size,size)
      ctx.strokeStyle='#edb17b';ctx.lineWidth=Math.max(.35,h*.018);ctx.strokeRect(cx,cy,size,size)
    }
  }
  // The dark contact seam belongs to the supporting brick, with a lit upper lip.
  ctx.fillStyle='#60271391';ctx.fillRect(x,y+h-edge,w,edge)
  ctx.fillStyle='#ffd5a17d';ctx.fillRect(x+r,y,w-r*2,edge)
  ctx.restore()
}
/** Narrow exposed planes retain a straight-on front and touching stack boundaries. */
function brickDepth(ctx:CanvasRenderingContext2D,asset:HTMLImageElement,box:BrickRect,exposeTop:boolean){
  const {x,y,w,h}=box,dx=Math.min(w*.13,h*.23),dy=dx*.62
  void asset
  ctx.save()
  ctx.beginPath();ctx.moveTo(x+w,y);ctx.lineTo(x+w+dx,y-dy);ctx.lineTo(x+w+dx,y+h-dy);ctx.lineTo(x+w,y+h);ctx.closePath()
  ctx.save();ctx.clip();ctx.fillStyle='#9a522e';ctx.fillRect(x+w,y-dy,dx,h+dy)
  const side=ctx.createLinearGradient(x+w,y,x+w+dx,y)
  side.addColorStop(0,'#79311280');side.addColorStop(1,'#48200dc9');ctx.fillStyle=side;ctx.fillRect(x+w,y-dy,dx,h+dy);ctx.restore()
  ctx.strokeStyle='#67301794';ctx.lineWidth=Math.max(.35,h*.02);ctx.stroke()
  if(exposeTop){
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y-dy);ctx.lineTo(x+w+dx,y-dy);ctx.lineTo(x+w,y);ctx.closePath()
    ctx.save();ctx.clip();ctx.fillStyle='#c98651';ctx.fillRect(x,y-dy,w+dx,dy)
    ctx.fillStyle='#ffd09670';ctx.fillRect(x,y-dy,w+dx,dy);ctx.restore()
    ctx.strokeStyle='#f4ba7cbb';ctx.stroke()
  }
  ctx.restore()
}
/** Carved holes are drawn on the same solid clay texture, never printed numerals. */
export function drawHourlyHoles(ctx:CanvasRenderingContext2D,box:BrickRect,seconds:number){
  ctx.save()
  for(let index=0;index<brickHoleCount(seconds);index++){
    const x=box.x+box.w*(.21+(index%4)*.193),y=box.y+box.h*(.23+Math.floor(index/4)*.27)
    const rx=box.w*.058,ry=box.h*.10
    const shade=ctx.createRadialGradient(x,y+ry*.35,0,x,y,rx*1.3)
    shade.addColorStop(0,'#1f1009');shade.addColorStop(.55,'#48200e');shade.addColorStop(1,'#a34821')
    ctx.fillStyle=shade;ctx.strokeStyle='#edac79';ctx.lineWidth=Math.max(.35,box.h*.025)
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke()
  }
  ctx.restore()
}
/** Chronological hourly/monthly brick columns, shared by the client and export. */
export function drawBrickTower(ctx: CanvasRenderingContext2D, days: DayBrick[], assets: BrickAssets, box: BrickRect, mode: 'month' | 'year', selected = '', fillStage = false): BrickHit[] {
  if(assets.theme==='dark')darkContexts.add(ctx);else darkContexts.delete(ctx)
  const columns=buildBrickColumns(days,mode),workerSpace=box.w*(mode==='month'?.10:.22),baseSize=180,sceneScale=.5,faceRatio=.52
  const plot=brickScenePlot(box,mode)
  const cells=layoutBrickColumns(columns,plot,mode),bottom=plot.y+plot.h
  ctx.save()
  ctx.textAlign='center'
  const first=cells[0],pitch=mode==='year'?(first?.w??plot.w/12):plot.w/columns.length,labelLeft=mode==='year'?plot.x+(plot.w-pitch*12)/2:plot.x
  columns.forEach((column,index)=>{
    const caption=column.date?brickDateCaption(column.date):null
    const color=caption?.red?'#b6382e':'#59432e',x=labelLeft+pitch*(index+.5),size=Math.min(12,Math.max(7,pitch*.30))
    text(ctx,mode==='month'?column.label.replace('日',''):column.label,x,bottom+18,size,color)
    if(mode==='month'&&caption)text(ctx,caption.weekday,x,bottom+33,size*.9,color)
  })
  const hits:BrickHit[]=[]
  // One grounded shadow per column rather than a floating shadow on every brick.
  ctx.save();ctx.fillStyle='#64391d2e';ctx.shadowColor='#57351e50';ctx.shadowBlur=5
  for(const column of columns){
    const base=cells.find(cell=>cell.id===column.bricks[0]?.id)
    if(base){ctx.beginPath();ctx.ellipse(base.x+base.w/2,bottom+1,base.w*.52,Math.max(1,base.h*.07),0,0,Math.PI*2);ctx.fill()}
  }
  ctx.restore()
  const exposedTops=new Set(columns.flatMap(column=>column.bricks.length?[column.bricks[column.bricks.length-1].id]:[]))
  // Paint depth behind every front so no side plane hides the next brick's holes.
  for(const cell of cells)brickDepth(ctx,assets.fronts,cell,exposedTops.has(cell.id))
  for(const cell of cells){
    face(ctx,assets.fronts,0,{...cell,x:cell.x+.25,y:cell.y+.15,w:Math.max(.5,cell.w-.5),h:Math.max(.5,cell.h-.3)})
    if(mode==='year'&&cell.h>=8){
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle'
      text(ctx,String(Number(cell.day.date.slice(8))),cell.x+cell.w/2,cell.y+cell.h*.52,Math.min(cell.h*.65,cell.w*.42),'#26150f','700')
      ctx.restore()
    }
    if(cell.id===selected){
      const rest=brickRestDay(cell.day.date)
      ctx.save();ctx.strokeStyle=rest.kind==='holiday'?'#ef4444':rest.kind==='weekend'?'#2389ef':'#e0a13d';ctx.shadowColor=ctx.strokeStyle
      ctx.shadowBlur=10;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cell.x,cell.y,cell.w,cell.h,Math.min(4,cell.h*.15));ctx.stroke();ctx.stroke();ctx.restore()
    }
    hits.push({x:cell.x,y:cell.y,w:cell.w,h:cell.h,date:cell.day.date,id:cell.id})
  }
  if(mode==='month'){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom'
    for(const column of columns){
      const top=cells.find(cell=>cell.id===column.bricks.at(-1)?.id)
      if(top)text(ctx,String(column.bricks.length),top.x+top.w/2,top.y-8,Math.min(14,Math.max(9,pitch*.4)),'#875b22','600')
    }
    ctx.restore()
  }
  const total = days.reduce((sum, day) => sum + day.seconds, 0) / 3600
  const tired = total >= (mode === 'month' ? 80 : 900), exhausted = total >= (mode === 'month' ? 160 : 1800)
  const cell = exhausted ? 2 : tired ? 1 : 0, height = Math.min(box.h * (fillStage ? .96 : .65), baseSize * faceRatio * 3.2) * sceneScale, sw = assets.characters.naturalWidth / 2, sh = assets.characters.naturalHeight / 2
  ctx.drawImage(assets.characters, cell % 2 * sw, Math.floor(cell / 2) * sh, sw, sh, box.x + (workerSpace - height) / 2, bottom - height + 4, height, height)
  if (!days.length) text(ctx, '暂无工时记录', plot.x+8, box.y + box.h / 2, Math.min(18,box.w*.018), copper)
  const speech=brickCharacterSpeech(total*3600,mode).split('\n'),fontSize=Math.max(9,Math.min(fillStage?12:15,box.w*.018))
  ctx.font=`500 ${fontSize}px ${appFont()}`
  const bubbleW=Math.max(...speech.map(row=>ctx.measureText(row).width))+24,bubbleH=fontSize*3+16
  const headX=box.x+workerSpace/2,bubbleX=Math.max(box.x+4,Math.min(headX-bubbleW*.4,box.x+box.w-bubbleW-4)),bubbleY=Math.max(box.y+4,bottom-height-bubbleH-12)
  ctx.save();ctx.fillStyle='#fff5e4f2';ctx.strokeStyle='#b99569';ctx.lineWidth=1
  ctx.shadowColor='#472d1d20';ctx.shadowBlur=8;ctx.shadowOffsetY=2
  ctx.beginPath();ctx.roundRect(bubbleX,bubbleY,bubbleW,bubbleH,10);ctx.fill();ctx.stroke()
  ctx.shadowBlur=0;ctx.shadowOffsetY=0
  const tailX=Math.max(bubbleX+12,Math.min(headX,bubbleX+bubbleW-20))
  ctx.beginPath();ctx.moveTo(tailX,bubbleY+bubbleH-1);ctx.lineTo(tailX+7,bubbleY+bubbleH+9);ctx.lineTo(tailX+13,bubbleY+bubbleH-1);ctx.fill();ctx.stroke()
  ctx.textAlign='center'
  speech.forEach((row,i)=>text(ctx,row,bubbleX+bubbleW/2,bubbleY+fontSize+10+i*fontSize*1.5,fontSize,'#59432e','500'))
  ctx.restore()
  const stats=summarizeBricks(days),font=Math.max(9,Math.min(22,box.w*.014)),left=box.x+box.w*.018,right=box.x+box.w*.79,rightW=box.w*.19
  ctx.textAlign='left'
  archiveIcon(ctx,'calendar',left,box.y+font*.9,font)
  text(ctx,mode==='year'?'年度工时档案':'月度工时档案',left+font*1.4,box.y+font*2,font,'#33281f','600')
  text(ctx,mode==='year'?'ANNUAL WORK ARCHIVE':'MONTHLY WORK ARCHIVE',left,box.y+font*3,font*.5,gold,'600')
  ctx.strokeStyle=rule;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,box.y+font*3.4);ctx.lineTo(left+box.w*.17,box.y+font*3.4);ctx.stroke()
  text(ctx,(stats.total/3600).toFixed(1).replace(/\.0$/,''),left,box.y+font*6,Math.min(64,box.w*.044),gold,'600')
  text(ctx,'累计投入（小时）',left,box.y+font*7.4,font*.85,'#715d49')
  ctx.beginPath();ctx.moveTo(left,box.y+font*8.3);ctx.lineTo(left+box.w*.17,box.y+font*8.3);ctx.stroke()
  ctx.fillStyle=terracotta;ctx.fillRect(left,box.y+font*9,3,font*1.2)
  text(ctx,`${days.length} 个记录日`,left+10,box.y+font*10,font*1.3,terracotta,'600')
  archiveIcon(ctx,'clock',left,box.y+font*10.7,font*.85)
  text(ctx,`日均 ${brickHours(stats.average)}`,left+font*1.2,box.y+font*11.4,font*.85,'#715d49')
  archiveIcon(ctx,'trophy',right,box.y+font*.9,font*1.2)
  text(ctx,mode==='year'?'本年之最':'本月之最',right+font*1.6,box.y+font*2,font*1.2,'#33281f','600')
  text(ctx,mode==='year'?'YEAR IN HIGHLIGHTS':'MONTH IN HIGHLIGHTS',right+font*1.6,box.y+font*3,font*.48,gold,'600')
  ctx.strokeStyle=rule;ctx.beginPath();ctx.moveTo(right-font,box.y+font);ctx.lineTo(right-font,bottom);ctx.stroke()
  const row=Math.min(120,Math.max(48,(box.h-font*5)/5))
  brickHighlights(days,mode).forEach((item,index)=>{
    const y=box.y+font*5+index*row
    ctx.strokeStyle='#96775755';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(right,y-font*.9);ctx.lineTo(right+rightW,y-font*.9);ctx.stroke()
    // Clock / calendar outline glyphs share the existing thin-stroke icon vocabulary.
    const s=font*.7,cx=right+s/2,cy=y-font*.35
    ctx.strokeStyle='#715d49';ctx.lineWidth=1.2;ctx.beginPath()
    if(index===2||index===3){ctx.arc(cx,cy,s/2,0,Math.PI*2);ctx.moveTo(cx,cy-s*.25);ctx.lineTo(cx,cy);ctx.lineTo(cx+s*.2,cy)}
    else{ctx.roundRect(right,cy-s/2,s,s,1);ctx.moveTo(right,cy-s*.15);ctx.lineTo(right+s,cy-s*.15)}ctx.stroke()
    text(ctx,item.label,right+font,y,font*.85,'#715d49')
    const captions=['LONGEST DAY',mode==='year'?'BUSIEST MONTH':'BUSIEST WEEK','EARLIEST START','LATEST FINISH','LONGEST STREAK']
    text(ctx,captions[index],right+font,y+font*.65,font*.4,gold,'500')
    text(ctx,item.value,right,y+font*2,font*1.2,index%2===0?gold:terracotta,'600')
    text(ctx,item.detail,right,y+font*3.1,font*.72,'#715d49')
  })
  ctx.restore(); return hits
}
/** Identical three-column exhibition content for both clipboard and download. */
export function renderBrickPoster(days:DayBrick[],assets:BrickAssets,period:string,mode:'month'|'year',_ratio:BrickExportRatio,selected=''):HTMLCanvasElement{
  const node=document.createElement('canvas');node.width=1920;node.height=1080
  const ctx=node.getContext('2d');if(!ctx)throw new Error('无法创建图片画布')
  if(assets.theme==='dark')darkContexts.add(ctx)
  ctx.fillStyle=assets.theme==='dark'?'#0c1417':assets.theme==='light'?'#f3f7f5':'#f4e5d0';ctx.fillRect(0,0,1920,1080)
  if(assets.background&&!assets.theme){
    const scale=Math.max(1920/assets.background.naturalWidth,1080/assets.background.naturalHeight),w=assets.background.naturalWidth*scale,h=assets.background.naturalHeight*scale
    ctx.drawImage(assets.background,(1920-w)/2,(1080-h)/2,w,h)
  }
  ctx.fillStyle='#fff8ed30';ctx.fillRect(0,0,1920,1080)
  if(assets.theme==='dark'){ctx.fillStyle='#eff5f1';ctx.beginPath();ctx.roundRect(50,34,72,72,12);ctx.fill()}
  ctx.drawImage(assets.logo,54,38,64,64);wordmark(ctx,132,67,30)
  ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(280,36);ctx.lineTo(280,128);ctx.stroke()
  text(ctx,'我搬砖，也能盖出点名堂',320,72,42,'#33281f','600')
  text(ctx,'每一天的投入，都有一块属于自己的位置。',322,110,22,'#715d49')
  text(ctx,'EVERY DAY LEAVES A TRACE',322,138,12,gold,'600')
  ctx.strokeStyle=rule;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(54,153);ctx.lineTo(1866,153);ctx.stroke()
  ctx.textAlign='right';text(ctx,period,1866,76,30,'#33281f','600');ctx.textAlign='left'
  drawBrickTower(ctx,days,assets,{x:36,y:156,w:1848,h:844},mode,selected,true)
  text(ctx,mode==='month'?'一小时内一块砖':'一天一块砖 · 砖面数字为日号',54,1042,19,'#715d49')
  ctx.textAlign='right';text(ctx,'时长记录投入，不定义工作的价值。',1866,1042,19,'#715d49')
  return node
}
