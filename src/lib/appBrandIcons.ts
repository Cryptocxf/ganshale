import {
  buildDistinctChartColorMap,
  colorForAppLabel,
  isMutedChartColor,
} from './appPalette'

import { BRAND_LOGO_APP_SRC, OPENCLAW_ICON_SRC } from '../constants/brand'

/** Normalize to basename lowercase for lookup (Windows .exe etc.). */
export function normalizeAppKey(app: string): string {
  const t = app.trim()
  const base = t.split(/[/\\]/).pop() ?? t
  return base.toLowerCase()
}

type Brand = { slug: string; hex: string }

/**
 * 直接可用的图标 URL（Simple Icons 未收录或 CDN 不可用）。
 * 优先使用 Iconify；少数用官网 favicon（.ico 亦可作 img src）。
 */
const DIRECT_ICON_URL: Record<string, string> = {
  'wps.exe': 'https://www.wps.com/favicon.ico',
  'et.exe': 'https://www.wps.com/favicon.ico',
  'wpp.exe': 'https://www.wps.com/favicon.ico',
  'wemeetapp.exe': 'https://meeting.tencent.com/favicon.ico',
  'txmeeting.exe': 'https://meeting.tencent.com/favicon.ico',
  'baidunetdisk.exe': 'https://pan.baidu.com/favicon.ico',
  baidunetdisk: 'https://pan.baidu.com/favicon.ico',
}

/** Office 文档类型图标（Iconify / VS Code Icons 文件类型） */
const DOC_TYPE_ICONIFY: Record<string, string> = {
  word: 'vscode-icons:file-type-word',
  excel: 'vscode-icons:file-type-excel',
  ppt: 'vscode-icons:file-type-powerpoint',
  pdf: 'vscode-icons:file-type-pdf',
}

const DOC_TYPE_BRANDS: Record<string, Brand> = {
  word: { slug: 'microsoftword', hex: '2B579A' },
  excel: { slug: 'microsoftexcel', hex: '217346' },
  ppt: { slug: 'microsoftpowerpoint', hex: 'D24726' },
  pdf: { slug: 'adobeacrobatreader', hex: 'EC1C24' },
}

/** Iconify `集合:图标名`（不含 .svg），见 https://icon-sets.iconify.design/ */
const DIRECT_ICONIFY: Record<string, string> = {
  'dingtalk.exe': 'arcticons:dingtalk',
  'dingtalklauncher.exe': 'arcticons:dingtalk',
  ...DOC_TYPE_ICONIFY,
}

/** 图表条颜色（与 Simple Icons slug 解耦，避免 slug 仅作占位时串色） */
const CHART_HEX_OVERRIDE: Record<string, string> = {
  'dingtalk.exe': '#0089FF',
  vscode: '#007ACC',
  word: '#2B579A',
  excel: '#217346',
  ppt: '#D24726',
  pdf: '#E60012',
  'wps.exe': '#E60012',
  'et.exe': '#217346',
  'wpp.exe': '#D71345',
  'wemeetapp.exe': '#1296DB',
  'txmeeting.exe': '#1296DB',
  baidunetdisk: '#2932E1',
  openclaw: '#E85D04',
  chuanyun: '#0066FF',
}

