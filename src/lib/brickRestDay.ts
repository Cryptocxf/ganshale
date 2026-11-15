/** China mainland: State Council 2026 holiday notice, 国办发明电〔2025〕7号.
 * https://www.xinhuanet.com/politics/20251104/88bcffd88ae249e58c699b8772548e3d/c.html
 * Names cover the announced holiday breaks, including adjoining rest days.
 */
const holidays2026 = [
  [1,1,3,'元旦'],[2,15,23,'春节'],[4,4,6,'清明节'],[5,1,5,'劳动节'],
  [6,19,21,'端午节'],[9,25,27,'中秋节'],[10,1,7,'国庆节'],
] as const
const makeup2026 = new Set(['1-4','2-14','2-28','5-9','9-20','10-10'])
export type BrickRestDay = {kind:'holiday'|'weekend'|'workday'|'unknown';label:string;story:string}
export function brickRestDay(date:string):BrickRestDay{
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if(!match)return {kind:'unknown',label:'日历未核实',story:''}
  const [year,month,day]=match.slice(1).map(Number),local=new Date(year,month-1,day)
  if(year!==2026||local.getFullYear()!==year||local.getMonth()!==month-1||local.getDate()!==day)return {kind:'unknown',label:'日历未核实',story:''}
  if(makeup2026.has(`${month}-${day}`))return {kind:'workday',label:'调休补班',story:''}
  const holiday=holidays2026.find(([m,from,to])=>m===month&&day>=from&&day<=to)
  if(holiday)return {kind:'holiday',label:`${holiday[3]}假期`,story:`${holiday[3]}也留下了一块砖，辛苦了，记得给自己补回休息。`}
  if(local.getDay()===0||local.getDay()===6)return {kind:'weekend',label:'周末记录',story:'这是一块周末的砖，记录额外投入，也别忘了留点时间给自己。'}
  return {kind:'workday',label:'工作日',story:''}
}
