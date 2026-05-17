import { useMemo } from 'react'

/**
 * Logo 上方一双眼睛；视线随「加载」进度从左下沿弧扫向右下（对准下方进度条方向）。
 */
export function SplashProgressEyes({
  progress,
  reduceMotion,
}: {
  progress: number
  reduceMotion: boolean
}) {
  const { gazeX, gazeY } = useMemo(() => {
    const t = Math.min(1, Math.max(0, progress / 100))
    /** 视线自左下扫向右下，对准下方横向进度条 */
    const gazeX = -11 + t * 22
    const gazeY = 5.2 - t * 1.6
    return { gazeX, gazeY }
  }, [progress])

  const dur = reduceMotion ? '80ms' : '480ms'

  return (
    <div
      className={[
        'splash-progress-eyes pointer-events-none -mb-1 flex justify-center gap-[1.05rem]',
        reduceMotion ? '' : 'splash-progress-eyes--live',
      ].join(' ')}
      aria-hidden
    >
      {[0, 1].map((key) => (
        <div
          key={key}
          className="relative h-8 w-[3.35rem] rounded-[50%] bg-gradient-to-b from-white to-zinc-50 shadow-sm ring-1 ring-zinc-400/75 sm:h-9 sm:w-[3.65rem]"
        >
          {/* 眼白上缘微亮 */}
          <div className="pointer-events-none absolute inset-x-1 top-1 h-2 rounded-full bg-white/90 blur-[1px]" />
          <div
            className="absolute left-1/2 top-[56%] h-3.5 w-3.5 rounded-full bg-zinc-900 sm:h-4 sm:w-4"
            style={{
              transform: `translate(calc(-50% + ${gazeX}px), calc(-50% + ${gazeY}px))`,
              transition: `transform ${dur} cubic-bezier(0.28, 0.9, 0.32, 1)`,
              boxShadow:
                'inset -1px -1px 2px rgba(255,255,255,0.22), 0 0.5px 1px rgba(0,0,0,0.35)',
            }}
          >
            <span className="absolute left-0.5 top-0.5 block h-1 w-1 rounded-full bg-white/95 shadow-sm" />
          </div>
        </div>
      ))}
    </div>
  )
}
