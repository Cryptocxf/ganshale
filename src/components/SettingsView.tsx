import { useEffect, useState } from 'react'
import {
  Activity,
  Bot,
  Database,
  FolderOpen,
  Info,
  ScrollText,
  Settings2,
  Trash2,
} from 'lucide-react'
import { AboutSettings } from './AboutSettings'
import { ModelConfigSettings } from './ModelConfigSettings'
import { PromptsSettings } from './PromptsSettings'
import { useGanshaleData } from '../context/useGanshaleData'

type SettingsSection = 'general' | 'prompts' | 'models' | 'about'

const NAV: { id: SettingsSection; label: string; icon: typeof Settings2 }[] = [
  { id: 'general', label: '基本设置', icon: Settings2 },
  { id: 'prompts', label: '提示词', icon: ScrollText },
  { id: 'models', label: '模型配置', icon: Bot },
  { id: 'about', label: '关于', icon: Info },
]

const navBtn =
  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition'
const navActive = 'bg-zinc-900 text-white shadow-sm'
const navIdle = 'text-ganshale-muted hover:bg-black/[0.04] hover:text-ganshale-text'

export function SettingsView() {
  const [section, setSection] = useState<SettingsSection>('general')
  const {
    ready,
    eventCount,
    buckets,
    heartbeatDemo,
    clearAll,
    resetDemo,
    purgeElectronShellEvents,
    windowTrackingActive,
    windowTrackingSupported,
    collectionPausedByUser,
  } = useGanshaleData()
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloadPath, setDownloadPath] = useState<string | null>(null)

  useEffect(() => {
    const desktop = window.ganshaleDesktop
    if (!desktop?.getDownloadPath) {
      setDownloadPath(null)
      return
    }
    void desktop.getDownloadPath().then((res) => {
      if (res.ok && res.path) setDownloadPath(res.path)
      else setDownloadPath(null)
    })
  }, [])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true)
    setNote(null)
    try {
      await fn()
      setNote(`${label} 已完成`)
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[min(32rem,calc(100dvh-8rem))] gap-3 lg:gap-3">
      <nav
        className="w-[7.5rem] shrink-0 border-r border-black/[0.06] pr-3 sm:w-[8rem]"
        aria-label="设置分类"
      >
        <ul className="space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const on = section === id
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSection(id)}
                  className={[navBtn, on ? navActive : navIdle].join(' ')}
                  aria-current={on ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.65} />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 space-y-6">
        {section === 'about' ? (
          <AboutSettings />
        ) : section === 'models' ? (
          <ModelConfigSettings />
        ) : section === 'prompts' ? (
          <PromptsSettings />
        ) : (
          <>
            <section className="rounded-xl border border-ganshale-border bg-ganshale-surface p-4 shadow-sm">
              <h3 className="text-sm font-medium text-ganshale-text">基本设置</h3>
              <div className="mt-3 space-y-2 text-xs">
                <p className="font-medium text-ganshale-text">下载地址</p>
                <p className="break-all font-mono text-[11px] leading-relaxed text-ganshale-muted">
                  {downloadPath ?? '请在桌面客户端中查看系统「下载」文件夹路径'}
                </p>
                <button
                  type="button"
                  disabled={!downloadPath || busy}
                  onClick={async () => {
                    const desktop = window.ganshaleDesktop
                    if (!desktop?.openPathInFolder || !downloadPath) return
                    setNote(null)
                    const res = await desktop.openPathInFolder(downloadPath)
                    if (!res.ok) setNote(res.error ?? '无法打开目录')
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-1.5 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-elevated disabled:opacity-40"
                >
                  <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.8} />
                  打开目录
                </button>
                <p className="text-[10px] leading-relaxed text-ganshale-subtle">
                  导出日报、数据备份等文件默认保存到系统「下载」文件夹。
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-ganshale-border bg-ganshale-surface p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-medium text-ganshale-text">
                <Activity className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
                能力范围
              </h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-ganshale-muted">
                <li>桶与事件本地存储（IndexedDB）</li>
                <li>
                  桌面端前台窗口采集（约 1.2s 轮询，写入 currentwindow 桶，对齐 ActivityWatch 思路）
                </li>
                <li>每日、每周、每月、每年与数据、导入导出</li>
              </ul>
            </section>

            <section className="rounded-xl border border-ganshale-border bg-ganshale-surface p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-medium text-ganshale-text">
                <Database className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
                状态
              </h3>
              <dl className="mt-3 grid gap-2 text-xs text-ganshale-muted">
                <div className="flex justify-between gap-4">
                  <dt>就绪</dt>
                  <dd className="font-mono text-ganshale-text">{ready ? '是' : '否'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>前台采集</dt>
                  <dd className="font-mono text-ganshale-text">
                    {!window.ganshaleDesktop
                      ? '仅 Electron'
                      : !windowTrackingSupported
                        ? '不可用'
                        : windowTrackingActive
                          ? '运行中'
                          : collectionPausedByUser
                            ? '已暂停'
                            : '未运行'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>桶</dt>
                  <dd className="font-mono text-ganshale-text">{buckets.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>事件</dt>
                  <dd className="font-mono text-ganshale-text">{eventCount}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-ganshale-text">操作</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !ready}
                  onClick={() => run('演示心跳', heartbeatDemo)}
                  className="rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-2 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-elevated disabled:opacity-40"
                >
                  演示心跳
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run('恢复演示', resetDemo)}
                  className="rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-2 text-xs font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page disabled:opacity-40"
                >
                  恢复演示数据
                </button>
                <button
                  type="button"
                  disabled={busy || !ready}
                  onClick={async () => {
                    setBusy(true)
                    setNote(null)
                    try {
                      const n = await purgeElectronShellEvents()
                      setNote(
                        n > 0
                          ? `已删除 ${n} 条 electron 窗口记录`
                          : '未发现 electron 窗口记录',
                      )
                    } catch (e) {
                      setNote(e instanceof Error ? e.message : String(e))
                    } finally {
                      setBusy(false)
                    }
                  }}
                  className="rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-2 text-xs font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page disabled:opacity-40"
                >
                  清理 electron 记录
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run('清空', clearAll)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  清空本地
                </button>
              </div>
              {note ? <p className="text-xs text-ganshale-muted">{note}</p> : null}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
