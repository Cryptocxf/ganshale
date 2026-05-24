import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { useDataRecords } from '../../context/DataRecordsContext'
import { formatDuration } from '../../lib/aggregations'
import { categoryChartColor } from '../../lib/categoryBarColors'
import {
  DATA_RECORD_KIND_OPTIONS,
  DURATION_FILTER_OPTIONS,
  MONTHLY_WEEK_OPTIONS,
  type DataRecordRow,
  type DataRecordsFilterState,
  type DurationFilterId,
  type MonthlyWeekFilterId,
  type SortDirection,
  type SortField,
} from '../../lib/dataRecordsQuery'
import { formatClock } from '../../lib/timeutil'
import { AppBrandIcon } from '../AppBrandIcon'
import {
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  DASHBOARD_PAIR_ICON_SIZE,
  DATA_PAGE_CLASS,
} from '../dashboardLayout'
import { DataRecordDetailModal } from './DataRecordDetailModal'

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const

const DATA_FILTER_SELECT_CLASS =
  'rounded-md border border-ganshale-border bg-ganshale-page px-2 py-0.5 text-[10px] font-medium leading-none text-ganshale-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
const DATA_FILTER_YEAR_SELECT_CLASS = `${DATA_FILTER_SELECT_CLASS} w-[4.5rem]`
const DATA_FILTER_MONTH_SELECT_CLASS = `${DATA_FILTER_SELECT_CLASS} w-[3.75rem]`
const DATA_FILTER_DAY_SELECT_CLASS = `${DATA_FILTER_SELECT_CLASS} w-[3.75rem]`
const DATA_PAGINATION_CONTROL_CLASS =
  'gs-field-input shrink-0 rounded-md px-1 py-0 text-[10px] leading-[1.25] tabular-nums text-ganshale-text focus:outline-none'
const TABLE_HEADER_SEARCH_INPUT =
  'gs-field-input min-w-0 w-20 rounded px-1.5 py-0.5 text-xs leading-none text-ganshale-text focus:outline-none sm:w-24'
const TABLE_HEADER_SEARCH_BTN =
  'inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium leading-none text-ganshale-accent transition hover:bg-ganshale-page hover:text-ganshale-text'

function SortToggle({
  label,
  field,
  sortField,
  sortDirection,
  onToggle,
}: {
  label: string
  field: SortField
  sortField: SortField
  sortDirection: SortDirection
  onToggle: (field: SortField) => void
}) {
  const active = sortField === field
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className="inline-flex shrink-0 items-center gap-0.5 text-ganshale-subtle transition hover:text-ganshale-text"
    >
      <span>{label}</span>
      <span className="inline-flex flex-col leading-none" aria-hidden>
        <ArrowUp
          className={[
            'h-2.5 w-2.5',
            active && sortDirection === 'asc' ? 'text-ganshale-text' : 'text-ganshale-muted/35',
          ].join(' ')}
          strokeWidth={2.5}
        />
        <ArrowDown
          className={[
            '-mt-0.5 h-2.5 w-2.5',
            active && sortDirection === 'desc' ? 'text-ganshale-text' : 'text-ganshale-muted/35',
          ].join(' ')}
          strokeWidth={2.5}
        />
      </span>
    </button>
  )
}

function TableSortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onToggle,
}: {
  label: string
  field: SortField
  sortField: SortField
  sortDirection: SortDirection
  onToggle: (field: SortField) => void
}) {
  return (
    <th className="px-2 py-2 font-medium">
      <SortToggle
        label={label}
        field={field}
        sortField={sortField}
        sortDirection={sortDirection}
        onToggle={onToggle}
      />
    </th>
  )
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase()
  if (!q || !text) return <>{text || '—'}</>
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-200/80 px-0.5 text-ganshale-text">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function CategoryTag({ row }: { row: DataRecordRow }) {
  const color = categoryChartColor(row.categoryId, 0)
  return (
    <span
      className="inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {row.categoryLabel}
    </span>
  )
}

