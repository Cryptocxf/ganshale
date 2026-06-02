/** 日看板各区块统一的卡片内边距（与「时间分布」「应用分类速览」一致） */
export const DASHBOARD_CARD_INSET_X = 'px-2.5 sm:px-3'
export const DASHBOARD_CARD_INSET_TOP = 'pt-2.5 sm:pt-3'
export const DASHBOARD_CARD_INSET_BOTTOM = 'pb-2.5 sm:pb-3'

/** 顶部「窗口记录 / 应用时长」成对列表：行高、图标一致，预览行数分别固定 */
export const DASHBOARD_PAIR_ICON_SIZE = 24
export const DASHBOARD_PAIR_ROW_HEIGHT_PX = 40
export const DASHBOARD_PAIR_TABLE_HEAD_PX = 28
export const DASHBOARD_WINDOW_LOG_PREVIEW_ROWS = 20
export const DASHBOARD_DURATION_PREVIEW_ROWS = 10
/** 今日工作记录预览区最多展示行数（超出可滚动） */
export const DASHBOARD_WORK_RECORD_PREVIEW_ROWS = 8
export const DASHBOARD_WINDOW_LIST_BODY_MAX_PX =
  DASHBOARD_WINDOW_LOG_PREVIEW_ROWS * DASHBOARD_PAIR_ROW_HEIGHT_PX
export const DASHBOARD_DURATION_BODY_MAX_PX =
  DASHBOARD_DURATION_PREVIEW_ROWS * DASHBOARD_PAIR_ROW_HEIGHT_PX
export const DASHBOARD_WINDOW_TABLE_SCROLL_MAX_PX =
  DASHBOARD_PAIR_TABLE_HEAD_PX + DASHBOARD_WINDOW_LIST_BODY_MAX_PX
export const DASHBOARD_WORK_RECORD_ROW_HEIGHT_PX = 32
export const DASHBOARD_WORK_RECORD_PREVIEW_MAX_PX =
  DASHBOARD_WORK_RECORD_PREVIEW_ROWS * DASHBOARD_WORK_RECORD_ROW_HEIGHT_PX

/** 日看板卡片标题栏右侧操作按钮（统一尺寸，配合 invisible 占位） */
export const DASHBOARD_HEADER_ACTION_BTN_CLASS =
  'gs-toolbar-btn shrink-0 px-2 py-0.5 text-[10px]'

export const DASHBOARD_HEADER_ACTIONS_ROW_CLASS =
  'flex h-[22px] min-h-[22px] shrink-0 items-center justify-end gap-1.5'

/** 每日页顶栏右侧（日期 + 查看 + 生成日报）统一高度，切换日期不跳动 */
export const DAILY_CHROME_HEADER_TOOLBAR_MIN_H_CLASS = 'min-h-11'

/** 顶栏三卡区块：随窗口高度按比例伸缩 */
export const DASHBOARD_TOP_SECTION_HEIGHT_CLASS =
  'max-h-[42vh] min-h-[7.5rem] flex-[3] overflow-hidden'

/** 顶栏卡片标题行以下内容区 */
export const DASHBOARD_TOP_CARD_BODY_CLASS = 'flex min-h-0 flex-1 flex-col overflow-hidden'

/** 应用分类分布图表区（饼图/柱状/空态共用） */
export const DASHBOARD_TOP_CATEGORY_CHART_BODY_CLASS =
  'flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden'

/** @deprecated 使用 DASHBOARD_TOP_CATEGORY_CHART_BODY_CLASS */
export const DASHBOARD_TOP_CATEGORY_BODY_MIN_CLASS = DASHBOARD_TOP_CATEGORY_CHART_BODY_CLASS

/** 时间分布整卡：随窗口高度按比例伸缩 */
export const DASHBOARD_TIMELINE_SECTION_CLASS =
  'gs-card flex max-h-[28vh] min-h-[5rem] flex-[2] flex-col overflow-hidden p-2.5 sm:p-3'

/** @deprecated 时间条区域已改为 flex-1 自适应，保留供旧引用 */
export const DASHBOARD_TIMELINE_BODY_HEIGHT_PX = 106

/** 底栏「窗口记录 / 应用时长」标题行（无下分隔线） */
export const DASHBOARD_PAIR_CARD_HEADER_CLASS =
  'flex shrink-0 items-center justify-between gap-2 px-2.5 pb-0 pt-1.5 sm:px-3 sm:pt-2'

/** 底栏标题下方内容区（与标题留出间距） */
export const DASHBOARD_PAIR_CARD_BODY_CLASS =
  'flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 pb-2 pt-2 sm:px-3 sm:pb-2.5 sm:pt-2.5'

/** @deprecated 使用 DASHBOARD_PAIR_CARD_HEADER_CLASS */
export const DASHBOARD_PAIR_CARD_HEADER_MIN_CLASS = ''

