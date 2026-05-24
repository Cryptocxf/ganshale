import { Download, Filter } from 'lucide-react'
import { useDataRecordsOptional } from '../../context/DataRecordsContext'

const BTN_CHROME =
  'gs-toolbar-btn shrink-0 px-3 py-1.5 text-[13px] font-medium tracking-[-0.02em]'
const BTN_EXPORT = BTN_CHROME
const BTN_FILTER = `${BTN_CHROME} gs-toolbar-btn--accent font-semibold`

export function DataRecordsHeaderActions() {
  const records = useDataRecordsOptional()
  if (!records) return null

  const { exportSelected, exportDisabled, selectedIds, onApplyFilters } = records

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:flex-none">
      <span
        className="inline-flex"
        title={
          exportDisabled
            ? '请先在下方表格中勾选要导出的记录'
            : `导出已选 ${selectedIds.size} 条记录为 CSV`
        }
      >
        <button
          type="button"
          className={BTN_EXPORT}
          onClick={exportSelected}
          disabled={exportDisabled}
          aria-label={
            exportDisabled
              ? '导出表格：请先在下方表格中勾选要导出的记录'
              : `导出表格，已选 ${selectedIds.size} 条`
          }
        >
          <Download className="h-4 w-4 opacity-90" strokeWidth={1.65} />
          导出表格
        </button>
      </span>
      <button type="button" onClick={onApplyFilters} className={BTN_FILTER}>
        <Filter className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.65} />
        筛选结果
      </button>
    </div>
  )
}
