import { useEffect, useState } from 'react'
import { APP_DISPLAY_NAMES_CHANGED_EVENT } from '../lib/appDisplayNameStore'

/** 自定义应用名变更时递增，用于触发依赖展示名的 useMemo 重算 */
export function useAppDisplayNamesRevision(): number {
  const [rev, setRev] = useState(0)
  useEffect(() => {
    const onChange = () => setRev((n) => n + 1)
    window.addEventListener(APP_DISPLAY_NAMES_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(APP_DISPLAY_NAMES_CHANGED_EVENT, onChange)
  }, [])
  return rev
}
