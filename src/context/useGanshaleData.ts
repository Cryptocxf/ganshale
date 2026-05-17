import { useContext } from 'react'
import {
  GanshaleDataContext,
  type GanshaleDataContextValue,
} from './ganshaleDataContext'

export function useGanshaleData(): GanshaleDataContextValue {
  const ctx = useContext(GanshaleDataContext)
  if (!ctx) throw new Error('useGanshaleData must be used within GanshaleDataProvider')
  return ctx
}
