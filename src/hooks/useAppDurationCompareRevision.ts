import { useEffect, useState } from 'react'
import { APP_DURATION_COMPARE_CHANGED_EVENT } from '../lib/appDurationCompareStore'

export function useAppDurationCompareRevision(): number {
  const [rev, setRev] = useState(0)
  useEffect(() => {
    const onChange = () => setRev((n) => n + 1)
    window.addEventListener(APP_DURATION_COMPARE_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(APP_DURATION_COMPARE_CHANGED_EVENT, onChange)
  }, [])
  return rev
}
