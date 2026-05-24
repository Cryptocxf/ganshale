import type { SkinKey } from '../lib/skins'

/** 设置页：换上该风格后的客户端界面缩略示意 */
export function SkinPreviewScene({ skin }: { skin: SkinKey }) {
  return (
    <div data-skin={skin} className={`skin-preview-scene skin-preview-scene--${skin}`}>
      <div className="skin-preview-scene__chrome">
        <div className="skin-preview-scene__nav">
          <span className="skin-preview-scene__pill" />
          <span className="skin-preview-scene__pill skin-preview-scene__pill--active" />
          <span className="skin-preview-scene__pill" />
        </div>
        <span className="skin-preview-scene__toolbar" />
      </div>
      <div className="skin-preview-scene__body">
        <div className="skin-preview-scene__row">
          <span className="skin-preview-scene__card" />
          <span className="skin-preview-scene__card" />
          <span className="skin-preview-scene__card skin-preview-scene__card--wide" />
        </div>
        <div className="skin-preview-scene__row skin-preview-scene__row--timeline">
          <span className="skin-preview-scene__bar" />
        </div>
      </div>
    </div>
  )
}
