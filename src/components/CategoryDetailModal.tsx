import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDuration, type AppTotalRow } from '../lib/aggregations'
import type { CategoryBucket } from '../lib/appCategoryAggregate'
import {
  assignmentKeyMatches,
  findCategoryHostingApp,
  normalizeAssignmentKey,
  UNCATEGORIZED_ID,
  type AppCategoryDef,
} from '../lib/appCategoryConfig'
import { AppBrandIcon } from './AppBrandIcon'
import {
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  DASHBOARD_PAIR_ICON_SIZE,
  GS_FIELD_INPUT_MD_CLASS,
  GS_MODAL_FOOTER_DIVIDER_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'
import { DashboardModalRoot } from './DashboardModalRoot'

type CategoryDetailModalProps = {
  category: AppCategoryDef
  categories: AppCategoryDef[]
  bucket: CategoryBucket
  durationApps: AppTotalRow[]
  appPathByExe: Map<string, string>
  /** 新建尚未写入配置的分类草稿 */
  isNewDraft?: boolean
  onClose: () => void
  onSaveCategory: (id: string, name: string, keywords: string[]) => void
  onDeleteCategory: (id: string) => void
}

function bucketSecondsForKeyword(
  bucket: CategoryBucket,
  keyword: string,
  durationApps: AppTotalRow[],
): number {
  const row = resolveDurationRow(keyword, durationApps)
  let total = 0
  for (const [appKey, sec] of Object.entries(bucket.apps)) {
    if (assignmentKeyMatches(keyword, appKey, row?.identityKey ?? '')) total += sec
  }
  return Math.round(total)
}

function resolveDurationRow(
  keyword: string,
  durationApps: AppTotalRow[],
): AppTotalRow | undefined {
  return durationApps.find((row) =>
    assignmentKeyMatches(keyword, row.app, row.identityKey),
  )
}

function AppPickSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (identityKey: string) => void
  options: { row: AppTotalRow; label: string }[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const selected = options.find((o) => o.row.identityKey === value)

  const updateMenuRect = () => {
    const el = triggerRef.current
    if (!el) return
    setMenuRect(el.getBoundingClientRect())
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null)
      return
    }
    updateMenuRect()
    window.addEventListener('resize', updateMenuRect)
    window.addEventListener('scroll', updateMenuRect, true)
    return () => {
      window.removeEventListener('resize', updateMenuRect)
      window.removeEventListener('scroll', updateMenuRect, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const menu =
    open && menuRect && options.length > 0
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            className="max-h-36 overflow-y-auto rounded-md border border-ganshale-border bg-ganshale-surface py-0.5 shadow-lg"
            style={{
              position: 'fixed',
              top: menuRect.bottom + 2,
              left: menuRect.left,
              width: menuRect.width,
              zIndex: 200,
            }}
          >
            {options.map(({ row, label }) => (
              <li key={row.identityKey} role="option" aria-selected={row.identityKey === value}>
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[10px] text-ganshale-text transition hover:bg-ganshale-page"
                  onClick={() => {
                    onChange(row.identityKey)
                    setOpen(false)
                  }}
                >
                  <AppBrandIcon
                    app={row.app}
                    brandKey={row.identityKey}
                    appPath={row.appPath}
                    size={16}
                    className="shrink-0 rounded"
                  />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[10px]',
          GS_FIELD_INPUT_MD_CLASS,
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <AppBrandIcon
              app={selected.row.app}
              brandKey={selected.row.identityKey}
              appPath={selected.row.appPath}
              size={16}
              className="shrink-0 rounded"
            />
            <span className="min-w-0 flex-1 truncate">{selected.label}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-ganshale-muted">
            {disabled ? '暂无可添加的应用' : '选择应用…'}
          </span>
        )}
      </button>
      {menu}
    </div>
  )
}

export function CategoryDetailModal({
  category: modalCat,
  categories,
  bucket,
  durationApps,
  appPathByExe,
  isNewDraft = false,
  onClose,
  onSaveCategory,
  onDeleteCategory,
}: CategoryDetailModalProps) {
  const categoryId = modalCat.id
  const isUncategorized = categoryId === UNCATEGORIZED_ID

  const [modalDraft, setModalDraft] = useState<{ name: string; keywords: string[] } | null>(() => ({
    name: modalCat.name,
    keywords: [...modalCat.keywords],
  }))
  const [pickApp, setPickApp] = useState('')

  const isInCurrentDraft = (row: AppTotalRow) =>
    modalDraft?.keywords.some((k) => assignmentKeyMatches(k, row.app, row.identityKey)) ?? false

  const optionState = useMemo(() => {
    if (!modalDraft) return []
    return durationApps.map((row) => {
      const inDraft = isInCurrentDraft(row)
      const host = findCategoryHostingApp(categories, categoryId, row.app, row.identityKey)
      const disabled = inDraft || host != null
      let suffix = ''
      if (inDraft) suffix = '（已添加）'
      else if (host) suffix = `（已在「${host.name}」）`
      const label = row.displayName || row.app.replace(/\.exe$/i, '') || row.app
      return { row, disabled, suffix, label }
    })
  }, [durationApps, categories, categoryId, modalDraft])

  const pickableApps = useMemo(
    () => optionState.filter((o) => !o.disabled),
    [optionState],
  )

  useEffect(() => {
    if (!pickApp) return
    if (!pickableApps.some((o) => o.row.identityKey === pickApp)) {
      setPickApp('')
    }
  }, [pickApp, pickableApps])

  const configuredApps = useMemo(() => {
    if (!modalDraft) return []
    if (isUncategorized) {
      return Object.entries(bucket.apps)
        .map(([appKey, sec]) => {
          const row = durationApps.find((r) =>
            assignmentKeyMatches(appKey, r.app, r.identityKey),
          )
          const exe = row?.app ?? appKey
          return {
            keyword: appKey,
            exe,
            identityKey: row?.identityKey ?? normalizeAssignmentKey(appKey),
            label: row?.displayName || exe.replace(/\.exe$/i, '') || exe,
            appPath: row?.appPath ?? appPathByExe.get(exe),
            seconds: Math.round(sec),
          }
        })
        .sort((a, b) => b.seconds - a.seconds)
    }
    return modalDraft.keywords.map((keyword) => {
      const row = resolveDurationRow(keyword, durationApps)
      const exe = row?.app ?? keyword
      const seconds = bucketSecondsForKeyword(bucket, keyword, durationApps)
      return {
        keyword,
        exe,
        identityKey: row?.identityKey ?? normalizeAssignmentKey(keyword),
        label: row?.displayName || exe.replace(/\.exe$/i, '') || exe,
        appPath: row?.appPath ?? appPathByExe.get(exe),
        seconds,
      }
    })
  }, [modalDraft, durationApps, bucket, appPathByExe, isUncategorized])

  const draftAddApp = () => {
    const row = pickableApps.find((o) => o.row.identityKey === pickApp)?.row
    if (!row || !modalDraft) return
    if (isInCurrentDraft(row)) return
    setModalDraft((d) =>
      d ? { ...d, keywords: [...d.keywords, normalizeAssignmentKey(row.identityKey)] } : d,
    )
    setPickApp('')
  }

  const draftRemoveApp = (keyword: string) => {
    setModalDraft((d) =>
      d
        ? {
            ...d,
            keywords: d.keywords.filter(
              (k) => !assignmentKeyMatches(k, keyword),
            ),
          }
        : d,
    )
  }

  const commitSave = () => {
    if (!modalCat || !modalDraft) return
    onSaveCategory(
      modalCat.id,
      modalDraft.name.trim() || '未命名',
      [...modalDraft.keywords],
    )
    onClose()
  }

  if (!modalDraft) return null

  return (
    <DashboardModalRoot
      open
      onClose={onClose}
      zIndex={85}
      labelledBy="cat-detail-title"
      dialogClassName="max-h-[min(88vh,32rem)] w-full max-w-sm"
    >
      <div className={`flex shrink-0 items-center justify-between px-3 py-2 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}>
        <h3 id="cat-detail-title" className="font-display text-xs font-semibold text-ganshale-text">
          {isUncategorized ? '未分类明细' : '分类编辑'}
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
        {!isUncategorized ? (
          <label className="block">
            <span className="text-[10px] font-medium text-ganshale-subtle">分类名称</span>
            <input
              value={modalDraft.name}
              onChange={(e) => setModalDraft((d) => (d ? { ...d, name: e.target.value } : d))}
              className={`mt-0.5 ${GS_FIELD_INPUT_MD_CLASS}`}
            />
          </label>
        ) : (
          <p className="text-[10px] text-ganshale-muted">
            以下应用尚未归入任何分类，可在其它分类编辑弹窗中添加。
          </p>
        )}

        {!isUncategorized ? (
        <div className="mt-3">
          <span className="text-[10px] font-medium text-ganshale-subtle">添加应用</span>
          <div className="mt-1.5 flex gap-1">
            <AppPickSelect
              value={pickApp}
              onChange={setPickApp}
              options={pickableApps.map(({ row, label }) => ({ row, label }))}
              disabled={pickableApps.length === 0}
            />
            <button
              type="button"
              onClick={draftAddApp}
              disabled={!pickApp}
              className={`shrink-0 ${DASHBOARD_HEADER_ACTION_BTN_CLASS}`}
            >
              添加
            </button>
          </div>
        </div>
        ) : null}

        <div className={isUncategorized ? '' : 'mt-3'}>
          <p className="text-[10px] font-medium text-ganshale-subtle">
            {isUncategorized ? '未分类应用' : '分类明细'}
          </p>
          <ul className="mt-1.5 max-h-44 space-y-1 overflow-y-auto pr-0.5">
            {configuredApps.length === 0 ? (
              <li className="text-[10px] text-ganshale-muted">尚未添加应用</li>
            ) : (
              configuredApps.map((appRow) => (
                <li
                  key={appRow.keyword}
                  className="flex items-center gap-2 rounded-md border border-ganshale-border bg-ganshale-surface px-2 py-1.5"
                >
                  <AppBrandIcon
                    app={appRow.exe}
                    brandKey={appRow.identityKey}
                    appPath={appRow.appPath}
                    size={DASHBOARD_PAIR_ICON_SIZE}
                    className="shrink-0 rounded-md"
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-[10px] text-ganshale-text"
                    title={appRow.exe}
                  >
                    {appRow.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-[10px] text-ganshale-muted">
                    {appRow.seconds > 0 ? formatDuration(appRow.seconds) : '—'}
                  </span>
                  {!isUncategorized ? (
                  <button
                    type="button"
                    title="从分类移除"
                    onClick={() => draftRemoveApp(appRow.keyword)}
                    className="shrink-0 rounded-full p-0.5 text-ganshale-muted hover:bg-black/[0.08] hover:text-red-700"
                    aria-label={`从分类移除 ${appRow.label}`}
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div
        className={`flex shrink-0 items-center ${isUncategorized ? 'justify-end' : 'justify-between'} gap-2 px-3 py-2 ${GS_MODAL_FOOTER_DIVIDER_CLASS}`}
      >
        {!isUncategorized ? (
        <button
          type="button"
          onClick={() => {
            onDeleteCategory(modalCat.id)
            if (!isNewDraft) onClose()
          }}
          className="text-[10px] font-medium text-red-700 hover:underline"
        >
          {isNewDraft ? '放弃' : '删除此分类'}
        </button>
        ) : null}
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onClose} className={DASHBOARD_HEADER_ACTION_BTN_CLASS}>
            {isUncategorized ? '关闭' : '取消'}
          </button>
          {!isUncategorized ? (
          <button
            type="button"
            onClick={commitSave}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-zinc-800"
          >
            保存
          </button>
          ) : null}
        </div>
      </div>
    </DashboardModalRoot>
  )
}
