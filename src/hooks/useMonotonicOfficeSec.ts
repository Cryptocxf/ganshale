/** 使用已入库事件和有效实时采样的真实结果，不能永久保留一次错误外推的峰值。 */
export function useMonotonicOfficeSec(
  rawSec: number,
  _enabled: boolean,
  _resetKey?: string,
): number {
  return Number.isFinite(rawSec) ? Math.max(0, Math.floor(rawSec)) : 0
}
