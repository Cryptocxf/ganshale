import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dashPath = path.join(__dirname, '../src/components/DailyDashboard.tsx')
const templatePath = path.join(__dirname, 'daily-dashboard-return.txt')

const marker = '  const modalRows = useMemo(() => allRows.slice(0, 40), [allRows])'
const src = fs.readFileSync(dashPath, 'utf8')
const idx = src.indexOf(marker)
if (idx < 0) throw new Error('modalRows marker not found — file may be too corrupted')

const head = src.slice(0, idx + marker.length)
const template = fs.readFileSync(templatePath, 'utf8')
const tailStart = src.indexOf('      {windowLogModalOpen ? (')
if (tailStart < 0) throw new Error('modal marker not found')

let tail = src.slice(tailStart)
tail = tail.replace(
  /<colgroup>[\s\S]*?<\/colgroup>\s*<WindowTableHead mini \/>\s*<WindowEventTableBody[\s\S]*?\/>/,
  `{WINDOW_TABLE_MODAL_COLGROUP}
                <WindowTableHead mini />
                <WindowEventTableBody
                  rows={modalRows}
                  remarks={remarks}
                  setRemarks={setRemarks}
                  mini
                />`,
)

fs.writeFileSync(dashPath, `${head}\n\n${template}\n\n${tail}`)
console.log('patched ok')
