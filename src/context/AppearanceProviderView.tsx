import {
useCallback,
useEffect,
useMemo,
useState,
type ReactNode
} from 'react'
import { type SkinKey } from '../lib/skins'
import { type AppearanceConfig,AppearanceContext,applyToDocument,type BgPresetKey,defaultConfig,type FontFamilyKey,load,STORAGE } from './AppearanceProvider'

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
