/** 日看板各区块统一的卡片内边距（与「时间分布」「应用分类速览」一致） */
export const DASHBOARD_CARD_INSET_X = 'px-2.5 sm:px-3'
export const DASHBOARD_CARD_INSET_TOP = 'pt-2.5 sm:pt-3'
export const DASHBOARD_CARD_INSET_BOTTOM = 'pb-2.5 sm:pb-3'

/** 顶部「窗口记录 / 应用时长」成对列表：行高、图标一致，预览行数分别固定 */
export const DASHBOARD_PAIR_ICON_SIZE = 24
export const DASHBOARD_PAIR_ROW_HEIGHT_PX = 40
export const DASHBOARD_PAIR_TABLE_HEAD_PX = 28
export const DASHBOARD_WINDOW_LOG_PREVIEW_ROWS = 6
export const DASHBOARD_DURATION_PREVIEW_ROWS = 7
export const DASHBOARD_WINDOW_LIST_BODY_MAX_PX =
  DASHBOARD_WINDOW_LOG_PREVIEW_ROWS * DASHBOARD_PAIR_ROW_HEIGHT_PX
export const DASHBOARD_DURATION_BODY_MAX_PX =
  DASHBOARD_DURATION_PREVIEW_ROWS * DASHBOARD_PAIR_ROW_HEIGHT_PX
export const DASHBOARD_WINDOW_TABLE_SCROLL_MAX_PX =
  DASHBOARD_PAIR_TABLE_HEAD_PX + DASHBOARD_WINDOW_LIST_BODY_MAX_PX

/** 日看板「查看全部」弹层：窗口记录、应用时长对比共用尺寸 */
export const DASHBOARD_DETAIL_MODAL_SHELL_CLASS =
  'flex max-h-[min(82vh,920px)] w-full max-w-4xl flex-col rounded-xl border border-black/[0.08] bg-white shadow-2xl'
export const DASHBOARD_DETAIL_MODAL_BODY_CLASS =
  'min-h-0 flex-1 overflow-auto px-1.5 py-1.5 sm:px-2'

/** 日看板顶栏三列：右侧「今日工作记录」略宽（整体偏矮） */
export const DASHBOARD_BOTTOM_SECTION_CLASS =
  'grid min-h-0 max-h-[13.5rem] min-h-[11rem] shrink-0 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1.3fr)] lg:items-stretch lg:gap-3'

/** 日看板底栏双列：实时窗口记录 + 应用时长对比（整体偏高，占满剩余空间） */
export const DASHBOARD_PAIR_SECTION_CLASS =
  'grid min-h-0 min-h-[18rem] flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-2 lg:items-stretch lg:gap-3'

/** 日看板页面布局（左右/底部留白由 AppChrome 每日页统一控制） */
export const DASHBOARD_PAGE_CLASS =
  'flex min-h-0 flex-1 flex-col gap-2 overflow-hidden'

/** 顶栏与各页面内容区水平留白（导航、日看板、设置等左缘对齐） */
export const APP_CHROME_INSET_X_COMPACT = 'px-2.5 sm:px-3'

/** 每周 / 每月 / 每年 / 数据等二级页：与设置页同宽、无额外顶栏标题 */
export const SECONDARY_PAGE_CONTENT_CLASS = 'w-full min-w-0 space-y-3'
/** @deprecated 请使用 APP_CHROME_INSET_X_COMPACT */
export const APP_CHROME_INSET_X_DEFAULT = APP_CHROME_INSET_X_COMPACT
