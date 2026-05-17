import fs from 'node:fs'
const p = 'src/components/DailyDashboard.tsx'
let s = fs.readFileSync(p, 'utf8')

const start = s.indexOf('        {!ready || !hourlyHasData ? (')
const end = s.indexOf('        )}\n      </section>', start)
if (start < 0 || end < 0) {
  console.error('range not found', start, end)
  process.exit(1)
}

const neu = `        {!ready ? (
          <p className="py-5 text-center text-xs text-ganshale-muted">\u52a0\u8f7d\u4e2d\u2026</p>
        ) : patterns.length === 0 ? (
          <p className="py-5 text-center text-xs text-ganshale-muted">
            \u76d1\u63a7\u5217\u8868\u4e3a\u7a7a\uff0c\u6682\u65e0\u65f6\u957f\u6570\u636e\u3002
          </p>
        ) : (
          <>
            <WorkdayHourlyBarChart buckets={hourlyBuckets} />
            {!hourlyHasData ? (
              <p className="mt-2 text-center text-[10px] text-ganshale-muted">
                \u5f53\u65e5 8:00\u201424:00 \u6682\u65e0\u547d\u4e2d\u76d1\u63a7\u5217\u8868\u7684\u524d\u53f0\u8bb0\u5f55
              </p>
            ) : (
              <div className="mt-2 flex max-h-7 flex-wrap gap-x-2 gap-y-0.5 overflow-hidden">
                {[...new Map(timeline.map((s) => [s.label, s.color])).entries()].map(([label, color]) => (
                  <span key={label} className="inline-flex items-center gap-1 text-[10px] text-ganshale-muted">
                    <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </>
        )`

s = s.slice(0, start) + neu + s.slice(end)
fs.writeFileSync(p, s, 'utf8')
console.log('ok')
