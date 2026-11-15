import type {DayBrick} from './brickStats'
import {brickRestDay} from './brickRestDay'
export type ChartBrick={id:string;day:DayBrick;unit:number;seconds:number;grade:0|2}
export type BrickColumn={label:string;date?:string;bricks:ChartBrick[]}
export function brickDateCaption(date:string){
  const [year,month,day]=date.split('-').map(Number),weekday=new Date(year,month-1,day).getDay()
  return {weekday:`周${'日一二三四五六'[weekday]}`,red:weekday===0||weekday===6||brickRestDay(date).kind==='holiday'}
}
/** A partial working hour occupies one hole; the face has three rows of four. */
export function brickHoleCount(seconds:number){
  return Number.isFinite(seconds)?Math.min(12,Math.max(0,Math.ceil(seconds/3600))):0
}
export function buildBrickColumns(days:DayBrick[],mode:'month'|'year',calendarMonth?:string):BrickColumn[]{
  const sorted=days.filter(day=>Number.isFinite(day.seconds)&&day.seconds>0).sort((a,b)=>a.date.localeCompare(b.date))
  if(mode==='year')return Array.from({length:12},(_,month)=>({label:`${month+1}月`,bricks:sorted.filter(day=>Number(day.date.slice(5,7))===month+1).map(day=>({id:`${day.date}:day`,day,unit:1,seconds:day.seconds,grade:2 as const}))}))
  const now=new Date(),monthKey=calendarMonth??days[0]?.date.slice(0,7)??`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const [year,month]=monthKey.split('-').map(Number),count=new Date(year,month,0).getDate()
  return Array.from({length:count},(_,index)=>{
    const date=`${monthKey}-${String(index+1).padStart(2,'0')}`,day=sorted.find(item=>item.date===date)
    return {label:`${index+1}日`,date,bricks:day?Array.from({length:Math.ceil(day.seconds/3600)},(_,unit)=>({id:`${day.date}:hour:${unit+1}`,day,unit:unit+1,seconds:Math.min(3600,day.seconds-unit*3600),grade:0 as const})):[]}
  })
}
export function brickScenePlot(box:{x:number;y:number;w:number;h:number},mode:'month'|'year'='year'){
  return {x:box.x+box.w*(mode==='month'?.12:.24),y:box.y+24,w:box.w*(mode==='month'?.64:.52),h:Math.max(1,box.h-64)}
}
export function layoutBrickColumns(columns:BrickColumn[],box:{x:number;y:number;w:number;h:number},mode:'month'|'year'='year'){
  const maxRows=Math.max(1,...columns.map(col=>col.bricks.length)),slot=box.w/Math.max(1,columns.length)
  const ratio=mode==='month'?.66:.45
  const h=Math.max(1,Math.min(mode==='month'?48:34,slot*ratio,(box.h-20)/maxRows)),w=Math.min(slot,h/ratio)
  const pitch=columns.length===12?w:slot,left=box.x+(box.w-pitch*columns.length)/2
  return columns.flatMap((col,column)=>col.bricks.map((brick,row)=>({...brick,x:left+pitch*(column+.5)-w/2,y:box.y+box.h-(row+1)*h,w,h})))
}
