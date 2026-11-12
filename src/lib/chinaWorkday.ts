/** 国办发明电〔2025〕7号。未知年份返回 null，不把普通周一至周五冒充法定工作日。 */
export function lastChinaWorkdayOfMonth(month: Date): number | null {
  if (month.getFullYear() !== 2026) return null
  const holidays = [[1, 1, 3], [2, 15, 23], [4, 4, 6], [5, 1, 5], [6, 19, 21], [9, 25, 27], [10, 1, 7]]
  const working = new Set(['1-4', '2-14', '2-28', '5-9', '9-20', '10-10'])
  const m = month.getMonth() + 1
  for (let day = new Date(2026, m, 0).getDate(); day > 0; day--) {
    if (working.has(`${m}-${day}`)) return day
    if (holidays.some(([hm, from, to]) => hm === m && day >= from && day <= to)) continue
    const weekday = new Date(2026, m - 1, day).getDay()
    if (weekday !== 0 && weekday !== 6) return day
  }
  return null
}
