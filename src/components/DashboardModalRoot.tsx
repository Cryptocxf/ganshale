import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type DashboardModalRootProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 挂到 body，避免被日看板卡片 overflow 裁切 */
  zIndex?: number
  labelledBy?: string
  /** 追加在 gs-dashboard-modal 上的尺寸类（如 max-w-4xl） */
  dialogClassName?: string
  /** 追加在遮罩层上的布局类（如顶部对齐、可滚动） */
  overlayClassName?: string
  /** 点击遮罩是否关闭，默认 true */
  dismissOnBackdrop?: boolean
  /** 打开时遮罩与对话框入场动画（日报/周报生成弹窗等） */
  enterAnimation?: boolean
}

/** 每日页详情弹窗：样式随 html[data-skin] 变化，挂到 body 避免被卡片 overflow 裁切 */
export function DashboardModalRoot({
  open,
  onClose,
  children,
  zIndex = 90,
  labelledBy,
  dialogClassName = '',
  overlayClassName = '',
  dismissOnBackdrop = true,
  enterAnimation = false,
}: DashboardModalRootProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className={[
        'gs-dashboard-modal-overlay fixed inset-0 flex justify-center p-4 sm:p-6',
        enterAnimation ? 'gs-dashboard-modal-overlay--enter' : '',
        overlayClassName || 'items-center',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ zIndex }}
      role="presentation"
      onMouseDown={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={[
          'gs-dashboard-modal flex flex-col shadow-2xl',
          enterAnimation ? 'gs-dashboard-modal--enter' : '',
          dialogClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        {...(labelledBy ? { 'aria-labelledby': labelledBy } : {})}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