/** Known apps → Simple Icons slug + brand hex（图表着色；图标经 {@link brandIconUrl}）。 */
const BRANDS: Record<string, Brand> = {
  vscode: { slug: 'visualstudiocode', hex: '007ACC' },
  'code.exe': { slug: 'visualstudiocode', hex: '007ACC' },
  'code - insiders.exe': { slug: 'visualstudiocode', hex: '24bfa5' },
  'code-insiders.exe': { slug: 'visualstudiocode', hex: '24bfa5' },
  'vscodium.exe': { slug: 'vscodium', hex: '2f80ed' },
  'cursor.exe': { slug: 'cursor', hex: '141414' },
  'idea64.exe': { slug: 'intellijidea', hex: '000000' },
  'idea.exe': { slug: 'intellijidea', hex: '000000' },
  'webstorm64.exe': { slug: 'webstorm', hex: '000000' },
  'webstorm.exe': { slug: 'webstorm', hex: '000000' },
  'pycharm64.exe': { slug: 'pycharm', hex: '000000' },
  'pycharm.exe': { slug: 'pycharm', hex: '000000' },
  'goland64.exe': { slug: 'goland', hex: '000000' },
  'clion64.exe': { slug: 'clion', hex: '000000' },
  'rider64.exe': { slug: 'rider', hex: '000000' },
  'datagrip64.exe': { slug: 'datagrip', hex: '000000' },
  'chrome.exe': { slug: 'googlechrome', hex: '4285F4' },
  'msedge.exe': { slug: 'microsoftedge', hex: '0078D4' },
  'microsoftedge.exe': { slug: 'microsoftedge', hex: '0078D4' },
  'firefox.exe': { slug: 'firefox', hex: 'FF7139' },
  'brave.exe': { slug: 'brave', hex: 'FB542B' },
  'opera.exe': { slug: 'opera', hex: 'FF1B2D' },
  'slack.exe': { slug: 'slack', hex: '4A154B' },
  'discord.exe': { slug: 'discord', hex: '5865F2' },
  'teams.exe': { slug: 'microsoftteams', hex: '6264A7' },
  'zoom.exe': { slug: 'zoom', hex: '2D8CFF' },
  'devenv.exe': { slug: 'visualstudio', hex: '5C2D91' },
  'outlook.exe': { slug: 'microsoftoutlook', hex: '0078D4' },
  'winword.exe': { slug: 'microsoftword', hex: '2B579A' },
  'excel.exe': { slug: 'microsoftexcel', hex: '217346' },
  'powerpnt.exe': { slug: 'microsoftpowerpoint', hex: 'D24726' },
  'onenote.exe': { slug: 'microsoftonenote', hex: '7719AA' },
  'explorer.exe': { slug: 'windows', hex: '0078D6' },
  'windowsterminal.exe': { slug: 'windowsterminal', hex: '4D4D4D' },
  'wt.exe': { slug: 'windowsterminal', hex: '4D4D4D' },
  'powershell.exe': { slug: 'powershell', hex: '5391FE' },
  'cmd.exe': { slug: 'windows', hex: '0078D6' },
  'figma.exe': { slug: 'figma', hex: 'F24E1E' },
  'notion.exe': { slug: 'notion', hex: '000000' },
  'obsidian.exe': { slug: 'obsidian', hex: '7C3AED' },
  'acrobat.exe': { slug: 'adobeacrobatreader', hex: 'EC1C24' },
  'acrord32.exe': { slug: 'adobeacrobatreader', hex: 'EC1C24' },
  'docker desktop.exe': { slug: 'docker', hex: '2496ED' },
  'postman.exe': { slug: 'postman', hex: 'FF6C37' },
  'gitkraken.exe': { slug: 'gitkraken', hex: '179287' },
  'sublime_text.exe': { slug: 'sublimetext', hex: 'FF9800' },
  'node.exe': { slug: 'nodedotjs', hex: '339933' },
  'wechat.exe': { slug: 'wechat', hex: '07C160' },
  'weixin.exe': { slug: 'wechat', hex: '07C160' },
  'qq.exe': { slug: 'tencentqq', hex: '12B7F5' },
}

export function getBrandForApp(app: string): Brand | null {
  const key = normalizeAppKey(app)
  return DOC_TYPE_BRANDS[key] ?? BRANDS[key] ?? null
}

const BUNDLED_ICON_BY_KEY: Record<string, string> = {
  ganshale: BRAND_LOGO_APP_SRC,
  'ganshale.exe': BRAND_LOGO_APP_SRC,
  openclaw: OPENCLAW_ICON_SRC,
  'openclaw.exe': OPENCLAW_ICON_SRC,
}

function isGanshaleBundledIconKey(
  key: string,
  opts?: { appPath?: string },
): boolean {
  if (key === 'ganshale' || key === 'ganshale.exe') return true
  if (key !== 'electron' && key !== 'electron.exe') return false
  const h = (opts?.appPath ?? '').toLowerCase().replace(/\\/g, '/')
  return h.includes('ganshale')
}

