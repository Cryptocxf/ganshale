/** 超过该时间无写库且无前台轮询，视为采集中断（托盘后台看门狗） */
export const WINDOW_HEARTBEAT_STALE_MS = 90_000

/** 看门狗检测间隔 */
export const WINDOW_HEARTBEAT_WATCHDOG_MS = 12_000

/** 两次自动恢复最小间隔，避免频繁 restart */
export const WINDOW_TRACKING_RECOVERY_COOLDOWN_MS = 60_000
