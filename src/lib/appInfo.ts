/** 应用展示信息（版本号由 Vite 在构建时注入） */
export const APP_DISPLAY_NAME = '干啥了'
export const APP_PRODUCT_NAME = 'Ganshale'
export const APP_TAGLINE = '一款拯救你于日报、周报、月报水火的工具'

export const APP_VERSION = __APP_VERSION__

/** 版权持有人 */
export const APP_COPYRIGHT_OWNER = '小疯子'

export function appCopyrightYear(now = new Date()): number {
  return now.getFullYear()
}

/** 关于页「运行环境」展示文案 */
export function describeAppRuntime(): string {
  const desktop = window.ganshaleDesktop
  if (!desktop) return '浏览器'
  if (desktop.platform === 'win32') return 'Windows 客户端'
  if (desktop.platform === 'darwin') return 'macOS 客户端'
  if (desktop.platform === 'linux') return 'Linux 客户端'
  return '桌面客户端'
}

export const APP_FEATURES: { title: string; items: string[] }[] = [
  {
    title: '时间记录',
    items: [
      '桌面端自动采集前台窗口（应用、标题、时长），数据保存在本机',
      '每日看板：应用时长排行、分类分布、当前前台窗口',
      '支持按日、周、月、年查看与汇总',
    ],
  },
  {
    title: '工作记录与 AI',
    items: [
      '今日工作记录：手动填写与系统自动记录',
      'AI 自动总结：按间隔或定时将窗口活动压缩为工作记录',
      '一键生成日报、周报，支持自定义提示词与模型网关',
      '每天 18:00 可自动触发日报生成（可在日报页配置）',
    ],
  },
  {
    title: '数据与安全',
    items: [
      '桶与事件采用 IndexedDB 本地存储，无需上传云端即可使用',
      '支持 ActivityWatch 风格数据导入、导出与备份',
      '导出文件默认保存到系统「下载」文件夹',
    ],
  },
]
