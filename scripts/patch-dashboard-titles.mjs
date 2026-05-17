import fs from 'node:fs'

const p = 'src/components/DailyDashboard.tsx'
let s = fs.readFileSync(p, 'utf8')

s = s.replace(
  'lg:col-span-4 lg:self-start">\n          <div className="gs-card flex shrink-0 flex-col p-2.5 sm:p-3">\n            <div className="flex items-start justify-between gap-2">\n              <h2 className="font-display text-sm font-semibold text-ganshale-text">\u5b9e\u65f6\u7a97\u53e3\u8bb0\u5f55</h2>\n              <input',
  'lg:col-span-4 lg:self-start">\n          <div className="gs-card flex shrink-0 flex-col p-2.5 sm:p-3">\n            <div className="flex items-start justify-between gap-2">\n              <h2 className="font-display text-sm font-semibold text-ganshale-text">\u4eca\u65e5\u5de5\u4f5c\u65f6\u957f</h2>\n              <input',
)

s = s.replace(
  ": patterns.length === 0\n                ? '\u4eca\u65e5\u5df2\u4e0b\u73ed\uff0c\u524d\u53f0\u91c7\u96c6\u5df2\u6682\u505c\u3002'\n                : '\u5f53\u65e5 8:00\u201424:00",
  ": patterns.length === 0\n                ? '\u76d1\u63a7\u5217\u8868\u4e3a\u7a7a\uff0c\u6682\u65e0\u65f6\u957f\u6570\u636e\u3002'\n                : '\u5f53\u65e5 8:00\u201424:00",
)

fs.writeFileSync(p, s, 'utf8')
console.log('patched')
