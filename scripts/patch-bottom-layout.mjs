import fs from 'node:fs'

const p = 'scripts/write-daily-dashboard.mjs'
let s = fs.readFileSync(p, 'utf8')

const start = s.indexOf(
  '      <section className="grid min-h-0 min-h-[16rem] flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-2',
)
const end = s.indexOf('      {windowLogModalOpen ? (', start)
if (start < 0 || end < 0) {
  console.error('markers not found', start, end)
  process.exit(1)
}

const replacement = `      <section className="grid min-h-0 min-h-[16rem] flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-3 lg:items-stretch lg:gap-3">
        <div className="gs-card flex min-h-0 min-w-0 flex-col overflow-hidden">
          <AppCategoryDistribution day={day} events={allRows} ready={ready} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <DailyReportAiPanel variant="summary" day={day} events={allRows} remarks={remarks} />
        </div>
        <div className="gs-card flex min-h-0 min-w-0 flex-col justify-center p-2.5 sm:p-3">
          <div className="flex shrink-0 items-start justify-between gap-2">
            <DashboardSectionTitle icon={Timer}>\${u('\\u4eca\\u65e5\\u529e\\u516c\\u603b\\u65f6\\u957f')}</DashboardSectionTitle>
            <input
              type="date"
              value={toYmdLocal(day)}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                setDay(new Date(v + 'T12:00:00'))
              }}
              className="shrink-0 rounded-lg border border-black/[0.08] bg-white px-2 py-1 font-mono text-[11px] text-ganshale-text shadow-sm"
              aria-label="\${u('\\u9009\\u62e9\\u65e5\\u671f')}"
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5 py-3 text-center">
            <p className="font-display text-2xl font-semibold tabular-nums tracking-tight text-ganshale-text sm:text-3xl">
              {formatDurationHmsZh(sessionElapsedSec)}
            </p>
            {!isSelectedToday ? (
              <p className="max-w-[14rem] text-[10px] leading-snug text-ganshale-muted">
                \${u('\\u663e\\u793a\\u8be5\\u81ea\\u7136\\u65e5\\u5185\\u3001\\u547d\\u4e2d\\u76d1\\u63a7\\u5217\\u8868\\u7684\\u5e94\\u7528\\u524d\\u53f0\\u7d2f\\u8ba1\\u65f6\\u957f\\u3002\\u5207\\u56de\\u300c\\u4eca\\u5929\\u300d\\u67e5\\u770b\\u5f53\\u65e5\\u7d2f\\u8ba1\\u3002')}
              </p>
            ) : collectionPausedByUser ? (
              <p className="text-[10px] text-ganshale-muted">
                \${u('\\u4eca\\u65e5\\u5df2\\u4e0b\\u73ed\\uff0c\\u524d\\u53f0\\u91c7\\u96c6\\u5df2\\u6682\\u505c\\uff1b\\u6b21\\u65e5 0 \\u70b9\\u6216\\u70b9\\u51fb\\u300c\\u4e0a\\u73ed\\u4e2d\\u300d\\u540e\\u7ee7\\u7eed\\u7d2f\\u8ba1\\u76d1\\u63a7\\u5185\\u5e94\\u7528\\u65f6\\u957f\\u3002')}
              </p>
            ) : patterns.length === 0 ? (
              <p className="max-w-[14rem] text-[10px] leading-snug text-amber-800">\${u('\\u672a\\u914d\\u7f6e\\u76d1\\u63a7\\u5217\\u8868\\uff0c\\u5f53\\u524d\\u7edf\\u8ba1\\u5168\\u90e8\\u524d\\u53f0\\u7a97\\u53e3\\u65f6\\u957f\\u3002')}</p>
            ) : (
              <p className="max-w-[14rem] text-[10px] leading-snug text-ganshale-muted">
                \${u('\\u4ec5\\u7edf\\u8ba1\\u76d1\\u63a7\\u5217\\u8868\\u4e2d\\u7684\\u5e94\\u7528\\u524d\\u53f0\\u65f6\\u957f\\u3002')}
              </p>
            )}
          </div>
        </div>
      </section>

`

s = s.slice(0, start) + replacement + s.slice(end)
fs.writeFileSync(p, s)
console.log('patched bottom')
