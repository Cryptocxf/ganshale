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
fs.writeFileSync(p, s, 'utf8')
