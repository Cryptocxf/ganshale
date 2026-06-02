/** 客户端风格（组件样式 + 字体气质） */
export const SKIN_PRESETS = [
  {
    key: 'default',
    label: '默认',
    description: '白底、英文 Times、中文雅黑',
  },
  {
    key: 'ember',
    label: '琥珀暮光',
    description: '暖陶底色、铜橙光晕',
  },
  {
    key: 'minimal',
    label: '极简白',
    description: '大留白、细线描边',
  },
  {
    key: 'dark',
    label: '深空',
    description: '深色面板、青色高光',
  },
  {
    key: 'aurora',
    label: '极光紫',
    description: '靛紫渐变光晕',
  },
  {
    key: 'ocean',
    label: '深海蓝',
    description: '海蓝基调、清爽',
  },
  {
    key: 'forest',
    label: '森林绿',
    description: '自然绿、护眼',
  },
  {
    key: 'paper',
    label: '墨纸',
    description: '暖纸色、文楷',
  },
  {
    key: 'sakura',
    label: '樱暮薄雾',
    description: '雾粉底色、玫瑰高光',
  },
  {
    key: 'neon',
    label: '霓虹赛博',
    description: '暗底、品红电青',
  },
  {
    key: 'sunset',
    label: '落日金',
    description: '暖金夕照、柔和',
  },
  {
    key: 'lavender',
    label: '薄雾紫',
    description: '淡紫灰、静谧',
  },
] as const

export type SkinKey = (typeof SKIN_PRESETS)[number]['key']

const SKIN_KEYS = new Set<string>(SKIN_PRESETS.map((s) => s.key))

/** 已下架风格 → 保留项 */
const LEGACY_SKIN: Record<string, SkinKey> = {
  tech: 'ember',
  classic: 'sakura',
  midnight: 'ocean',
  rose: 'aurora',
  sunset: 'sunset',
  latte: 'paper',
  mono: 'minimal',
}

export function normalizeSkin(raw: unknown): SkinKey {
  if (typeof raw === 'string') {
    if (SKIN_KEYS.has(raw)) return raw as SkinKey
    const mapped = LEGACY_SKIN[raw]
    if (mapped) return mapped
  }
  return 'default'
}