/** 打包内置图标（离线可用，不依赖 Iconify CDN） */
export function bundledAppIconUrl(
  app: string,
  opts?: { appPath?: string },
): string | null {
  const key = normalizeAppKey(app)
  const direct = BUNDLED_ICON_BY_KEY[key]
  if (direct) return direct
  if (isGanshaleBundledIconKey(key, opts)) return BRAND_LOGO_APP_SRC
  return null
}

/** 有内置品牌图时不要用 exe 系统图标（安装包 exe 常为 Electron 默认图） */
export function prefersBundledIconOverNative(
  app: string,
  brandKey?: string,
  appPath?: string,
): boolean {
  const pathOpts = { appPath }
  const keys = [brandKey?.trim(), app.trim()].filter(Boolean) as string[]
  for (const k of keys) {
    if (bundledAppIconUrl(k, pathOpts)) return true
  }
  return false
}

function iconifyUrlWithBrandColor(app: string, baseUrl: string): string {
  const color = brandOrNeutralHex(app)
  const sep = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${sep}color=${encodeURIComponent(color)}`
}

/**
 * 品牌图标 SVG 地址。
 * Simple Icons 默认为单色，经 Iconify 的 `color` 参数注入 {@link brandOrNeutralHex} 品牌色。
 */
export function brandIconUrl(app: string): string | null {
  const key = normalizeAppKey(app)
  const bundled = bundledAppIconUrl(key) ?? bundledAppIconUrl(app)
  if (bundled) return bundled
  const directUrl = DIRECT_ICON_URL[key]
  if (directUrl) return directUrl
  const iconifyId = DIRECT_ICONIFY[key]
  if (iconifyId) {
    const base = `https://api.iconify.design/${iconifyId}.svg`
    return iconifyUrlWithBrandColor(app, base)
  }
  const b = getBrandForApp(app)
  if (!b) return null
  const base = `https://api.iconify.design/simple-icons:${b.slug}.svg`
  return iconifyUrlWithBrandColor(app, base)
}

/** Segment / accent color for charts (brand or neutral hash). */
export function brandOrNeutralHex(app: string): string {
  const key = normalizeAppKey(app)
  const o = CHART_HEX_OVERRIDE[key]
  if (o) return o
  const b = getBrandForApp(app)
  if (b) return `#${b.hex}`
  return colorForAppLabel(app)
}

/**
 * 时间分布、应用时长对比等图表条颜色（与 {@link timelineFromWindowEvents} 一致）。
 * 跳过白/灰/黑等品牌色，统一落到鲜艳调色板。
 */
export function chartColorForApp(app: string): string {
  const key = normalizeAppKey(app)
  const override = CHART_HEX_OVERRIDE[key]
  if (override && !isMutedChartColor(override)) return override
  const b = getBrandForApp(app)
  if (b) {
    const hex = `#${b.hex}`
    if (!isMutedChartColor(hex)) return hex
  }
  return colorForAppLabel(key || app)
}

/** 日看板图表：各应用一色，与时长对比、时间分布共用 */
export function chartColorMapForApps(appsInDisplayOrder: string[]): Map<string, string> {
  return buildDistinctChartColorMap(appsInDisplayOrder, normalizeAppKey)
}

export function chartColorFromMap(colorMap: Map<string, string>, app: string): string {
  const key = normalizeAppKey(app)
  return colorMap.get(key) ?? colorForAppLabel(key || app)
}

export function brandFallbackLetter(app: string): string {
  const key = normalizeAppKey(app)
  if (key === 'word') return 'W'
  if (key === 'excel') return 'E'
  if (key === 'ppt') return 'P'
  if (key === 'pdf') return 'D'
  if (key === 'vscode') return 'V'
  if (key === 'ganshale' || key === 'ganshale.exe') return '干'
  if (key === 'openclaw' || key === 'openclaw.exe') return 'O'
  if (key === 'chuanyun' || key === 'chuanyun-view') return '移'
  if (key === 'baidunetdisk' || key === 'baidunetdiskunite') return '百'
  if (key === 'notepad') return '记'
  const name = key.replace(/\.exe$/i, '').replace(/64$/i, '')
  return (name[0] ?? '?').toUpperCase()
}
