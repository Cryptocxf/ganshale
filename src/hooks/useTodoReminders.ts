import { useEffect } from 'react'
import { markTodoReminderFired, todosDueForReminder } from '../lib/todoStore'

const POLL_MS = 15_000

function showBrowserNotification(title: string, body: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
    return
  }
  if (Notification.permission === 'default') {
    void Notification.requestPermission().then((p) => {
      if (p === 'granted') new Notification(title, { body })
    })
  }
}

/** 桌面端走主进程右下角弹窗；浏览器开发态用系统通知 */
export function useTodoReminderScheduler(enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      const now = Date.now()
      const due = todosDueForReminder(now)
      if (due.length === 0) return

      const bridge = window.ganshaleDesktop?.showTodoReminder
      for (const todo of due) {
        markTodoReminderFired(todo.id)
        const body = todo.reminderAt
          ? `提醒时间：${new Date(todo.reminderAt).toLocaleString()}`
          : todo.deadlineAt
            ? `截止时间：${new Date(todo.deadlineAt).toLocaleString()}`
            : '记得处理这条待办'
        if (bridge) {
          void bridge({
            todoId: todo.id,
            title: todo.title,
            body,
            priority: todo.priority,
          })
        } else {
          showBrowserNotification(`待办提醒 · ${'⭐'.repeat(todo.priority)}`, `${todo.title}\n${body}`)
        }
      }
    }

    tick()
    const id = window.setInterval(tick, POLL_MS)
    return () => clearInterval(id)
  }, [enabled])
}