function chipClass(active: boolean): string {
  return [
    'rounded-md px-2 py-0.5 text-[10px] font-medium transition',
    active
      ? 'bg-ganshale-text text-ganshale-surface'
      : 'border border-ganshale-border bg-ganshale-page text-ganshale-muted hover:text-ganshale-text',
  ].join(' ')
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ganshale-border/60 py-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-16 shrink-0 text-[10px] font-medium text-ganshale-subtle sm:w-[4.25rem]">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function TimeRangeSelectors({
  draftFilters,
  years,
  dayOptions,
  showDay,
  onPatch,
}: {
  draftFilters: DataRecordsFilterState
  years: number[]
  dayOptions: number[]
  showDay: boolean
  onPatch: (
    patch: Partial<Pick<DataRecordsFilterState, 'filterYear' | 'filterMonth' | 'filterDay'>>,
  ) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        aria-label="年份"
        value={draftFilters.filterYear}
        onChange={(e) => onPatch({ filterYear: Number(e.target.value) })}
        className={DATA_FILTER_YEAR_SELECT_CLASS}
      >
        <option value={0}>不限</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <span className="text-[10px] text-ganshale-muted">年</span>
      <select
        aria-label="月份"
        value={draftFilters.filterMonth}
        disabled={!draftFilters.filterYear}
        onChange={(e) => onPatch({ filterMonth: Number(e.target.value) })}
        className={DATA_FILTER_MONTH_SELECT_CLASS}
      >
        <option value={0}>不限</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <span className="text-[10px] text-ganshale-muted">月</span>
      {showDay ? (
        <>
          <select
            aria-label="日期"
            value={draftFilters.filterDay}
            disabled={!draftFilters.filterYear || !draftFilters.filterMonth}
            onChange={(e) => onPatch({ filterDay: Number(e.target.value) })}
            className={DATA_FILTER_DAY_SELECT_CLASS}
          >
            <option value={0}>不限</option>
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-ganshale-muted">日</span>
        </>
      ) : null}
    </div>
  )
}

