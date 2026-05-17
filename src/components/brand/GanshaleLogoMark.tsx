import {
  BRAND_LOGO_APP_SRC,
  BRAND_LOGO_BG,
  BRAND_LOGO_SPLASH_SRC,
} from '../../constants/brand'

/**
 * 品牌图：`splash` 为入场完整版，`app` 为应用内 logo1 图标。
 */
export function GanshaleLogoMark({
  className = '',
  size = 120,
  variant = 'app',
}: {
  className?: string
  size?: number
  /** `splash` 入场动画；`app` 侧栏、顶栏等 */
  variant?: 'splash' | 'app'
}) {
  const isSplash = variant === 'splash'
  const src = isSplash ? BRAND_LOGO_SPLASH_SRC : BRAND_LOGO_APP_SRC

  return (
    <div
      className={['inline-flex shrink-0 items-center justify-center', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: size,
        height: size,
        ...(isSplash ? { backgroundColor: BRAND_LOGO_BG } : {}),
      }}
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={[
          'h-full w-full select-none object-contain',
          isSplash ? '' : 'drop-shadow-md',
        ]
          .filter(Boolean)
          .join(' ')}
        draggable={false}
        decoding="async"
      />
    </div>
  )
}
