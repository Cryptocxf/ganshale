import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDuration } from '../lib/aggregations'
import type { CategoryBucket } from '../lib/appCategoryAggregate'
import type { AppCategoryDef } from '../lib/appCategoryConfig'
import { UNCATEGORIZED_ID } from '../lib/appCategoryConfig'
import { AppBrandIcon } from './AppBrandIcon'

type CategoryDetailModalProps = {
  categoryId: string
  categories: AppCategoryDef[]
  bucket: CategoryBucket
  appPathByExe: Map<string, string>
  onClose: () => void
  onSaveCategory: (id: string, name: string, keywords: string[]) => void
  onDeleteCategory: (id: string) => void
}

export function CategoryDetailModal({
  categoryId,
  categories,
  bucket,
  appPathByExe,
  onClose,
  onSaveCategory,
  onDeleteCategory,
}: CategoryDetailModalProps) {
  const modalCat =
    categoryId !== UNCATEGORIZED_ID ? categories.find((c) => c.id === categoryId) : undefined

  const [modalDraft, setModalDraft] = useState<{ name: string; keywords: string[] } | null>(() => {
    if (!modalCat) return null
    return { name: modalCat.name, keywords: [...modalCat.keywords] }
  })
  const [newKeywordInput, setNewKeywordInput] = useState('')

  useEffect(() => {
    if (categoryId === UNCATEGORIZED_ID) {
      setModalDraft(null)
      return
    }
    const c = categories.find((x) => x.id === categoryId)
    if (c) setModalDraft({ name: c.name, keywords: [...c.keywords] })
    else setModalDraft(null)
    setNewKeywordInput('')
  }, [categoryId, categories])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const detailApps = Object.entries(bucket.apps)
    .map(([exe, sec]) => ({
      exe,
      seconds: Math.round(sec),
      appPath: appPathByExe.get(exe),
    }))
    .sort((a, b) => b.seconds - a.seconds)

  const draftRemoveKeyword = (kw: string) => {
    setModalDraft((d) => (d ? { ...d, keywords: d.keywords.filter((k) => k !== kw) } : d))
  }

  const draftAddKeyword = () => {
    const raw = newKeywordInput.trim()
    if (!raw || !modalDraft) return
    if (modalDraft.keywords.some((k) => k.toLowerCase() === raw.toLowerCase())) {
      setNewKeywordInput('')
      return
    }
    setModalDraft((d) => (d ? { ...d, keywords: [...d.keywords, raw] } : d))
    setNewKeywordInput('')
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-3"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[min(88vh,32rem)] w-full max-w-sm flex-col rounded-xl border border-black/[0.1] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-3 py-2">
          <h3 id="cat-detail-title" className="font-display text-xs font-semibold text-ganshale-text">
            分类编辑
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ganshale-muted hover:bg-ganshale-page hover:text-ganshale-text"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {categoryId === UNCATEGORIZED_ID ? (
            <>
              <p className="text-[11px] leading-relaxed text-ganshale-text">
                <span className="font-medium text-ganshale-subtle">分类名称：</span>
                未分类
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ganshale-text">
                <span className="font-medium text-ganshale-subtle">匹配关键词：</span>
                <span className="text-ganshale-muted">—</span>
              </p>
            </>
          ) : modalCat && modalDraft ? (
            <>
              <label className="block">
                <span className="text-[10px] font-medium text-ganshale-subtle">分类名称：</span>
                <input
                  value={modalDraft.name}
                  onChange={(e) => setModalDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                  className="mt-0.5 w-full rounded-md border border-black/[0.08] bg-white px-2 py-1.5 text-[11px] text-ganshale-text focus:border-ganshale-text/25 focus:outline-none focus:ring-1 focus:ring-ganshale-text/10"
                />
              </label>
              <div className="mt-3">
                <span className="text-[10px] font-medium text-ganshale-subtle">匹配关键词：</span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {modalDraft.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-0.5 rounded-full border border-black/[0.08] bg-ganshale-page px-1.5 py-0.5 pl-2 text-[10px] text-ganshale-text"
                    >
                      {kw}
                      <button
                        type="button"
                        title="从列表移除"
                        onClick={() => draftRemoveKeyword(kw)}
                        className="rounded-full p-0.5 text-ganshale-muted hover:bg-black/[0.08] hover:text-ganshale-text"
                        aria-label={`移除 ${kw}`}
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-1">
                  <input
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        draftAddKeyword()
                      }
                    }}
                    placeholder="新关键词…"
                    className="min-w-0 flex-1 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[10px] text-ganshale-text placeholder:text-ganshale-subtle focus:border-ganshale-text/25 focus:outline-none focus:ring-1 focus:ring-ganshale-text/10"
                  />
                  <button
                    type="button"
                    onClick={draftAddKeyword}
                    className="shrink-0 rounded-md border border-black/[0.1] bg-white px-2 py-1 text-[10px] font-medium text-ganshale-text hover:bg-ganshale-page"
                  >
                    添加
                  </button>
                </div>
              </div>
            </>
          ) : modalCat ? (
            <p className="text-[10px] text-ganshale-muted">正在加载编辑区…</p>
          ) : null}

          <div className="mt-3">
            <p className="text-[10px] font-medium text-ganshale-subtle">分类明细：</p>
            <ul className="mt-1.5 max-h-44 space-y-1 overflow-y-auto pr-0.5">
              {detailApps.length === 0 ? (
                <li className="text-[10px] text-ganshale-muted">无应用记录</li>
              ) : (
                detailApps.map((appRow) => {
                  const label = appRow.exe.replace(/\.exe$/i, '') || appRow.exe
                  return (
                    <li
                      key={appRow.exe}
                      className="flex items-center gap-2 rounded-md border border-black/[0.05] bg-white/90 px-2 py-1.5"
                    >
                      <AppBrandIcon
                        app={appRow.exe}
                        appPath={appRow.appPath}
                        size={22}
                        className="shrink-0 rounded-md"
                      />
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-[10px] text-ganshale-text"
                        title={appRow.exe}
                      >
                        {label}
                      </span>
                      <span className="shrink-0 tabular-nums text-[10px] text-ganshale-muted">
                        {formatDuration(appRow.seconds)}
                      </span>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center gap-2 border-t border-black/[0.06] px-3 py-2 ${
            categoryId === UNCATEGORIZED_ID ? 'justify-end' : 'justify-between'
          }`}
        >
          {categoryId !== UNCATEGORIZED_ID && modalCat ? (
            <button
              type="button"
              onClick={() => {
                onDeleteCategory(modalCat.id)
                onClose()
              }}
              className="text-[10px] font-medium text-red-700 hover:underline"
            >
              删除此分类
            </button>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/[0.12] bg-white px-3 py-1.5 text-[10px] font-medium text-ganshale-text hover:bg-ganshale-page"
            >
              取消
            </button>
            {categoryId !== UNCATEGORIZED_ID && modalCat && modalDraft ? (
              <button
                type="button"
                onClick={() => {
                  onSaveCategory(
                    modalCat.id,
                    modalDraft.name.trim() || '未命名',
                    [...modalDraft.keywords],
                  )
                  onClose()
                }}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-zinc-800"
              >
                保存
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
