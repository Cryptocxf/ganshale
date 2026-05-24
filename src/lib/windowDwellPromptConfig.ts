/** 连续停留达到该秒数时依次弹窗（同一事件 + 档位只提示一次，直到切换窗口产生新事件） */
export const WINDOW_DWELL_PROMPT_MILESTONES_SEC = [600, 1800, 3600] as const

/** 弹窗内无操作且未悬停时自动关闭 */
export const WINDOW_DWELL_IDLE_CLOSE_MS = 10_000
