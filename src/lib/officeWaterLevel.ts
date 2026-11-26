/** Visual-only progress: eight equal height bands with cumulative time thresholds. */
export function officeWaterProgress(seconds: number): number {
  const thresholds = [0, 600, 1800, 3600, 7200, 14400, 21600, 28800, 36000]
  const elapsed = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  if (elapsed >= 36000) return 1
  const band = thresholds.findIndex((end, index) => index > 0 && elapsed < end)
  const start = thresholds[band - 1]
  return ((band - 1) + (elapsed - start) / (thresholds[band] - start)) / 8
}
