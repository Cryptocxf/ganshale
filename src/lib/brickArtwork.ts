import { brickHours, summarizeBricks, type DayBrick } from './brickStats'
import { APP_DISPLAY_NAME, APP_ENGLISH_NAME } from '../constants/brand'
import { brickHoleCount, brickScenePlot, buildBrickColumns, layoutBrickColumns } from './brickChart'
import { brickHighlights } from './brickHighlights'
import { brickCharacterSpeech } from './brickCharacterSpeech'
import { brickRestDay } from './brickRestDay'

export type BrickAssets = { fronts: HTMLImageElement; characters: HTMLImageElement; logo: HTMLImageElement; icons?: Map<string,HTMLImageElement>; background?: HTMLImageElement }
export type BrickRect = { x: number; y: number; w: number; h: number }
export type BrickHit = BrickRect & { date: string; id:string }
export type BrickExportRatio = '16:9' | '9:16'
export const BRICK_EXPORT_SIZES = { '16:9': { width: 1920, height: 1080 }, '9:16': { width: 1080, height: 1920 } } as const
const ink = '#292e29', copper = '#6d7667'
const appFont = () => getComputedStyle(document.body).fontFamily
const text = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color = ink, weight = '400') => { ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${appFont()}`; ctx.fillText(value, x, y) }
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
  ctx.fillStyle='#bd572a';ctx.fillRect(x,y,w,h)
  ctx.drawImage(asset,grade%4*sw+sw*.07,Math.floor(grade/4)*sh+sh*.32,sw*.86,sh*.46,x,y,w,h)
  const bevel=ctx.createLinearGradient(x,y,x,y+h)
  bevel.addColorStop(0,'#ffe5b56b');bevel.addColorStop(.12,'#ffce8b16');bevel.addColorStop(.65,'#71301200');bevel.addColorStop(1,'#54250c70')
  ctx.fillStyle=bevel;ctx.fillRect(x,y,w,h)
  const volume=ctx.createLinearGradient(x,y,x+w,y+h*.3)
  volume.addColorStop(0,'#ffce8b22');volume.addColorStop(.55,'#76300e00');volume.addColorStop(1,'#59230f55')
  ctx.fillStyle=volume;ctx.fillRect(x,y,w,h)
  // Recessed clay rim and restrained corner stamps, not separate sticker borders.
  const inset=Math.max(.8,h*.075),corner=Math.min(w*.11,h*.24)
  ctx.lineWidth=edge;ctx.strokeStyle='#6e2e186b'
  ctx.beginPath();ctx.roundRect(x+inset,y+inset,w-inset*2,h-inset*2,Math.max(.5,r));ctx.stroke()
  for(const [cx,cy,sx,sy] of [[x+inset,y+inset,1,1],[x+w-inset,y+inset,-1,1],[x+inset,y+h-inset,1,-1],[x+w-inset,y+h-inset,-1,-1]]){
    ctx.beginPath();ctx.moveTo(cx+sx*corner,cy);ctx.quadraticCurveTo(cx+sx*corner,cy+sy*corner,cx,cy+sy*corner)
    ctx.strokeStyle='#7a351c80';ctx.stroke()
    ctx.beginPath();ctx.moveTo(cx+sx*(corner+edge),cy+sy*edge);ctx.quadraticCurveTo(cx+sx*(corner+edge),cy+sy*(corner+edge),cx+sx*edge,cy+sy*(corner+edge))
    ctx.strokeStyle='#ffd2a378';ctx.stroke()
  }
  // The dark contact seam belongs to the supporting brick, with a lit upper lip.
  ctx.fillStyle='#60271391';ctx.fillRect(x,y+h-edge,w,edge)
  ctx.fillStyle='#ffd5a17d';ctx.fillRect(x+r,y,w-r*2,edge)
  ctx.restore()
}
/** Narrow exposed planes retain a straight-on front and touching stack boundaries. */
function brickDepth(ctx:CanvasRenderingContext2D,asset:HTMLImageElement,box:BrickRect,exposeTop:boolean){
  const {x,y,w,h}=box,dx=Math.min(w*.13,h*.23),dy=dx*.62
  const sw=asset.naturalWidth/4,sh=asset.naturalHeight/4
  ctx.save()
  ctx.beginPath();ctx.moveTo(x+w,y);ctx.lineTo(x+w+dx,y-dy);ctx.lineTo(x+w+dx,y+h-dy);ctx.lineTo(x+w,y+h);ctx.closePath()
  ctx.save();ctx.clip();ctx.drawImage(asset,sw*.72,sh*.32,sw*.16,sh*.46,x+w,y-dy,dx,h+dy)
  const side=ctx.createLinearGradient(x+w,y,x+w+dx,y)
  side.addColorStop(0,'#79311280');side.addColorStop(1,'#48200dc9');ctx.fillStyle=side;ctx.fillRect(x+w,y-dy,dx,h+dy);ctx.restore()
  ctx.strokeStyle='#67301794';ctx.lineWidth=Math.max(.35,h*.02);ctx.stroke()
  if(exposeTop){
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y-dy);ctx.lineTo(x+w+dx,y-dy);ctx.lineTo(x+w,y);ctx.closePath()
    ctx.save();ctx.clip();ctx.drawImage(asset,sw*.07,sh*.32,sw*.86,sh*.13,x,y-dy,w+dx,dy)
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
  const columns=buildBrickColumns(days,mode),workerSpace=box.w*.22,baseSize=180,sceneScale=.5,faceRatio=.52
  const plot=brickScenePlot(box)
  const cells=layoutBrickColumns(columns,plot),bottom=plot.y+plot.h
  ctx.save()
  ctx.textAlign='center'
  const first=cells[0],pitch=mode==='year'?(first?.w??plot.w/12):plot.w/columns.length,labelLeft=mode==='year'?plot.x+(plot.w-pitch*12)/2:plot.x
  columns.forEach((column,index)=>text(ctx,mode==='month'?column.label.replace('日',''):column.label,labelLeft+pitch*(index+.5),bottom+18,Math.min(12,Math.max(7,pitch*.30)),'#59432e'))
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
    if(cell.h>=8){
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
  text(ctx,mode==='year'?'年度工时档案':'月度工时档案',left,box.y+font*2,font,'#715d49')
  text(ctx,(stats.total/3600).toFixed(1).replace(/\.0$/,''),left,box.y+font*5,Math.min(64,box.w*.044),'#33281f','600')
  text(ctx,'累计投入（小时）',left,box.y+font*6.4,font*.85,'#715d49')
  text(ctx,`${days.length} 个记录日`,left,box.y+font*9,font*1.3,'#33281f','600')
  text(ctx,`日均 ${brickHours(stats.average)}`,left,box.y+font*10.7,font,'#715d49')
  text(ctx,mode==='year'?'本年之最':'本月之最',right,box.y+font*2,font*1.2,'#33281f','600')
  const row=Math.min(100,Math.max(48,(box.h-font*4)/5))
  brickHighlights(days,mode).forEach((item,index)=>{
    const y=box.y+font*4+index*row
    ctx.strokeStyle='#96775755';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(right,y-font*.9);ctx.lineTo(right+rightW,y-font*.9);ctx.stroke()
    // Clock / calendar outline glyphs share the existing thin-stroke icon vocabulary.
    const s=font*.7,cx=right+s/2,cy=y-font*.35
    ctx.strokeStyle='#715d49';ctx.lineWidth=1.2;ctx.beginPath()
    if(index===2||index===3){ctx.arc(cx,cy,s/2,0,Math.PI*2);ctx.moveTo(cx,cy-s*.25);ctx.lineTo(cx,cy);ctx.lineTo(cx+s*.2,cy)}
    else{ctx.roundRect(right,cy-s/2,s,s,1);ctx.moveTo(right,cy-s*.15);ctx.lineTo(right+s,cy-s*.15)}ctx.stroke()
    text(ctx,item.label,right+font,y,font*.85,'#715d49')
    text(ctx,item.value,right,y+font*1.55,font*1.2,'#33281f','600')
    text(ctx,item.detail,right,y+font*2.8,font*.72,'#715d49')
  })
  ctx.restore(); return hits
}
/** Identical three-column exhibition content for both clipboard and download. */
export function renderBrickPoster(days:DayBrick[],assets:BrickAssets,period:string,mode:'month'|'year',_ratio:BrickExportRatio,selected=''):HTMLCanvasElement{
  const node=document.createElement('canvas');node.width=1920;node.height=1080
  const ctx=node.getContext('2d');if(!ctx)throw new Error('无法创建图片画布')
  ctx.fillStyle='#f4e5d0';ctx.fillRect(0,0,1920,1080)
  if(assets.background){
    const scale=Math.max(1920/assets.background.naturalWidth,1080/assets.background.naturalHeight),w=assets.background.naturalWidth*scale,h=assets.background.naturalHeight*scale
    ctx.drawImage(assets.background,(1920-w)/2,(1080-h)/2,w,h)
  }
  ctx.fillStyle='#fff8ed30';ctx.fillRect(0,0,1920,1080)
  ctx.drawImage(assets.logo,54,38,64,64);wordmark(ctx,132,67,30)
  ctx.strokeStyle='#96775766';ctx.beginPath();ctx.moveTo(280,36);ctx.lineTo(280,112);ctx.stroke()
  text(ctx,'我搬砖，也能盖出点名堂',320,72,42,'#33281f','600')
  text(ctx,'每一天的投入，都有一块属于自己的位置。',322,110,22,'#715d49')
  ctx.textAlign='right';text(ctx,period,1866,76,30,'#33281f','600');ctx.textAlign='left'
  drawBrickTower(ctx,days,assets,{x:36,y:156,w:1848,h:844},mode,selected,true)
  text(ctx,mode==='month'?'一小时内一块砖 · 砖面数字为日号':'一天一块砖 · 砖面数字为日号',54,1042,19,'#715d49')
  ctx.textAlign='right';text(ctx,'时长记录投入，不定义工作的价值。',1866,1042,19,'#715d49')
  return node
}
