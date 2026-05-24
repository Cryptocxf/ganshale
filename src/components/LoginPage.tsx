import { useCallback, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { GanshaleLogoMark } from './brand/GanshaleLogoMark'
import { APP_DISPLAY_NAME } from '../constants/brand'
import { useAuth, type WechatUser } from '../context/AuthContext'

// ── QR code SVG (visual mock, replace src with real WeChat QR API) ──────────
function QRGrid() {
  const N = 21

  const finderCells = useMemo(() => {
    const cells: { x: number; y: number }[] = []
    const addFinder = (ox: number, oy: number) => {
      for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          const on =
            dx === 0 || dx === 6 || dy === 0 || dy === 6 ||
            (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
          if (on) cells.push({ x: ox + dx, y: oy + dy })
        }
      }
    }
    addFinder(0, 0)
    addFinder(N - 7, 0)
    addFinder(0, N - 7)
    return cells
  }, [])

  const dataCells = useMemo(() => {
    const cells: { x: number; y: number }[] = []
    let s = 0xdeadbeef
    const rng = () => {
      s = ((s ^ (s << 13)) >>> 0)
      s = ((s ^ (s >> 17)) >>> 0)
      s = ((s ^ (s << 5)) >>> 0)
      return s % 2 === 0
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const inTL = x < 8 && y < 8
        const inTR = x >= N - 8 && y < 8
        const inBL = x < 8 && y >= N - 8
        const isTiming = (x === 6 && y > 7 && y < N - 7) || (y === 6 && x > 7 && x < N - 7)
        if (!inTL && !inTR && !inBL && !isTiming && rng()) {
          cells.push({ x, y })
        }
      }
    }
    return cells
  }, [])

  return (
    <svg
      viewBox={`0 0 ${N} ${N}`}
      width={180}
      height={180}
      shapeRendering="crispEdges"
    >
      <rect width={N} height={N} fill="white" />
      {finderCells.map(({ x, y }) => (
        <rect key={`f-${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111" />
      ))}
      {dataCells.map(({ x, y }) => (
        <rect key={`d-${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111" />
      ))}
    </svg>
  )
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
      <path d="M8.7 10.6c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9zm4.6 0c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9zM12 2C6.5 2 2 6 2 11c0 2.7 1.2 5.1 3.1 6.8l-.8 2.9 3.1-1.5c1.1.4 2.3.6 3.6.6 5.5 0 10-4 10-9S17.5 2 12 2z" />
      <path d="M16.8 15.4c-.3 0-.6-.3-.6-.6s.3-.6.6-.6.6.3.6.6-.3.6-.6.6zm3.2 0c-.3 0-.6-.3-.6-.6s.3-.6.6-.6.6.3.6.6-.3.6-.6.6zM20 12.5c-2.5 0-4.5 1.8-4.5 4s2 4 4.5 4c.8 0 1.5-.2 2.2-.5l2 1-.5-2c1.2-1 2.3-1.9 2.3-2.5 0-2.2-2-4-6-4z" opacity=".8" />
    </svg>
  )
}

// ── User avatar fallback ──────────────────────────────────────────────────────
function UserAvatar({ avatar, nickname, size }: { avatar: string; nickname: string; size: number }) {
  const [failed, setFailed] = useState(false)
  const initial = nickname?.[0] ?? '?'

  if (avatar && !failed) {
    return (
      <img
        src={avatar}
        alt={nickname}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-ganshale-accent text-white font-semibold select-none"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}

export { UserAvatar }

// ── Login Page ────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth()
  const [showDev, setShowDev] = useState(false)
  const [devName, setDevName] = useState('')
  const [devAvatar, setDevAvatar] = useState('')

  const handleDevLogin = useCallback(() => {
    const user: WechatUser = {
      openid: 'dev_' + Date.now(),
      nickname: devName.trim() || '开发者',
      avatar: devAvatar.trim(),
    }
    login(user)
  }, [login, devName, devAvatar])

  return (
    <div className="flex h-dvh w-full overflow-hidden">

      {/* ── Left: brand panel ─────────────────────────────────────────── */}
      <div className="relative hidden md:flex md:w-[55%] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-14">
        {/* glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_30%,rgba(14,165,233,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(99,102,241,0.08),transparent_55%)]" />

        <div className="relative flex flex-col items-center text-center max-w-md">
          <GanshaleLogoMark size={100} variant="app" />

          <h1 className="mt-8 font-display text-4xl font-bold tracking-tight text-white leading-tight">
            {APP_DISPLAY_NAME}
          </h1>

          <p className="mt-8 text-[15px] leading-[1.9] text-slate-400">
            你是不是每天忙得人仰马翻，<br />
            到了写日报的时候对着屏幕发呆——<br />
            <span className="mt-2 inline-block text-slate-200 font-medium">
              「我今天到底都干啥了？！」
            </span>
          </p>
          <p className="mt-5 text-[14px] leading-relaxed text-slate-500">
            Ganshale 替你把每一分钟都记下来，<br />
            让日报、周报、月报从此告别灵魂拷问。
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {['自动记录工作轨迹', 'AI 智能生成报告', '从此告别「不知道干啥了」'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="absolute bottom-6 text-[11px] text-slate-700">
          © {new Date().getFullYear()} Ganshale. 保留所有权利。
        </p>
      </div>

      {/* ── Right: login panel ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-ganshale-page px-6 py-10">

        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center md:hidden">
          <GanshaleLogoMark size={64} variant="app" />
          <h1 className="mt-3 font-display text-xl font-bold text-ganshale-text">{APP_DISPLAY_NAME}</h1>
        </div>

        <div className="w-full max-w-[300px]">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight text-ganshale-text">
            微信扫码登录
          </h2>
          <p className="mt-1.5 text-center text-sm text-ganshale-muted">
            授权后数据可跨设备同步
          </p>

          {/* QR code area */}
          <div className="mt-8 flex flex-col items-center">
            <div className="relative flex items-center justify-center rounded-2xl border-2 border-[#07C160]/35 bg-white p-2 shadow-sm">
              <QRGrid />
              {/* WeChat logo overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07C160] shadow-md">
                  <WechatIcon />
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-ganshale-muted">
              请用 <span className="font-semibold text-[#07C160]">微信</span> 扫一扫授权登录
            </p>
            <button
              type="button"
              className="mt-2 flex items-center gap-1 text-xs text-ganshale-subtle transition-colors hover:text-ganshale-muted"
            >
              <RefreshCw className="h-3 w-3" />
              刷新二维码
            </button>
          </div>

          {/* Divider */}
          <div className="mt-10 border-t border-ganshale-border" />

          {/* Dev mode */}
          <div className="mt-5">
            {!showDev ? (
              <button
                type="button"
                onClick={() => setShowDev(true)}
                className="w-full text-center text-xs text-ganshale-subtle transition-colors hover:text-ganshale-muted"
              >
                开发者快速登录
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  className="rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-2 text-sm text-ganshale-text placeholder:text-ganshale-subtle outline-none focus:ring-2 focus:ring-ganshale-accent/30"
                  placeholder="昵称（必填）"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDevLogin()}
                />
                <input
                  className="rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-2 text-sm text-ganshale-text placeholder:text-ganshale-subtle outline-none focus:ring-2 focus:ring-ganshale-accent/30"
                  placeholder="头像 URL（可选）"
                  value={devAvatar}
                  onChange={(e) => setDevAvatar(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleDevLogin}
                  className="rounded-lg bg-ganshale-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ganshale-accent-hover"
                >
                  登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
