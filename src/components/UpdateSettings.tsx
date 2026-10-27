import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'

export function UpdateSettings({ embedded = false }: { embedded?: boolean }) {
  const [state, setState] = useState({ status: 'idle', message: '从 GitHub Releases 检查新版本', version: '', percent: 0 })
  const desktop = window.ganshaleDesktop
  useEffect(() => {
    if (!desktop?.getUpdateState) return
    let active = true
    const sync = () => { void desktop.getUpdateState().then((next) => { if (active && next.status !== 'idle') setState(next) }).catch(() => {}) }
    sync()
    const timer = window.setInterval(sync, 1000)
    return () => { active = false; window.clearInterval(timer) }
  }, [desktop])
  const action = async (type: 'check' | 'download' | 'install') => {
    try {
      if (!desktop) return
      if (type === 'install') { await desktop.installUpdate(); return }
      setState((previous) => ({ ...previous, status: type === 'check' ? 'checking' : 'downloading', message: type === 'check' ? '正在检查更新…' : '准备下载更新…' }))
      setState(await (type === 'check' ? desktop.checkUpdate() : desktop.downloadUpdate()))
    } catch (error) { setState((previous) => ({ ...previous, status: 'error', message: error instanceof Error ? error.message : '检查更新失败' })) }
  }
  const busy = ['checking', 'downloading'].includes(state.status)
  return <section className={embedded ? 'space-y-2' : 'space-y-3 rounded-xl border border-ganshale-border bg-ganshale-surface p-4 shadow-sm'}>
    <h3 className="text-sm font-semibold">软件更新</h3>
    <p className="text-xs text-ganshale-muted" role="status">{desktop ? state.message : '请在桌面客户端中检查更新'}</p>
    {state.status === 'downloading' ? <div><progress className="w-full" max={100} value={state.percent} /><p className="text-xs tabular-nums">{state.percent.toFixed(1)}%</p></div> : null}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={!desktop?.checkUpdate || busy || state.status === 'downloaded'} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void action('check')}><RefreshCw className={`h-3.5 w-3.5 ${state.status === 'checking' ? 'animate-spin' : ''}`} />检查更新</button>
      {state.status === 'available' ? <button type="button" className="gs-toolbar-btn gs-toolbar-btn--accent text-xs" onClick={() => void action('download')}><Download className="h-3.5 w-3.5" />下载 v{state.version}</button> : null}
      {state.status === 'downloaded' ? <button type="button" className="gs-toolbar-btn gs-toolbar-btn--accent text-xs" onClick={() => void action('install')}>重启安装</button> : null}
    </div>
    <p className="text-xs text-ganshale-subtle">更新采用覆盖安装，保留本机工作记录。安装前请保存正在编辑的内容。</p>
    <a className="text-xs underline text-ganshale-muted" href="https://github.com/Cryptocxf/ganshale/releases" target="_blank" rel="noreferrer">查看 GitHub 版本记录</a>
  </section>
}
