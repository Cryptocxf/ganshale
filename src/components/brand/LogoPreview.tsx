import { useEffect, useRef, useState } from 'react'
import { copyBrickCanvas } from '../../lib/brickClipboard'

export function LogoPreview() {
  const dialog = useRef<HTMLDialogElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState('')
  const busy = useRef(false)
  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(''), 1600)
    return () => window.clearTimeout(timer)
  }, [status])
  const src = `${import.meta.env.BASE_URL}ganshale-logo-app.png`
  async function copy() {
    if (busy.current) return
    busy.current = true
    try {
      const img = image.current!
      if (!img.complete || !img.naturalWidth) await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas unavailable')
      context.drawImage(img, 0, 0)
      await copyBrickCanvas(canvas)
      setStatus('复制成功')
    } catch { setStatus('复制失败，请重试') }
    finally { busy.current = false }
  }
  return <>
    <button className="gs-drawer-logo" aria-label="查看品牌 Logo 大图" title="查看 Logo 大图" onClick={() => { setStatus(''); dialog.current?.showModal() }}><img src={src} alt="干啥了" /></button>
    <dialog ref={dialog} className="gs-logo-preview" aria-label="干啥了 Logo 大图，右键复制，左键任意处关闭" onClick={event => { if (event.button === 0) dialog.current?.close() }}>
      <div className="gs-logo-preview-body">
        <img ref={image} src={src} alt="干啥了品牌 Logo" title="右键复制图片，左键关闭" onContextMenu={event => { event.preventDefault(); void copy() }} />
      </div>
      {status && <p className="gs-logo-copy-toast" role="status">{status}</p>}
    </dialog>
  </>
}
