import { useCallback, useEffect, useRef, useState } from 'react'
import { BRAND_LOGO_BG } from '../../constants/brand'
import { GanshaleLogoMark } from './GanshaleLogoMark'

interface SplashScreenProps {
  onComplete: () => void
}

const SPLASH_MS = 3000
const FADE_MS = 500

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false)
  const finishedRef = useRef(false)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete()
  }, [onComplete])

  const beginExit = useCallback(() => {
    if (finishedRef.current) return
    setExiting(true)
    window.setTimeout(finish, FADE_MS)
  }, [finish])

  useEffect(() => {
    const t = window.setTimeout(beginExit, SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [beginExit])

  return (
    <div
      className={[
        'fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-500 ease-out',
        exiting ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
      style={{ backgroundColor: BRAND_LOGO_BG }}
      role="img"
      aria-label="应用启动"
      aria-busy={!exiting}
    >
      <div className="splash-logo-shine">
        <GanshaleLogoMark variant="splash" size={400} className="splash-logo-mark" />
      </div>
    </div>
  )
}
