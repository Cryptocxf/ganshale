import { useMemo, useState } from 'react'

import {

  groupTodosByStatus,

  TODO_GROUP_META,

  type TodoGroupId,

  type TodoViewTab,

} from '../../lib/todoView'

import {

  nextTodoSortState,

  sortTodoItems,

  type TodoSortDirection,

  type TodoSortField,

} from '../../lib/todoSort'

import type { TodoItem } from '../../lib/todoStore'

import { TodoSortToolbar } from './TodoSortHeader'

import { TodoTaskCard } from './TodoTaskCard'



const GROUP_ORDER: TodoGroupId[] = ['in_progress', 'pending', 'completed']



export function TodoTaskGroupList({

  items,

  tab,

  nowMs,

}: {

  items: TodoItem[]

  tab: TodoViewTab

  nowMs: number

}) {

  const [pendingSortField, setPendingSortField] = useState<TodoSortField>('time')

  const [pendingSortDirection, setPendingSortDirection] = useState<TodoSortDirection>('asc')



  const onPendingSortToggle = (field: TodoSortField) => {

    const next = nextTodoSortState(field, pendingSortField, pendingSortDirection)

    setPendingSortField(next.field)

    setPendingSortDirection(next.direction)

  }



  const groups = useMemo(

    () => groupTodosByStatus(items, tab, nowMs),

    [items, tab, nowMs],

  )



  const pendingSorted = useMemo(

    () => sortTodoItems(groups.pending, pendingSortField, pendingSortDirection, 'deadline'),

    [groups.pending, pendingSortField, pendingSortDirection],

  )



  const hasAny = GROUP_ORDER.some((id) => {

    if (id === 'pending') return pendingSorted.length > 0

    return groups[id].length > 0

  })



  if (!hasAny) {

    return (

      <p className="py-12 text-center text-sm text-ganshale-muted">

        当前范围暂无待办，点击右上角「新建」添加

      </p>

    )

  }



  return (

    <div className="space-y-5">

      {GROUP_ORDER.map((groupId) => {

        const list = groupId === 'pending' ? pendingSorted : groups[groupId]

        if (list.length === 0) return null

        const meta = TODO_GROUP_META[groupId]

        return (

          <section key={groupId} aria-labelledby={`todo-group-${groupId}`}>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

              <div className="flex items-center gap-2">

                <h2

                  id={`todo-group-${groupId}`}

                  className="text-sm font-semibold text-ganshale-text"

                >

                  {meta.title}

                </h2>

                <span className="todo-group-badge">{list.length}</span>

              </div>

              {groupId === 'pending' ? (

                <TodoSortToolbar

                  sortField={pendingSortField}

                  sortDirection={pendingSortDirection}

                  onToggle={onPendingSortToggle}

                />

              ) : null}

            </div>

            <ul className="space-y-2">

              {list.map((item) => (

                <li key={item.id}>

                  <TodoTaskCard item={item} nowMs={nowMs} />

                </li>

              ))}

            </ul>

          </section>

        )

      })}

    </div>

  )

}


