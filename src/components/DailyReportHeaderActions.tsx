import { Eye, FileText, Loader2 } from 'lucide-react'
import { useDailyReportOptional } from '../context/DailyReportContext'

/** 顶栏「生成日报」「查看」（仅每日页且 Provider 存在时渲染） */
export function DailyReportHeaderActions() {
  const report = useDailyReportOptional()
  if (!report) return null

  const { streaming, toast, onGenerate, openReportModal } = report

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => openReportModal()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-[11px] font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page"
      >
        <Eye className="h-3.5 w-3.5 text-ganshale-muted" strokeWidth={1.8} />
        查看
      </button>
      <button
        type="button"
        onClick={() => onGenerate()}
        disabled={streaming}
        className="inline-flex flex-col items-center justify-center gap-0 rounded-lg border border-blue-900/20 bg-blue-900 px-3 py-1 text-[11px] font-semibold leading-tight text-white shadow-sm transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-1.5">
          {streaming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <FileText className="h-3.5 w-3.5 opacity-90" strokeWidth={1.8} />
          )}
          生成日报
        </span>
        <span className="text-[9px] font-normal leading-none text-white/75">
          每天 18:00 自动触发
        </span>
      </button>
      {toast ? (
        <p
          className="absolute right-0 top-full z-10 mt-1 max-w-[14rem] rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[10px] text-ganshale-muted shadow-sm"
          role="status"
        >
          {toast}
        </p>
      ) : null}
    </div>
  )
}