/** 底栏列表/对比内容区固定高度（两卡一致；取窗口表与时长列表较大值） */
export const DASHBOARD_PAIR_SCROLL_BODY_HEIGHT_PX = Math.max(
  DASHBOARD_WINDOW_TABLE_SCROLL_MAX_PX,
  DASHBOARD_DURATION_BODY_MAX_PX,
)

/** 弹窗内输入框（随客户端风格） */
export const GS_FIELD_INPUT_CLASS =
  'gs-field-input min-w-0 flex-1 truncate rounded px-1.5 text-[11px] text-ganshale-text focus:outline-none disabled:cursor-default'
export const GS_FIELD_INPUT_ROW_CLASS = `${GS_FIELD_INPUT_CLASS} h-7 leading-7`
export const GS_FIELD_INPUT_MD_CLASS =
  'gs-field-input w-full rounded-md px-2 py-1.5 text-[11px] text-ganshale-text focus:outline-none'
export const GS_FIELD_INPUT_SM_CLASS =
  'gs-field-input rounded px-1 py-0.5 text-center text-[10px] tabular-nums focus:outline-none'

export const GS_MODAL_HEADER_DIVIDER_CLASS = 'gs-dashboard-modal__divider-b'
export const GS_MODAL_FOOTER_DIVIDER_CLASS = 'gs-dashboard-modal__divider-t'
export const GS_MODAL_INSET_PANEL_CLASS = 'gs-dashboard-modal__inset rounded-lg'

/** 日看板详情弹窗尺寸（外壳样式见 .gs-dashboard-modal，随客户端风格变化） */
export const DASHBOARD_DETAIL_MODAL_SIZE_CLASS =
  'max-h-[min(82vh,920px)] w-full max-w-4xl'
/** @deprecated 请用 DashboardModalRoot + DASHBOARD_DETAIL_MODAL_SIZE_CLASS */
export const DASHBOARD_DETAIL_MODAL_SHELL_CLASS = DASHBOARD_DETAIL_MODAL_SIZE_CLASS
export const DASHBOARD_DETAIL_MODAL_BODY_CLASS =
  'min-h-0 flex-1 overflow-auto px-1.5 py-1.5 sm:px-2'

/** 日看板顶栏三列：右侧「今日工作记录」略宽（比例略小于 1.3fr）；高度固定 */
export const DASHBOARD_BOTTOM_SECTION_CLASS = [
  'grid min-h-0 grid-cols-1 gap-2 overflow-hidden',
  DASHBOARD_TOP_SECTION_HEIGHT_CLASS,
  'md:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-stretch md:gap-3',
  '[&>*]:h-full [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden',
].join(' ')

/** 日看板底栏双列：实时窗口记录 + 应用时长对比（两列等高，窄窗单列） */
export const DASHBOARD_PAIR_SECTION_CLASS = [
  'grid min-h-0 flex-[4] grid-cols-1 gap-2 overflow-hidden',
  'md:grid-cols-2 md:items-stretch md:gap-3',
  '[&>div]:flex [&>div]:h-full [&>div]:min-h-0 [&>div]:min-w-0 [&>div]:flex-col [&>div]:overflow-hidden',
].join(' ')

/** 底栏列表/图表等内容区：贴标题自上而下排布 */
export const DASHBOARD_PAIR_SCROLL_BODY_CLASS =
  'flex min-h-0 flex-1 flex-col justify-start overflow-hidden'

/** 实时窗口记录预览表外框（与应用时长对比列表一致） */
export const DASHBOARD_WINDOW_TABLE_FRAME_CLASS =
  'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-ganshale-border'
export const DASHBOARD_WINDOW_TABLE_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]'

/** 应用时长对比列表外框 */
export const DASHBOARD_DURATION_LIST_FRAME_CLASS =
  'min-h-0 flex-1 divide-y divide-ganshale-border overflow-y-auto overflow-x-hidden rounded-md border border-ganshale-border [scrollbar-gutter:stable]'

/** 日看板页面布局（左右/底部留白由 AppChrome 每日页统一控制） */
export const DASHBOARD_PAGE_CLASS =
  'flex min-h-0 flex-1 flex-col gap-2 overflow-hidden'

/** 每周页：两行弹性铺满客户端内容区（与每日页同属 overviewCompact） */
export const WEEKLY_PAGE_CLASS = DASHBOARD_PAGE_CLASS

/** 每周页第一行：每日日报详情（约占 58% 剩余高度） */
export const WEEKLY_REPORT_DETAILS_SECTION_CLASS =
  'gs-card flex min-h-0 flex-[3] flex-col overflow-hidden'

/** 每周页第二行：左每日工作时长分布 + 右本周总工作时长（约占 42%） */
export const WEEKLY_MIDDLE_SECTION_CLASS = [
  'grid min-h-0 flex-[2] grid-cols-1 gap-2 overflow-hidden',
  'min-h-[clamp(5rem,14vh,10.5rem)]',
  'md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] md:items-stretch md:gap-3',
  '[&>*]:h-full [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden',
].join(' ')

