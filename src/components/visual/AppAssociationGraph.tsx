import { useCallback, useEffect, useMemo, useState } from 'react'
import { brandOrNeutralHex } from '../../lib/appBrandIcons'

export interface GraphAppBubble {
  app: string
  seconds: number
  appPath?: string
}

interface PosNode extends GraphAppBubble {
  x: number
  y: number
  r: number
  key: string
}

function loadEdges(storageKey: string): [string, string][] {
  try {
    const t = localStorage.getItem(storageKey)
    if (!t) return []
    const j = JSON.parse(t) as unknown
    if (!Array.isArray(j)) return []
    return j.filter(
      (x): x is [string, string] =>
        Array.isArray(x) &&
        x.length === 2 &&
        typeof x[0] === 'string' &&
        typeof x[1] === 'string',
    )
  } catch {
    return []
  }
}

function saveEdges(storageKey: string, edges: [string, string][]) {
  localStorage.setItem(storageKey, JSON.stringify(edges))
}

/** 应用气泡大小 ∝ 使用时长；依次点两个应用则连线表示关联（仅存本机）。 */
export function AppAssociationGraph({
  nodes,
  storageKey,
}: {
  nodes: GraphAppBubble[]
  storageKey: string
}) {
  const [edges, setEdges] = useState<[string, string][]>(() =>
    typeof window !== 'undefined' ? loadEdges(storageKey) : [],
  )
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    setEdges(typeof window !== 'undefined' ? loadEdges(storageKey) : [])
    setPending(null)
  }, [storageKey])

  const layout = useMemo(() => {
    const list = [...nodes]
      .filter((n) => n.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 12)
    if (list.length === 0) return { w: 640, h: 320, placed: [] as PosNode[] }
    const maxS = Math.max(1, list[0]!.seconds)
    const w = 640
    const h = 320
    const cx = w / 2
    const cy = h / 2
    const placed: PosNode[] = list.map((n, i) => {
      const key = n.app
      const t = Math.sqrt(n.seconds / maxS)
      const r = 22 + t * 52
      if (i === 0) return { ...n, key, x: cx, y: cy, r }
      const ring = Math.floor((i - 1) / 8) + 1
      const idx = (i - 1) % 8
      const angle = (idx / 8) * Math.PI * 2 - Math.PI / 2
      const dist = 70 * ring + r * 0.35
      return {
        ...n,
        key,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        r,
      }
    })
    return { w, h, placed }
  }, [nodes])

  const onNodeClick = useCallback(
    (key: string) => {
      if (!pending) {
        setPending(key)
        return
      }
      if (pending === key) {
        setPending(null)
        return
      }
      const a = pending < key ? pending : key
      const b = pending < key ? key : pending
      setEdges((prev) => {
        const exists = prev.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
        const next = exists ? prev : [...prev, [a, b] as [string, string]]
        saveEdges(storageKey, next)
        return next
      })
      setPending(null)
    },
    [pending, storageKey],
  )

  const edgeSet = useMemo(() => {
    const m = new Map<string, [PosNode, PosNode]>()
    const byKey = new Map(layout.placed.map((p) => [p.key, p]))
    for (const [a, b] of edges) {
      const na = byKey.get(a)
      const nb = byKey.get(b)
      if (na && nb) {
        const k = a < b ? `${a}|${b}` : `${b}|${a}`
        m.set(k, [na, nb])
      }
    }
    return [...m.values()]
  }, [edges, layout.placed])

  if (layout.placed.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-ganshale-border bg-white/50 p-6 text-center text-sm text-ganshale-muted">
        暂无应用数据。使用桌面端采集或「设置」中的演示数据后，此处会显示应用气泡。
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-black/[0.06] bg-white/80 p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ganshale-text">应用关联</h3>
        <p className="max-w-md text-[10px] text-ganshale-muted">
          圆大小表示当日使用时长；先点一应用再点另一应用可连线（再点同一应用取消选择）
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <svg
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          className="h-full w-full touch-manipulation"
          preserveAspectRatio="xMidYMid meet"
        >
          {edgeSet.map(([na, nb], i) => (
            <line
              key={`${na.key}-${nb.key}-${i}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
          {layout.placed.map((n) => {
            const fill = brandOrNeutralHex(n.app)
            const sel = pending === n.key
            return (
              <g key={n.key}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={fill}
                  opacity={0.88}
                  stroke={sel ? '#171717' : 'rgba(0,0,0,0.12)'}
                  strokeWidth={sel ? 3 : 1.5}
                  className="cursor-pointer transition hover:opacity-100"
                  onClick={() => onNodeClick(n.key)}
                />
                <text
                  x={n.x}
                  y={n.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none fill-white text-[10px] font-semibold drop-shadow-sm"
                  style={{
                    fontSize: Math.max(9, Math.min(13, n.r / 3.2)),
                  }}
                >
                  {n.app.replace(/\.exe$/i, '').slice(0, 8)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
