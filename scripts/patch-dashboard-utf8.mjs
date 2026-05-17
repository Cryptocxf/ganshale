import fs from 'node:fs'
const p = 'src/components/DailyDashboard.tsx'
let s = fs.readFileSync(p, 'utf8')

const block = `function WindowTableHead() {
  const th = 'whitespace-nowrap px-0.5 py-1 text-[9px]'
  const thWide = 'px-1 py-1 text-[9px]'
  return (
    <thead className="sticky top-0 z-[1] border-b border-ganshale-border bg-ganshale-page font-medium text-ganshale-subtle text-[9px]">
      <tr>
        <th className="px-0.5 py-1" aria-hidden />
        <th className={th}>??</th>
        <th className={th}>??</th>
        <th className={th}>??</th>
        <th className={th}>??</th>
        <th className={thWide}>?? / ??</th>
        <th className={thWide}>??</th>
      </tr>
    </thead>
  )
}`

const blockNew = `function WindowTableHead() {
  const th = 'whitespace-nowrap px-0.5 py-1 text-[9px]'
  const thWide = 'px-1 py-1 text-[9px]'
  return (
    <thead className="sticky top-0 z-[1] border-b border-ganshale-border bg-ganshale-page font-medium text-ganshale-subtle text-[9px]">
      <tr>
        <th className="px-0.5 py-1" aria-hidden />
        <th className={th}>\u5e94\u7528</th>
        <th className={th}>\u5f00\u59cb</th>
        <th className={th}>\u7ed3\u675f</th>
        <th className={th}>\u65f6\u957f</th>
        <th className={thWide}>\u6807\u9898 / \u7a97\u53e3</th>
        <th className={thWide}>\u5907\u6ce8</th>
      </tr>
    </thead>
  )
}`

if (s.includes(block)) s = s.replace(block, blockNew)
else console.warn('WindowTableHead block missing')

const reps = [
  ["|| '??'", "|| '\u672a\u77e5'"],
  ["{title || '?'}", "{title || '\u2014'}"],
  ['placeholder="??"', 'placeholder="\u5907\u6ce8"'],
  ['text-ganshale-muted">????</p>', 'text-ganshale-muted">\u52a0\u8f7d\u4e2d\u2026</p>'],
  ["'??????????????'", "'\u4eca\u65e5\u5df2\u4e0b\u73ed\uff0c\u524d\u53f0\u91c7\u96c6\u5df2\u6682\u505c\u3002'"],
  ["'??????????????????'", "'\u6682\u65e0\u7a97\u53e3\u8bb0\u5f55\uff0c\u5207\u6362\u5e94\u7528\u540e\u4f1a\u5728\u6b64\u663e\u793a\u3002'"],
  ["'???????????????????'", "'\u5c1a\u672a\u5f00\u59cb\u91c7\u96c6\uff0c\u8bf7\u5728\u9876\u90e8\u70b9\u51fb\u300c\u4e0a\u73ed\u4e2d\u300d\u3002'"],
  [
    'font-display text-sm font-semibold text-ganshale-text">\u5b9e\u65f6\u7a97\u53e3\u8bb0\u5f55</h2>\n              <input',
    'font-display text-sm font-semibold text-ganshale-text">\u4eca\u65e5\u6253\u5de5\u65f6\u957f</h2>\n              <input',
  ],
  ['aria-label="????"', 'aria-label="\u9009\u62e9\u65e5\u671f"'],
  [
    '????????????????????????????????????',
    '\u663e\u793a\u8be5\u81ea\u7136\u65e5\u5185\u3001\u547d\u4e2d\u76d1\u63a7\u5217\u8868\u7684\u5e94\u7528\u524d\u53f0\u7d2f\u8ba1\u65f6\u957f\u3002\u5207\u56de\u300c\u4eca\u5929\u300d\u67e5\u770b\u5f53\u65e5\u7d2f\u8ba1\u3002',
  ],
  [
    '???????????????? 0 ??????????????????????',
    '\u4eca\u65e5\u5df2\u4e0b\u73ed\uff0c\u524d\u53f0\u91c7\u96c6\u5df2\u6682\u505c\uff1b\u6b21\u65e5 0 \u70b9\u6216\u70b9\u51fb\u300c\u4e0a\u73ed\u4e2d\u300d\u540e\u7ee7\u7eed\u7d2f\u8ba1\u76d1\u63a7\u5185\u5e94\u7528\u65f6\u957f\u3002',
  ],
  ['???????????? 0?', '\u76d1\u63a7\u5217\u8868\u4e3a\u7a7a\uff0c\u4eca\u65e5\u7d2f\u8ba1\u4e3a 0\u3002'],
  ['????????????????', '\u4ec5\u7edf\u8ba1\u76d1\u63a7\u5217\u8868\u4e2d\u7684\u5e94\u7528\u524d\u53f0\u65f6\u957f\u3002'],
  ["{ready ? '8:00 \u81f3 24:00\uff0c\u6309\u5c0f\u65f6\u6c47\u603b\u524d\u53f0\u65f6\u957f' : '????'}", "{ready ? '8:00 \u81f3 24:00\uff0c\u6309\u5e94\u7528\u5c55\u793a\u524d\u53f0\u65f6\u6bb5' : '\u52a0\u8f7d\u4e2d\u2026'}"],
  ['py-5 text-center text-xs text-ganshale-muted">????</p>', 'py-5 text-center text-xs text-ganshale-muted">\u52a0\u8f7d\u4e2d\u2026</p>'],
  ['??????????????', '\u76d1\u63a7\u5217\u8868\u4e3a\u7a7a\uff0c\u6682\u65e0\u65f6\u957f\u6570\u636e\u3002'],
  ['?? 8:00?24:00 ?????????????', '\u5f53\u65e5 8:00\u201424:00 \u6682\u65e0\u547d\u4e2d\u76d1\u63a7\u5217\u8868\u7684\u524d\u53f0\u8bb0\u5f55'],
  ['??????\n              </h2>\n              <button\n                type="button"\n                onClick={() => setWindowLogModalOpen(false)}', '\u5b9e\u65f6\u7a97\u53e3\u8bb0\u5f55\n              </h2>\n              <button\n                type="button"\n                onClick={() => setWindowLogModalOpen(false)}'],
  ['aria-label="??"', 'aria-label="\u5173\u95ed"'],
]

for (const [a, b] of reps) {
  if (s.includes(a)) s = s.split(a).join(b)
  else console.warn('skip', a.slice(0, 40))
}

s = s.replace(
  `  const hourlyBuckets = useMemo(
    () => hourlyWorkdayBucketsFromTimeline(timeline, WORKDAY_CHART_START_HOUR, WORKDAY_CHART_END_HOUR),
    [timeline],
  )
  const hourlyHasData = useMemo(() => hourlyBuckets.some((b) => b.totalSec > 0), [hourlyBuckets])`,
  `  const timelineHasData = useMemo(() => timeline.length > 0, [timeline])`,
)

s = s.replace(
  '<WorkdayHourlyBarChart buckets={hourlyBuckets} />',
  '<WorkdayHourlyBarChart segments={timeline} />',
)
s = s.replace('!hourlyHasData', '!timelineHasData')
s = s.replace('{hourlyHasData', '{timelineHasData')

s = s.replace(
  "  hourlyWorkdayBucketsFromTimeline,\n",
  '',
)
s = s.replace(
  'import { WorkdayHourlyBarChart, WORKDAY_CHART_END_HOUR, WORKDAY_CHART_START_HOUR }',
  'import { WorkdayHourlyBarChart }',
)

fs.writeFileSync(p, s, 'utf8')
console.log('done')
