import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { normalizeSkin, type SkinKey } from '../lib/skins'

const STORAGE = 'ganshale-appearance-v1'

export type FontFamilyKey = 'sans' | 'serif' | 'mono'

/** 页面背景预设（内部默认 white，设置页已隐藏） */
export const BG_PRESETS = [
  { key: 'gray', label: '浅灰', swatch: '#ebeaf0' },
  { key: 'red', label: '赤', swatch: '#e8b4b4' },
  { key: 'orange', label: '橙', swatch: '#e8c49a' },
  { key: 'yellow', label: '黄', swatch: '#e8d88c' },
  { key: 'green', label: '绿', swatch: '#a8d4b0' },
  { key: 'cyan', label: '青', swatch: '#98d4dc' },
  { key: 'blue', label: '蓝', swatch: '#98b8e8' },
  { key: 'purple', label: '紫', swatch: '#c4a8dc' },
  { key: 'white', label: '白', swatch: '#ffffff' },
  { key: 'black', label: '黑', swatch: '#121214' },
] as const

export type BgPresetKey = (typeof BG_PRESETS)[number]['key']

const BG_PRESET_KEYS = new Set<string>(BG_PRESETS.map((p) => p.key))

const LEGACY_BG: Record<string, BgPresetKey> = {
  light: 'white',
  linen: 'white',
  sand: 'orange',
  sage: 'green',
  mist: 'cyan',
  blush: 'red',
  dark: 'black',
  ink: 'black',
  slate: 'gray',
  forest: 'green',
  plum: 'purple',
  ember: 'orange',
  ocean: 'blue',
  sunset: 'orange',
  lavender: 'purple',
}

function normalizeBgPreset(raw: unknown): BgPresetKey {
  if (typeof raw === 'string') {
    if (BG_PRESET_KEYS.has(raw)) return raw as BgPresetKey
    const mapped = LEGACY_BG[raw]
    if (mapped) return mapped
  }
  return 'white'
}

export interface AppearanceConfig {
  fontScale: number
  fontFamily: FontFamilyKey
  bgPreset: BgPresetKey
  skin: SkinKey
}

const defaultConfig: AppearanceConfig = {
  fontScale: 1,
  fontFamily: 'sans',
  bgPreset: 'white',
  skin: 'default',
}

function applyToDocument(config: AppearanceConfig): void {
  const root = document.documentElement
  root.dataset.skin = config.skin
  root.dataset.bg = config.bgPreset
  root.style.fontSize = `${16 * config.fontScale}px`
}

function load(): AppearanceConfig {
  try {
    const t = localStorage.getItem(STORAGE)
    if (!t) return defaultConfig
    const j = JSON.parse(t) as Partial<AppearanceConfig>
    let bgPreset = normalizeBgPreset(j.bgPreset)
    if (bgPreset === 'gray') bgPreset = 'white'
    const config: AppearanceConfig = {
      fontScale:
        typeof j.fontScale === 'number' && j.fontScale >= 0.8 && j.fontScale <= 1.35
          ? j.fontScale
          : 1,
      fontFamily:
        j.fontFamily === 'serif' || j.fontFamily === 'mono' ? j.fontFamily : 'sans',
      bgPreset,
      skin: normalizeSkin(j.skin),
    }
    if (j.bgPreset === 'gray') {
      localStorage.setItem(STORAGE, JSON.stringify(config))
    }
    return config
  } catch {
    return defaultConfig
  }
}

/** 在 React 挂载前同步 html[data-skin] / data-bg，避免闪烁 */
export function applyAppearanceFromStorage(): void {
  if (typeof document === 'undefined') return
  applyToDocument(load())
}

type Ctx = {
  config: AppearanceConfig
  setFontFamily: (k: FontFamilyKey) => void
  setBgPreset: (k: BgPresetKey) => void
  setSkin: (k: SkinKey) => void
}

const AppearanceContext = createContext<Ctx | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppearanceConfig>(() =>
    typeof window !== 'undefined' ? load() : defaultConfig,
  )

  const patch = useCallback((partial: Partial<AppearanceConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem(STORAGE, JSON.stringify(next))
      return next
    })
  }, [])

  const setFontFamily = useCallback(
    (fontFamily: FontFamilyKey) => patch({ fontFamily }),
    [patch],
  )
  const setBgPreset = useCallback((bgPreset: BgPresetKey) => patch({ bgPreset }), [patch])
  const setSkin = useCallback((skin: SkinKey) => patch({ skin }), [patch])

  useEffect(() => {
    applyToDocument(config)
  }, [config])

  const value = useMemo(
    () => ({ config, setFontFamily, setBgPreset, setSkin }),
    [config, setFontFamily, setBgPreset, setSkin],
  )

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  )
}

export function useAppearance(): Ctx {
  const x = useContext(AppearanceContext)
  if (!x) throw new Error('useAppearance must be used within AppearanceProvider')
  return x
}