/** 应用壳层内容区：铺满窗口宽度（不再限制 1280px） */
export const APP_CHROME_CONTENT_WIDTH_CLASS = 'mx-auto flex w-full min-w-0 flex-col'

/** 顶栏与各页面内容区水平留白（导航、日看板、设置等左缘对齐） */
export const APP_CHROME_INSET_X_COMPACT = 'px-2.5 sm:px-3'

/** 设置页等内容区：四边留白一致 */
export const APP_CHROME_INSET_COMPACT = 'p-2.5 sm:p-3'

/** 每月页：铺满内容区（与每周页同属 overviewCompact） */
export const MONTHLY_PAGE_CLASS =
  'flex min-h-0 flex-1 flex-col gap-2 overflow-hidden'

/** 每月页顶栏 KPI 行（略低于主体区，给下方周块让出高度） */
export const MONTHLY_KPI_SECTION_CLASS = [
  'grid min-h-0 flex-[1.35] grid-cols-2 gap-2',
  'md:grid-cols-4 md:gap-3',
  '[&>*]:h-full [&>*]:min-h-0',
].join(' ')

/** 每月页主体：左列分类+周块，右列活跃日历+智能摘要（各自独立行高） */
export const MONTHLY_MAIN_GRID_CLASS = [
  'grid min-h-0 flex-[5] grid-cols-1 gap-2 overflow-hidden',
  'md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.64fr)] md:grid-rows-1 md:items-stretch md:gap-3',
  '[&>*]:h-full [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:overflow-hidden',
].join(' ')

/** 左列：本月各周 / 分类矩阵（行高比例与右列活跃日历、智能摘要对齐 1.18 : 0.82） */
export const MONTHLY_MAIN_LEFT_COLUMN_CLASS = [
  'flex min-h-0 flex-col gap-2 overflow-hidden md:gap-3',
  '[&>*]:h-full [&>*]:min-h-0 [&>*]:min-w-0',
  '[&>*:first-child]:flex-[1.18]',
  '[&>*:last-child]:flex-[0.82]',
].join(' ')

/** 右列：活跃日历 + 智能摘要（1.18 : 0.82，与左列对齐） */
export const MONTHLY_MAIN_RIGHT_COLUMN_CLASS = [
  'flex min-h-0 flex-col gap-2 overflow-hidden md:gap-3',
  '[&>*]:h-full [&>*]:min-h-0 [&>*]:min-w-0',
  '[&>*:first-child]:flex-[1.18]',
  '[&>*:last-child]:flex-[0.82]',
].join(' ')

/** @deprecated 使用 MONTHLY_MAIN_GRID_CLASS */
export const MONTHLY_MIDDLE_SECTION_CLASS = MONTHLY_MAIN_GRID_CLASS

/** @deprecated 使用 MONTHLY_MAIN_GRID_CLASS */
export const MONTHLY_BOTTOM_SECTION_CLASS = MONTHLY_MAIN_GRID_CLASS

/** 每周 / 每月 / 数据等二级页：与设置页同宽、无额外顶栏标题 */
export const SECONDARY_PAGE_CONTENT_CLASS = 'w-full min-w-0 space-y-3'

/** 数据页：铺满内容区，区块间距与 AppChrome 四边等距留白配合 */
export const DATA_PAGE_CLASS = 'flex min-h-0 flex-1 flex-col'

/** 待办页：单栏滚动布局 */
export const TODO_PAGE_CLASS = 'flex min-h-0 flex-1 flex-col overflow-hidden'
/** @deprecated 请使用 APP_CHROME_INSET_X_COMPACT */
export const APP_CHROME_INSET_X_DEFAULT = APP_CHROME_INSET_X_COMPACT

/** 设置页：区块主标题（如「提示词」「时间」「能力范围」） */
export const SETTINGS_PAGE_TITLE_CLASS =
  'flex items-center gap-2 text-base font-semibold text-ganshale-text'

/** 设置页：左侧导航栏 */
export const SETTINGS_NAV_PANEL_CLASS =
  'w-[7.5rem] shrink-0 border-r border-ganshale-border bg-ganshale-page py-4 pl-3 pr-2 sm:w-[8.5rem]'

/** 设置页：右侧内容区 */
export const SETTINGS_CONTENT_PANEL_CLASS =
  'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-ganshale-surface p-4 sm:p-5'

/** 设置页：整块区域（随内容区四边等距留白） */
export const SETTINGS_SHELL_CLASS =
  'flex min-h-0 flex-1 flex-row overflow-hidden rounded-xl border border-ganshale-border bg-ganshale-surface shadow-sm'

/** 设置页：字段/分组小标题（如「网关地址」「AI 自动总结」） */
export const SETTINGS_FIELD_LABEL_CLASS = 'text-sm font-semibold text-ganshale-text'

/** 设置页：独占一行、位于输入框上方的小标题 */
export const SETTINGS_FIELD_LABEL_BLOCK_CLASS =
  'block text-sm font-semibold text-ganshale-text'
