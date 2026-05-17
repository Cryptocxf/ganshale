import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** 日报等场景的 Markdown 正文（样式见 index.css `.gs-markdown`） */
export function MarkdownContent({ source }: { source: string }) {
  if (!source.trim()) return null
  return (
    <div className="gs-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  )
}
