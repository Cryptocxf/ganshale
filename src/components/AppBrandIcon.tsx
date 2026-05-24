import { useEffect, useState } from 'react'
import {
  brandFallbackLetter,
  brandIconUrl,
  brandOrNeutralHex,
  normalizeAppKey,
} from '../lib/appBrandIcons'
import { isDocTypeIdentityKey } from '../lib/windowAppDisplay'

type Phase = 'native' | 'brand' | 'letter'

/** 优先系统文件图标（Electron），其次 Simple Icons，再字母回退 */
export function AppBrandIcon({
  app,
  appPath,
  brandKey,
  size = 22,
  className = '',
}: {
  app: string
  /** 可执行文件完整路径，仅 Electron 有效 */
  appPath?: string
  /** 展示/图标键（如 word、excel）；默认用进程名 */
  brandKey?: string
  size?: number
  className?: string
}) {
  const iconKey = (brandKey?.trim() || app).trim()
  const useDocTypeIcon = isDocTypeIdentityKey(normalizeAppKey(iconKey))
  const brandUrl = brandIconUrl(iconKey)
  const letter = brandFallbackLetter(iconKey)
  const bg = iconKey ? brandOrNeutralHex(iconKey) : '#a1a1aa'

  const trimmedPath = appPath?.trim() ?? ''
  const skipNative = useDocTypeIcon && Boolean(brandUrl)

  const [phase, setPhase] = useState<Phase>(() =>
    skipNative ? 'brand' : trimmedPath ? 'native' : brandUrl ? 'brand' : 'letter',
  )
  const [nativeSrc, setNativeSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      const hasBridge =
        typeof window !== 'undefined' && Boolean(window.ganshaleDesktop?.getFileIcon)
      if (skipNative || !trimmedPath || !hasBridge) {
        setNativeSrc(null)
        setPhase(brandUrl ? 'brand' : 'letter')
        return
      }

      setPhase('native')
      setNativeSrc(null)

      void window.ganshaleDesktop!.getFileIcon!(trimmedPath).then((url) => {
        if (cancelled) return
        if (url) {
          setNativeSrc(url)
          setPhase('native')
        } else {
          setNativeSrc(null)
          setPhase(brandUrl ? 'brand' : 'letter')
        }
      })
    })
    return () => {
      cancelled = true
    }
  }, [trimmedPath, brandUrl, skipNative])

  const showNative = phase === 'native' && Boolean(nativeSrc)
  const showBrand =
    (phase === 'brand' && brandUrl) ||
    (phase === 'native' && !nativeSrc && brandUrl)
  const displaySrc = showNative ? nativeSrc! : showBrand ? brandUrl! : null
  const showImg = Boolean(displaySrc)

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ganshale-surface ring-1 ring-ganshale-border',
        className,
      ].join(' ')}
      style={{ width: size, height: size }}
      title={trimmedPath || app || normalizeAppKey(app)}
    >
      {showImg ? (
        <img
          src={displaySrc!}
          alt=""
          width={size}
          height={size}
          className="object-contain p-[3px]"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const failed = e.currentTarget.getAttribute('src') ?? ''
            if (failed.startsWith('data:')) {
              setNativeSrc(null)
              setPhase(brandUrl ? 'brand' : 'letter')
            } else {
              setPhase('letter')
            }
          }}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white shadow-inner"
          style={{ backgroundColor: bg }}
        >
          {letter}
        </span>
      )}
    </span>
  )
}
