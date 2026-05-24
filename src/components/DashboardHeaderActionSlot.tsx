import { DASHBOARD_HEADER_ACTION_BTN_CLASS } from './dashboardLayout'

/** 顶栏操作按钮占位：隐藏时用 invisible 保留宽高，避免切换日期/未来日布局跳动 */
export function DashboardHeaderActionSlot({
  label,
  visible,
  onClick,
  className = DASHBOARD_HEADER_ACTION_BTN_CLASS,
}: {
  label: string
  visible: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={visible ? onClick : undefined}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      disabled={!visible}
      className={[className, !visible ? 'pointer-events-none invisible' : ''].join(' ')}
    >
      {label}
    </button>
  )
}
