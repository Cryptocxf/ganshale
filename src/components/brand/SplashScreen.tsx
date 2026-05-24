import { useCallback, useEffect, useRef, useState } from 'react'
import { BRAND_LOGO_APP_SRC } from '../../constants/brand'

interface SplashScreenProps {
  onComplete: () => void
}

const SPLASH_MS = 4000
const FADE_MS = 500

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false)
  const [visible, setVisible] = useState(false)
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
    // 触发入场动画
    const tVisible = window.setTimeout(() => setVisible(true), 30)
    // 开始退出
    const tExit = window.setTimeout(beginExit, SPLASH_MS)
    return () => {
      window.clearTimeout(tVisible)
      window.clearTimeout(tExit)
    }
  }, [beginExit])

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 140% 90% at 50% 20%, #e2e8f0 0%, #f1f5f9 65%)',
        opacity: exiting ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
      role="img"
      aria-label="应用启动"
    >
      {/* 外层光晕 */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 520,
          height: 520,
          background: 'radial-gradient(circle, rgba(14,165,233,0.22) 0%, transparent 68%)',
          transform: visible ? 'scale(1)' : 'scale(0.5)',
          opacity: visible ? 1 : 0,
          transition: 'transform 1.4s cubic-bezier(0.22,1,0.36,1), opacity 1s ease',
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 320,
          height: 320,
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%)',
          transform: visible ? 'scale(1)' : 'scale(0.3)',
          opacity: visible ? 1 : 0,
          transition: 'transform 1.6s cubic-bezier(0.22,1,0.36,1) 0.1s, opacity 1s ease 0.1s',
        }}
      />

      {/* 旋转光环 */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 230,
          height: 230,
          border: '1px solid rgba(14,165,233,0.45)',
          animation: visible ? 'gs-spin 8s linear infinite' : 'none',
          opacity: visible ? 0.8 : 0,
          transition: 'opacity 1.2s ease 0.3s',
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 276,
          height: 276,
          border: '1px dashed rgba(99,102,241,0.35)',
          animation: visible ? 'gs-spin-rev 14s linear infinite' : 'none',
          opacity: visible ? 0.6 : 0,
          transition: 'opacity 1.2s ease 0.45s',
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.4) translateY(24px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 1s cubic-bezier(0.22,1,0.36,1), opacity 0.8s ease',
          filter: 'drop-shadow(0 0 36px rgba(14,165,233,0.55)) drop-shadow(0 0 14px rgba(99,102,241,0.45))',
        }}
      >
        <img
          src={BRAND_LOGO_APP_SRC}
          alt=""
          width={120}
          height={120}
          className="select-none"
          draggable={false}
          decoding="async"
        />
      </div>

      {/* 文字区域 */}
      <div
        style={{
          marginTop: 28,
          textAlign: 'center',
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 1s cubic-bezier(0.22,1,0.36,1) 0.14s, opacity 0.8s ease 0.14s',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: '0.06em',
            lineHeight: 1,
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 35%, #0ea5e9 65%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          干啥了
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.28em',
            fontStyle: 'italic',
            background: 'linear-gradient(90deg, #60a5fa 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
        >
          GanShaLe
        </p>
        <p
          style={{
            margin: '48px auto 0',
            whiteSpace: 'nowrap',
            fontSize: 12.5,
            lineHeight: 1,
            color: 'rgba(71,85,105,0.85)',
          }}
        >
          每天忙得晕头转向，却不知自己<span style={{ color: '#0284c7', fontWeight: 600 }}>干啥了</span>？此软件替你记得明明白白。
        </p>
      </div>

      {/* 版权 */}
      <p
        style={{
          position: 'absolute',
          bottom: 22,
          fontSize: 11,
          letterSpacing: '0.06em',
          color: 'rgba(71,85,105,0.75)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1.2s ease 0.6s',
        }}
      >
        @2026 干啥了·小疯子
      </p>

      <style>{`
        @keyframes gs-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes gs-spin-rev {
          to { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  )
}
