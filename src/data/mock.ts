export type NavKey = 'daily' | 'weekly' | 'monthly' | 'todos' | 'data' | 'settings'

export interface TimelineSegment {
  id: string
  label: string
  startMin: number
  endMin: number
  color: string
}

export interface ActivityRow {
  id: string
  time: string
  title: string
  subtitle: string
  duration: string
  accent: 'gold' | 'sky' | 'mint' | 'coral'
}

export const timelineToday: TimelineSegment[] = [
  { id: '1', label: '睡眠', startMin: 0, endMin: 420, color: '#3d4458' },
  { id: '2', label: '晨间', startMin: 420, endMin: 480, color: '#e8b86d' },
  { id: '3', label: '工作', startMin: 480, endMin: 720, color: '#7eb8ff' },
  { id: '4', label: '会议', startMin: 720, endMin: 780, color: '#c49ae8' },
  { id: '5', label: '编码', startMin: 780, endMin: 1020, color: '#6ec9a8' },
  { id: '6', label: '浏览', startMin: 1020, endMin: 1140, color: '#e07a7a' },
  { id: '7', label: 'AFK', startMin: 1140, endMin: 1200, color: '#4a5066' },
  { id: '8', label: '晚间', startMin: 1200, endMin: 1440, color: '#2a3144' },
]

export const recentActivities: ActivityRow[] = [
  {
    id: 'a1',
    time: '14:32',
    title: 'Visual Studio Code',
    subtitle: '干啥了 · src/components/Sidebar.tsx',
    duration: '42 分钟',
    accent: 'mint',
  },
  {
    id: 'a2',
    time: '13:05',
    title: 'Microsoft Edge',
    subtitle: 'GitHub — ActivityWatch/activitywatch',
    duration: '28 分钟',
    accent: 'sky',
  },
  {
    id: 'a3',
    time: '11:40',
    title: 'Figma',
    subtitle: '干啥了 仪表盘 — Frame 概览',
    duration: '1 小时 12 分',
    accent: 'gold',
  },
  {
    id: 'a4',
    time: '10:15',
    title: 'Windows 终端',
    subtitle: 'PowerShell — npm run dev',
    duration: '19 分钟',
    accent: 'coral',
  },
]

export const statCards = [
  {
    label: '今日屏幕活跃',
    value: '6 小时 24 分',
    hint: '较昨日 +18 分钟',
    positive: true,
  },
  {
    label: '专注块（>25 分钟）',
    value: '5 次',
    hint: '最长连续 1 小时 08 分',
    positive: true,
  },
  {
    label: '应用切换',
    value: '86 次',
    hint: '略高，适当合并上下文更高效',
    positive: false,
  },
  {
    label: '本地事件写入',
    value: '12,480 条',
    hint: '全部仅存于本机数据库',
    positive: true,
  },
] as const