export function DataRecordsView() {
  const {
    draftFilters,
    appliedFilters,
    loading,
    categoryOptions,
    selectedIds,
    setSelectedIds,
    detailRow,
    setDetailRow,
    jumpPage,
    setJumpPage,
    years,
    dayOptions,
    filteredRows,
    pageRows,
    pageCount,
    totalDuration,
    appSearchDraft,
    setAppSearchDraft,
    patchDraft,
    patchTimeDraft,
    patchApplied,
    patchRecordKind,
    toggleSort,
    toggleCategory,
    onAppSearch,
  } = useDataRecords()

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.event.id))

  const togglePageSelect = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        for (const r of pageRows) next.delete(r.event.id)
      } else {
        for (const r of pageRows) next.add(r.event.id)
      }
      return next
    })
  }

  return (
    <div className={DATA_PAGE_CLASS}>
      <section className="gs-card flex min-h-0 flex-1 flex-col overflow-hidden p-2.5 sm:p-3">
        <h2 className="mb-1 text-xs font-semibold text-ganshale-text">筛选条件</h2>

        <FilterRow label="数据类型">
          <div className="flex flex-wrap gap-1">
            {DATA_RECORD_KIND_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => patchRecordKind(o.id)}
                className={chipClass(draftFilters.recordKind === o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </FilterRow>

        {(draftFilters.recordKind === 'window' || draftFilters.recordKind === 'daily') && (
          <FilterRow label="时间范围">
            <TimeRangeSelectors
              draftFilters={draftFilters}
              years={years}
              dayOptions={dayOptions}
              showDay
              onPatch={patchTimeDraft}
            />
          </FilterRow>
        )}

        {(draftFilters.recordKind === 'weekly' || draftFilters.recordKind === 'monthly') && (
          <FilterRow label="时间范围">
            <TimeRangeSelectors
              draftFilters={draftFilters}
              years={years}
              dayOptions={dayOptions}
              showDay={false}
              onPatch={patchTimeDraft}
            />
          </FilterRow>
        )}

        {draftFilters.recordKind === 'weekly' ? (
          <FilterRow label="周报范围">
            <div className="flex flex-wrap gap-1">
              {MONTHLY_WEEK_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => patchDraft({ monthlyWeek: o.id as MonthlyWeekFilterId })}
                  className={chipClass(draftFilters.monthlyWeek === o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </FilterRow>
        ) : null}

        {draftFilters.recordKind === 'window' ? (
          <>
            <FilterRow label="应用类别">
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => patchDraft({ categoryIds: [] })}
                  className={chipClass(draftFilters.categoryIds.length === 0)}
                >
                  不限
                </button>
                {categoryOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={chipClass(draftFilters.categoryIds.includes(c.id))}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </FilterRow>

            <FilterRow label="时长条件">
              <div className="flex flex-wrap gap-1">
                {DURATION_FILTER_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => patchDraft({ durationFilter: o.id as DurationFilterId })}
                    className={chipClass(draftFilters.durationFilter === o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </FilterRow>
          </>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col border-t border-ganshale-border pt-2">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 z-[1] border-b border-ganshale-border bg-ganshale-page text-ganshale-subtle">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePageSelect}
                      aria-label="全选当前页"
                    />
                  </th>
                  <TableSortHeader
                    label="开始时间"
                    field="time"
                    sortField={appliedFilters.sortField}
                    sortDirection={appliedFilters.sortDirection}
                    onToggle={toggleSort}
                  />
                  <TableSortHeader
                    label="日期"
                    field="date"
                    sortField={appliedFilters.sortField}
                    sortDirection={appliedFilters.sortDirection}
                    onToggle={toggleSort}
                  />
                  <th className="min-w-[10rem] px-2 py-2 font-medium">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SortToggle
                        label="应用名称"
                        field="app"
                        sortField={appliedFilters.sortField}
                        sortDirection={appliedFilters.sortDirection}
                        onToggle={toggleSort}
                      />
                      <input
                        type="search"
                        value={appSearchDraft}
                        onChange={(e) => setAppSearchDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onAppSearch()}
                        placeholder="应用名称"
                        aria-label="搜索应用名称"
                        className={TABLE_HEADER_SEARCH_INPUT}
                      />
                      <button type="button" onClick={onAppSearch} className={TABLE_HEADER_SEARCH_BTN}>
                        <Search className="h-3 w-3" strokeWidth={2} />
                        搜索
                      </button>
                    </div>
                  </th>
                  <th className="min-w-[8rem] px-2 py-2 font-medium">窗口标题</th>
                  <TableSortHeader
                    label="时长"
                    field="duration"
                    sortField={appliedFilters.sortField}
                    sortDirection={appliedFilters.sortDirection}
                    onToggle={toggleSort}
                  />
                  <th className="px-2 py-2 font-medium">分类</th>
                  <th className="px-2 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ganshale-border">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-ganshale-muted">
                      {loading
                        ? '加载中…'
                        : appliedFilters.appSearchQuery.trim()
                          ? '没有匹配的应用名称'
                          : appliedFilters.recordKind === 'window'
                            ? '没有匹配的记录，请调整筛选后点击筛选结果'
                            : '没有匹配的报表记录，请调整筛选后点击筛选结果'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr key={row.event.id} className="hover:bg-ganshale-page/60">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.event.id)}
                          onChange={() =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(row.event.id)) next.delete(row.event.id)
                              else next.add(row.event.id)
                              return next
                            })
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-ganshale-muted">
                        {formatClock(new Date(row.startMs))}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.dateYmd}</td>
                      <td className="px-2 py-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <AppBrandIcon
                            app={row.appExe}
                            brandKey={row.identityKey}
                            appPath={row.appPath}
                            size={DASHBOARD_PAIR_ICON_SIZE}
                            className="shrink-0 rounded-md"
                          />
                          <span className="truncate font-medium">
                            <HighlightText
                              text={row.appLabel}
                              query={appliedFilters.appSearchQuery}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[14rem] px-2 py-2 text-ganshale-muted">
                        <span className="line-clamp-1" title={row.title}>
                          {row.title || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono tabular-nums">
                        {formatDuration(row.durationSec)}
                      </td>
                      <td className="px-2 py-2">
                        <CategoryTag row={row} />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="text-[10px] font-medium text-ganshale-accent hover:underline"
                          onClick={() => setDetailRow(row)}
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="grid shrink-0 grid-cols-1 items-center gap-2 border-t border-ganshale-border pt-2 text-[10px] sm:grid-cols-[1fr_auto_1fr]">
            <div className="flex items-center gap-2 sm:justify-self-start">
              <button
                type="button"
                disabled={appliedFilters.page <= 1}
                onClick={() => patchApplied({ page: appliedFilters.page - 1 })}
                className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
              >
                上一页
              </button>
              <button
                type="button"
                disabled={appliedFilters.page >= pageCount}
                onClick={() => patchApplied({ page: appliedFilters.page + 1 })}
                className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
              >
                下一页
              </button>
              <span className="text-ganshale-muted">
                第 {appliedFilters.page} / {pageCount} 页
              </span>
            </div>
            <p className="order-first text-center text-[10px] text-ganshale-muted sm:order-none sm:justify-self-center">
              找到 <span className="tabular-nums text-ganshale-subtle">{filteredRows.length}</span>{' '}
              条记录，总时长{' '}
              <span className="tabular-nums text-ganshale-subtle">{formatDuration(totalDuration)}</span>
              {loading ? <span className="ml-1">（加载中…）</span> : null}
            </p>
            <div className="flex shrink-0 flex-nowrap items-center gap-2 sm:justify-self-end">
              <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] leading-[1.25] text-ganshale-muted">
                每页
                <select
                  value={appliedFilters.pageSize}
                  onChange={(e) => patchApplied({ pageSize: Number(e.target.value), page: 1 })}
                  className={`min-w-[2.25rem] text-center ${DATA_PAGINATION_CONTROL_CLASS}`}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] leading-[1.25] text-ganshale-muted">
                跳转
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = Number(jumpPage)
                      if (Number.isFinite(n))
                        patchApplied({ page: Math.min(Math.max(1, n), pageCount) })
                    }
                  }}
                  className={`w-9 text-center ${DATA_PAGINATION_CONTROL_CLASS}`}
                />
              </label>
            </div>
          </footer>
        </div>
      </section>

      <DataRecordDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  )
}
