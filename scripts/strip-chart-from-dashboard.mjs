import fs from 'node:fs'
const p = 'src/components/DailyDashboard.tsx'
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/)
const start = lines.findIndex((l) => l.startsWith('const WORKDAY_CHART_START_HOUR'))
const end = lines.findIndex((l) => l.startsWith('function WindowTableHead'))
if (start < 0 || end < 0) throw new Error(`markers not found: ${start} ${end}`)
const out = [...lines.slice(0, start), '', ...lines.slice(end)]
fs.writeFileSync(p, out.join('\n'), 'utf8')
console.log('removed lines', start + 1, 'to', end)
