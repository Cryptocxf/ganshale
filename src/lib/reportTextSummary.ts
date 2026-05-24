/** 从 Markdown 日报提取单行摘要（用于周看板方块预览） */
export function reportOneLineSummary(text: string, maxLen = 56): string {
  const plain = text
    .replace(/^#+\s*/gm, '')
    .replace(/[*_~`>#-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return '暂无日报'
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen)}…`
}
