import { brickClock, brickHours, summarizeBricks, type DayBrick } from './brickStats'
import { toYmdLocal } from './timeutil'

/** Presentation-only aggregates; never write back into collected work records. */
export function brickHighlights(days:DayBrick[],mode:'month'|'year'){
  const stats=summarizeBricks(days),groups=new Map<string,number>()
  for(const day of days){
    let key=day.date.slice(0,7)
    if(mode==='month'){
      const monday=new Date(`${day.date}T00:00:00`)
      monday.setDate(monday.getDate()-(monday.getDay()+6)%7)
      key=toYmdLocal(monday)
    }
    groups.set(key,(groups.get(key)??0)+day.seconds)
  }
  const busiest=[...groups].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]
  return [
    {label:'最长工作日',value:stats.longest?brickHours(stats.longest.seconds):'—',detail:stats.longest?.date??'暂无记录'},
    {label:mode==='year'?'最忙月份':'最忙一周',value:busiest?brickHours(busiest[1]):'—',detail:busiest?(mode==='year'?`${Number(busiest[0].slice(5))}月`:`${busiest[0].slice(5)} 起（本月记录）`):'暂无记录'},
    {label:'最早开始',value:brickClock(stats.earliest?.firstAt,stats.earliest?.date),detail:stats.earliest?.date??'暂无记录'},
    {label:'最晚结束',value:brickClock(stats.latest?.lastAt,stats.latest?.date),detail:stats.latest?.date??'暂无记录'},
    {label:'最长连续记录',value:days.length?`${stats.longestStreak}天`:'—',detail:'按自然日连续计算'},
  ]
}
