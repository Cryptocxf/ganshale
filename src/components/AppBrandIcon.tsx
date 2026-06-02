import { useEffect, useState } from 'react'
import {
  brandFallbackLetter,
  brandIconUrl,
  brandOrNeutralHex,
  bundledAppIconUrl,
  normalizeAppKey,
  prefersBundledIconOverNative,
} from '../lib/appBrandIcons'
import { isDocTypeIdentityKey } from '../lib/windowAppDisplay'

type Phase = 'native' | 'brand' | 'letter'

function nativeIconQuery(app: string, appPath?: string): string {
  const trimmedPath = appPath?.trim() ?? ''
  if (trimmedPath) return trimmedPath
  const key = normalizeAppKey(app)
  if (!key || key === 'unknown') return ''
  return /\.exe$/i.test(key) ? key : `${key}.exe`
}

/** 优先系统文件图标（Electron），其次内置 / Simple Icons，再字母回退 */
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
  const bundledUrl =
    bundledAppIconUrl(iconKey, { appPath }) ?? bundledAppIconUrl(app, { appPath })
  const staticBrandUrl = bundledUrl ?? brandIconUrl(iconKey)
  const letter = brandFallbackLetter(iconKey)
  const bg = iconKey ? brandOrNeutralHex(iconKey) : '#a1a1aa'

  const nativeQuery = nativeIconQuery(app, appPath)
  const skipNative =
    prefersBundledIconOverNative(app, brandKey, appPath) ||
    (useDocTypeIcon && Boolean(staticBrandUrl))

  const [phase, setPhase] = useState<Phase>(() =>
    skipNative ? 'brand' : staticBrandUrl ? 'brand' : nativeQuery ? 'native' : 'letter',
  )
  const [nativeSrc, setNativeSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      const hasBridge =
        typeof window !== 'undefined' && Boolean(window.ganshaleDesktop?.getFileIcon)
      if (skipNative || !nativeQuery || !hasBridge) {
        setNativeSrc(null)
        setPhase(staticBrandUrl ? 'brand' : 'letter')
        return
      }

      setPhase(staticBrandUrl ? 'brand' : 'native')
      setNativeSrc(null)

      void window.ganshaleDesktop!.getFileIcon!(nativeQuery).then((url) => {
        if (cancelled) return
        if (url) {
          setNativeSrc(url)
          setPhase('native')
        } else {
          setNativeSrc(null)
          setPhase(staticBrandUrl ? 'brand' : 'letter')
        }
      })
    })
    return () => {
      cancelled = true
    }
  }, [nativeQuery, staticBrandUrl, skipNative])

  const showNative = phase === 'native' && Boolean(nativeSrc)
  const showBrand =
    (phase === 'brand' && staticBrandUrl) ||
    (phase === 'native' && !nativeSrc && staticBrandUrl)
  const displaySrc = showNative ? nativeSrc! : showBrand ? staticBrandUrl! : null
  const showImg = Boolean(displaySrc)

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ganshale-surface ring-1 ring-ganshale-border',
        className,
      ].join(' ')}
      style={{ width: size, height: size }}
      title={nativeQuery || app || normalizeAppKey(app)}
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
              setPhase(staticBrandUrl ? 'brand' : 'letter')
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
