import { useCallback, useEffect, useState } from 'react'
import {
  loadTodos,
  sortTodos,
  TODOS_UPDATED_EVENT,
  type TodoItem,
} from '../lib/todoStore'

export function useTodos(): TodoItem[] {
  const [items, setItems] = useState<TodoItem[]>(() => sortTodos(loadTodos()))

  const sync = useCallback(() => {
    setItems(sortTodos(loadTodos()))
  }, [])

  useEffect(() => {
    window.addEventListener(TODOS_UPDATED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(TODOS_UPDATED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [sync])

  return items
}

/** 待办页倒计时每秒刷新 */
export function useTodoClockMs(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}
