import fs from 'node:fs'
const p = 'src/components/DailyDashboard.tsx'
let s = fs.readFileSync(p, 'utf8')
s = s.replace(
  '`${formatHourTick(bucket.hour)}?${formatHourTick(bucket.hour + 1)} ? ${formatDuration(bucket.totalSec)}`',
  '`${formatHourTick(bucket.hour)}\u2014${formatHourTick(bucket.hour + 1)} \u00b7 ${formatDuration(bucket.totalSec)}`',
)
s = s.replace(
  '`${formatHourTick(bucket.hour)}?${formatHourTick(bucket.hour + 1)}`',
  '`${formatHourTick(bucket.hour)}\u2014${formatHourTick(bucket.hour + 1)}`',
)
s = s.replace('`${p.label} ? ${formatDuration(p.sec)}`', '`${p.label} \u00b7 ${formatDuration(p.sec)}`')
s = s.replace(
  '{isWorkStart ? <span className="mt-0.5 text-[7px] text-emerald-800">??</span> : null}',
  '{isWorkStart ? <span className="mt-0.5 text-[7px] text-emerald-800">\u4e0a\u73ed</span> : null}',
)
s = s.replace(
  '{isWorkEnd ? <span className="mt-0.5 text-[7px] text-emerald-800">??</span> : null}',
  '{isWorkEnd ? <span className="mt-0.5 text-[7px] text-emerald-800">\u4e0b\u73ed</span> : null}',
)
fs.writeFileSync(p, s, 'utf8')
console.log('ok')
