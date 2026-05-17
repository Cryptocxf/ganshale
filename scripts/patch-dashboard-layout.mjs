import fs from 'node:fs'

const p = 'scripts/write-daily-dashboard.mjs'
let s = fs.readFileSync(p, 'utf8')

const marker = '<div className="REMOVE_START">'
const i = s.indexOf(marker)
if (i < 0) {
  console.error('REMOVE_START not found')
  process.exit(1)
}

const blockStart = s.lastIndexOf('        <motion.div className="flex min-h-0 min-w-0 flex-col">', i)
const start =
  blockStart >= 0
    ? blockStart
    : s.lastIndexOf('        <div className="flex min-h-0 min-w-0 flex-col">', i)
const blockEnd = s.indexOf('      </section>', i)
const replacement = `        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
            <AppDurationCompare day={day} events={allRows} ready={ready} />
          </div>
        </div>
`

s = s.slice(0, start) + replacement + s.slice(blockEnd)
fs.writeFileSync(p, s)
console.log('patched ok')
