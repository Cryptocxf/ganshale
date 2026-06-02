import type { NavKey } from '../data/mock'

const titles: Record<NavKey, { title: string; desc: string }> = {
  daily: { title: '', desc: '' },
  weekly: {
    title: '每周',
    desc: '按自然周汇总窗口活跃与应用排行。',
  },
  monthly: {
    title: '每月',
    desc: '按自然月汇总窗口活跃与应用排行。',
  },
  todos: {
    title: '待办',
    desc: '待办事项、截止时间与倒计时。',
  },
  data: {
    title: '数据',
    desc: '桶与事件浏览、JSON 导入导出。',
  },
  settings: {
    title: '设置',
    desc: '外观、演示数据与本地存储。',
  },
}

interface PlaceholderViewProps {
  page: Exclude<NavKey, 'daily'>
}

export function PlaceholderView({ page }: PlaceholderViewProps) {
  const { title, desc } = titles[page]
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 py-16 text-center">
      <div className="max-w-md rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-8 py-12">
        <p className="font-display text-2xl font-semibold text-ganshale-text">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-ganshale-muted">{desc}</p>
      </div>
    </div>
  )
}
