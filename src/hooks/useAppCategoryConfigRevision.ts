import { useEffect, useState } from 'react'
import { APP_CATEGORY_CONFIG_CHANGED_EVENT } from '../lib/appCategoryConfig'

export function useAppCategoryConfigRevision(): number {
  const [rev, setRev] = useState(0)
  useEffect(() => {
    const onChange = () => setRev((n) => n + 1)
    window.addEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, onChange)
  }, [])
  return rev
}
